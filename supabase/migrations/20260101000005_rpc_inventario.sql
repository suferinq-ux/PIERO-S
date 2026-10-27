-- =============================================================================
-- PIERO'S — Migración 5: RPC transaccionales (inventario, transferencias, producción)
-- =============================================================================
-- Operaciones críticas como funciones PostgreSQL atómicas. Validan permisos por
-- rol y sucursal internamente (aunque sean SECURITY DEFINER, no confían solo en
-- la RLS). Cada una actualiza stock + kardex + auditoría en una sola transacción.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Autoriza una escritura sobre una sucursal para ciertos roles.
create or replace function public.require_branch_role(
  p_branch_id uuid,
  p_roles public.user_role[]
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_super_admin()
     and not (public.user_has_branch_access(p_branch_id) and public.user_has_role(p_roles)) then
    raise exception 'No tienes permisos para operar esta sucursal';
  end if;
end;
$$;

-- Aplica un delta al stock (positivo=entrada, negativo=salida) con control de no-negativos.
create or replace function public.apply_stock_delta(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_delta numeric
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current numeric := 0;
begin
  select quantity into v_current
  from public.stock_levels
  where branch_id = p_branch_id and item_type = p_item_type and item_id = p_item_id
  for update;

  if not found then
    v_current := 0;
  end if;

  if v_current + p_delta < 0 then
    raise exception 'Stock insuficiente (disponible: %)', v_current;
  end if;

  insert into public.stock_levels (branch_id, item_type, item_id, quantity)
  values (p_branch_id, p_item_type, p_item_id, v_current + p_delta)
  on conflict (branch_id, item_type, item_id)
  do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

-- Registra un movimiento de kardex.
create or replace function public.insert_inventory_movement(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_movement_type public.movement_type,
  p_quantity numeric,
  p_reference_type text,
  p_reference_id uuid default null,
  p_motivo text default null,
  p_unit_cost numeric default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.inventory_movements
    (branch_id, item_type, item_id, movement_type, quantity, reference_type, reference_id, motivo, unit_cost, created_by)
  values
    (p_branch_id, p_item_type, p_item_id, p_movement_type, p_quantity, p_reference_type, p_reference_id, p_motivo, p_unit_cost, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajuste de stock y mermas
-- ---------------------------------------------------------------------------
create or replace function public.registrar_ajuste_stock(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_quantity numeric,          -- delta: positivo = entrada, negativo = salida
  p_movement_type public.movement_type,  -- 'AJUSTE' o 'MERMA'
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  if p_movement_type not in ('AJUSTE', 'MERMA') then
    raise exception 'Tipo de movimiento inválido';
  end if;
  if p_quantity = 0 then
    raise exception 'La cantidad no puede ser 0';
  end if;
  if p_movement_type = 'MERMA' and p_quantity > 0 then
    raise exception 'Las mermas siempre descuentan stock (usa cantidad negativa)';
  end if;

  perform public.apply_stock_delta(p_branch_id, p_item_type, p_item_id, p_quantity);
  perform public.insert_inventory_movement(
    p_branch_id, p_item_type, p_item_id, p_movement_type, p_quantity, 'ajuste', null, p_motivo, null
  );
  perform public.record_audit(
    'AJUSTE_STOCK', p_item_type::text, p_item_id, p_branch_id,
    jsonb_build_object('cantidad', p_quantity, 'tipo', p_movement_type::text, 'motivo', p_motivo)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Transferencias
-- ---------------------------------------------------------------------------
create or replace function public.enviar_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
  v_item record;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'SOLICITADO' then
    raise exception 'La transferencia ya fue procesada';
  end if;
  perform public.require_branch_role(v_transfer.from_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  for v_item in select * from public.transfer_items where transfer_id = p_transfer_id loop
    perform public.apply_stock_delta(v_transfer.from_branch_id, v_item.item_type, v_item.item_id, -v_item.quantity);
    perform public.insert_inventory_movement(
      v_transfer.from_branch_id, v_item.item_type, v_item.item_id, 'TRANSFERENCIA', -v_item.quantity, 'transferencia', p_transfer_id, null, null
    );
  end loop;

  update public.transfers set status = 'ENVIADO', enviado_at = now(), enviado_por = auth.uid()
  where id = p_transfer_id;

  perform public.record_audit('TRANSFERENCIA_ENVIADA', 'transferencia', p_transfer_id, v_transfer.from_branch_id);
end;
$$;

create or replace function public.recibir_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
  v_item record;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'ENVIADO' then
    raise exception 'La transferencia debe estar ENVIADA para recibirse';
  end if;
  perform public.require_branch_role(v_transfer.to_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  for v_item in select * from public.transfer_items where transfer_id = p_transfer_id loop
    perform public.apply_stock_delta(v_transfer.to_branch_id, v_item.item_type, v_item.item_id, v_item.quantity);
    perform public.insert_inventory_movement(
      v_transfer.to_branch_id, v_item.item_type, v_item.item_id, 'TRANSFERENCIA', v_item.quantity, 'transferencia', p_transfer_id, null, null
    );
    update public.transfer_items set received_quantity = quantity where id = v_item.id;
  end loop;

  update public.transfers set status = 'RECIBIDO', recibido_at = now(), recibido_por = auth.uid()
  where id = p_transfer_id;

  perform public.record_audit('TRANSFERENCIA_RECIBIDA', 'transferencia', p_transfer_id, v_transfer.to_branch_id);
end;
$$;

create or replace function public.cancelar_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'SOLICITADO' then
    raise exception 'Solo se pueden cancelar transferencias en estado SOLICITADO';
  end if;
  perform public.require_branch_role(v_transfer.from_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  update public.transfers set status = 'CANCELADO' where id = p_transfer_id;
  perform public.record_audit('TRANSFERENCIA_CANCELADA', 'transferencia', p_transfer_id, v_transfer.from_branch_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Producción
-- ---------------------------------------------------------------------------
create or replace function public.completar_produccion(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.production_orders%rowtype;
  v_recipe public.recipes%rowtype;
  v_item record;
  v_scale numeric;
begin
  select * into v_order from public.production_orders where id = p_order_id for update;
  if not found then raise exception 'Orden de producción no encontrada'; end if;
  if v_order.status not in ('PENDIENTE', 'EN_PROCESO') then
    raise exception 'La orden ya fue completada o cancelada';
  end if;
  perform public.require_branch_role(v_order.branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  select * into v_recipe from public.recipes where id = v_order.recipe_id;
  if not found then raise exception 'Receta no encontrada'; end if;
  if v_recipe.rendimiento <= 0 then raise exception 'La receta no tiene rendimiento válido'; end if;

  v_scale := v_order.quantity / v_recipe.rendimiento;

  -- Descuenta insumos según la receta escalada.
  for v_item in select * from public.recipe_items where recipe_id = v_order.recipe_id loop
    perform public.apply_stock_delta(v_order.branch_id, 'INSUMO', v_item.supply_id, -(v_item.cantidad * v_scale));
    perform public.insert_inventory_movement(
      v_order.branch_id, 'INSUMO', v_item.supply_id, 'PRODUCCION', -(v_item.cantidad * v_scale), 'produccion', p_order_id, null, null
    );
  end loop;

  -- Suma producto terminado.
  perform public.apply_stock_delta(v_order.branch_id, 'PRODUCTO', v_order.product_id, v_order.quantity);
  perform public.insert_inventory_movement(
    v_order.branch_id, 'PRODUCTO', v_order.product_id, 'PRODUCCION', v_order.quantity, 'produccion', p_order_id, null, null
  );

  update public.production_orders
  set status = 'COMPLETADA', completed_at = now(), completed_by = auth.uid()
  where id = p_order_id;

  perform public.record_audit('PRODUCCION_COMPLETADA', 'produccion', p_order_id, v_order.branch_id);
end;
$$;
