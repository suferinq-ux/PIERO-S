-- =============================================================================
-- PIERO'S — Migración 6: RPC de ventas y caja
-- =============================================================================
-- `registrar_venta` es la operación crítica del POS: crea la venta, resuelve
-- precios desde la BD, descuenta stock, registra pagos y actualiza la caja en
-- una sola transacción. La anulación revierte stock y efectivo.

-- ---------------------------------------------------------------------------
-- Registrar venta
-- ---------------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_branch_id uuid,
  p_items jsonb,        -- [{product_id, variant_id, cantidad}]
  p_payments jsonb,     -- [{method, amount, referencia}]
  p_descuento numeric default 0,
  p_tipo_consumo public.consumption_type default 'LOCAL',
  p_customer_id uuid default null,
  p_notas text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_numero int;
  v_serie text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item record;
  v_pay record;
  v_price numeric;
  v_line numeric;
  v_payments_sum numeric := 0;
  v_register_id uuid;
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select serie_boleta into v_serie from public.branches where id = p_branch_id;
  select coalesce(max(numero), 0) + 1 into v_numero from public.sales where branch_id = p_branch_id;

  -- Subtotal desde precios configurados en BD (no se confía en el cliente).
  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, cantidad numeric) loop
    if v_item.cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select price into v_price
    from public.prices_by_branch
    where product_id = v_item.product_id
      and branch_id = p_branch_id
      and variant_id is not distinct from v_item.variant_id
    limit 1;

    if v_price is null then
      raise exception 'No hay precio configurado para el producto en esta sucursal';
    end if;

    v_line := v_price * v_item.cantidad;
    v_subtotal := v_subtotal + v_line;

    insert into public.sale_items (sale_id, product_id, variant_id, cantidad, precio_unitario, subtotal)
    values (v_sale_id, v_item.product_id, v_item.variant_id, v_item.cantidad, v_price, v_line);
  end loop;

  if p_descuento < 0 or p_descuento > v_subtotal then
    raise exception 'Descuento inválido';
  end if;
  v_total := v_subtotal - p_descuento;

  -- Validar que los pagos cubran exactamente el total.
  for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
    if v_pay.amount <= 0 then
      raise exception 'Monto de pago inválido';
    end if;
    v_payments_sum := v_payments_sum + v_pay.amount;
  end loop;

  if abs(v_payments_sum - v_total) > 0.01 then
    raise exception 'El total pagado no coincide con el total de la venta';
  end if;

  insert into public.sales
    (id, branch_id, serie, numero, customer_id, cashier_id, subtotal, descuento, igv, total, tipo_consumo, notas, status)
  values
    (v_sale_id, p_branch_id, v_serie, v_numero, p_customer_id, auth.uid(), v_subtotal, p_descuento, 0, v_total, p_tipo_consumo, p_notas, 'COMPLETADA');

  for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
    insert into public.payments (sale_id, method, amount, referencia)
    values (v_sale_id, v_pay.method, v_pay.amount, v_pay.referencia);
  end loop;

  -- Descuento de stock (producto terminado).
  for v_item in select product_id, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, cantidad numeric)
    group by product_id loop
    perform public.apply_stock_delta(p_branch_id, 'PRODUCTO', v_item.product_id, -v_item.cantidad);
    perform public.insert_inventory_movement(
      p_branch_id, 'PRODUCTO', v_item.product_id, 'VENTA', -v_item.cantidad, 'venta', v_sale_id, null, null
    );
  end loop;

  -- Caja: registrar ingresos en efectivo (los medios digitales no entran al cajón).
  select id into v_register_id from public.cash_registers
  where branch_id = p_branch_id and status = 'ABIERTA' limit 1;

  if v_register_id is not null then
    for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
      if v_pay.method = 'EFECTIVO' then
        insert into public.cash_movements (cash_register_id, tipo, monto, motivo, referencia, sale_id, created_by)
        values (v_register_id, 'INGRESO', v_pay.amount, 'Venta', v_serie || '-' || v_numero::text, v_sale_id, auth.uid());
      end if;
    end loop;
  end if;

  perform public.record_audit('VENTA_REGISTRADA', 'venta', v_sale_id, p_branch_id,
    jsonb_build_object('total', v_total, 'numero', v_numero));

  return jsonb_build_object(
    'id', v_sale_id, 'numero', v_numero, 'serie', v_serie,
    'subtotal', v_subtotal, 'descuento', p_descuento, 'total', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Anular venta (requiere ADMIN_SUCURSAL)
-- ---------------------------------------------------------------------------
create or replace function public.anular_venta(p_sale_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_register_id uuid;
  v_efectivo numeric := 0;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status <> 'COMPLETADA' then raise exception 'La venta ya fue anulada'; end if;
  perform public.require_branch_role(v_sale.branch_id, array['ADMIN_SUCURSAL']::public.user_role[]);

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    perform public.apply_stock_delta(v_sale.branch_id, 'PRODUCTO', v_item.product_id, v_item.cantidad);
    perform public.insert_inventory_movement(
      v_sale.branch_id, 'PRODUCTO', v_item.product_id, 'AJUSTE', v_item.cantidad, 'venta', p_sale_id, 'Anulación de venta', null
    );
  end loop;

  select id into v_register_id from public.cash_registers
  where branch_id = v_sale.branch_id and status = 'ABIERTA' limit 1;

  if v_register_id is not null then
    select coalesce(sum(amount), 0) into v_efectivo from public.payments where sale_id = p_sale_id and method = 'EFECTIVO';
    if v_efectivo > 0 then
      insert into public.cash_movements (cash_register_id, tipo, monto, motivo, referencia, sale_id, created_by)
      values (v_register_id, 'EGRESO', v_efectivo, 'Anulación de venta', v_sale.serie || '-' || v_sale.numero::text, p_sale_id, auth.uid());
    end if;
  end if;

  update public.sales set status = 'ANULADA', updated_at = now() where id = p_sale_id;
  perform public.record_audit('VENTA_ANULADA', 'venta', p_sale_id, v_sale.branch_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Caja: apertura, cierre y movimientos manuales
-- ---------------------------------------------------------------------------
create or replace function public.abrir_caja(p_branch_id uuid, p_monto_inicial numeric default 0)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_existing uuid;
  v_id uuid := gen_random_uuid();
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select id into v_existing from public.cash_registers where branch_id = p_branch_id and status = 'ABIERTA' limit 1;
  if v_existing is not null then raise exception 'Ya existe una caja abierta para esta sucursal'; end if;

  insert into public.cash_registers (id, branch_id, abierto_por, monto_inicial, abierto_at, status)
  values (v_id, p_branch_id, auth.uid(), p_monto_inicial, now(), 'ABIERTA');

  perform public.record_audit('CAJA_ABIERTA', 'caja', v_id, p_branch_id, jsonb_build_object('monto_inicial', p_monto_inicial));
  return v_id;
end;
$$;

create or replace function public.cerrar_caja(
  p_cash_register_id uuid,
  p_monto_real numeric,
  p_justificacion text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_reg public.cash_registers%rowtype;
  v_ingresos numeric;
  v_egresos numeric;
  v_esperado numeric;
  v_diferencia numeric;
begin
  select * into v_reg from public.cash_registers where id = p_cash_register_id for update;
  if not found then raise exception 'Caja no encontrada'; end if;
  if v_reg.status <> 'ABIERTA' then raise exception 'La caja ya está cerrada'; end if;
  perform public.require_branch_role(v_reg.branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select coalesce(sum(monto), 0) into v_ingresos from public.cash_movements where cash_register_id = p_cash_register_id and tipo = 'INGRESO';
  select coalesce(sum(monto), 0) into v_egresos from public.cash_movements where cash_register_id = p_cash_register_id and tipo = 'EGRESO';
  v_esperado := v_reg.monto_inicial + v_ingresos - v_egresos;
  v_diferencia := p_monto_real - v_esperado;

  update public.cash_registers
  set status = 'CERRADA', cerrado_por = auth.uid(), cerrado_at = now(),
      monto_esperado = v_esperado, monto_real = p_monto_real, diferencia = v_diferencia, justificacion = p_justificacion
  where id = p_cash_register_id;

  perform public.record_audit('CAJA_CERRADA', 'caja', p_cash_register_id, v_reg.branch_id,
    jsonb_build_object('esperado', v_esperado, 'real', p_monto_real, 'diferencia', v_diferencia));

  return jsonb_build_object('esperado', v_esperado, 'real', p_monto_real, 'diferencia', v_diferencia);
end;
$$;

create or replace function public.registrar_movimiento_caja(
  p_cash_register_id uuid,
  p_tipo public.cash_movement_type,
  p_monto numeric,
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_reg public.cash_registers%rowtype;
begin
  select * into v_reg from public.cash_registers where id = p_cash_register_id for update;
  if not found then raise exception 'Caja no encontrada'; end if;
  if v_reg.status <> 'ABIERTA' then raise exception 'La caja está cerrada'; end if;
  perform public.require_branch_role(v_reg.branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  if p_monto <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;

  insert into public.cash_movements (cash_register_id, tipo, monto, motivo, created_by)
  values (p_cash_register_id, p_tipo, p_monto, p_motivo, auth.uid());

  perform public.record_audit('CAJA_MOVIMIENTO', 'caja', p_cash_register_id, v_reg.branch_id,
    jsonb_build_object('tipo', p_tipo::text, 'monto', p_monto, 'motivo', p_motivo));
end;
$$;
