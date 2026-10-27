-- =============================================================================
-- PIERO'S — Migración 7: RPC de compras (recepción de mercadería)
-- =============================================================================
-- Al recibir una orden de compra: suma stock de insumos, actualiza el costo del
-- insumo y registra el kardex, todo en una transacción.

create or replace function public.recibir_compra(p_purchase_order_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_item record;
begin
  select * into v_po from public.purchase_orders where id = p_purchase_order_id for update;
  if not found then raise exception 'Orden de compra no encontrada'; end if;
  if v_po.status <> 'EMITIDA' then
    raise exception 'La orden debe estar EMITIDA para recibirse';
  end if;
  perform public.require_branch_role(v_po.branch_id, array['ADMIN_SUCURSAL']::public.user_role[]);

  for v_item in select * from public.purchase_items where purchase_order_id = p_purchase_order_id loop
    perform public.apply_stock_delta(v_po.branch_id, 'INSUMO', v_item.supply_id, v_item.cantidad);
    perform public.insert_inventory_movement(
      v_po.branch_id, 'INSUMO', v_item.supply_id, 'COMPRA', v_item.cantidad,
      'compra', p_purchase_order_id, null, v_item.costo_unitario
    );
    -- Actualiza el costo del insumo al último costo de compra.
    update public.supplies set costo = v_item.costo_unitario where id = v_item.supply_id;
  end loop;

  update public.purchase_orders set status = 'RECIBIDA', recibida_at = now() where id = p_purchase_order_id;

  perform public.record_audit('COMPRA_RECIBIDA', 'compra', p_purchase_order_id, v_po.branch_id);
end;
$$;
