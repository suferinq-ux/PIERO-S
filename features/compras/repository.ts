import { createClient } from "@/lib/supabase/client";
import type { Branch, Supplier } from "@/shared/types/entities";
import type { SupplierValues } from "./schemas";
import type { PurchaseOrder, PurchaseOrderInput, SupplyOption } from "./types";

function toNull(s: string): string | null {
  return s.trim() === "" ? null : s.trim();
}

/** Repositorio de compras y proveedores. La recepción va por RPC atómica. */
export const purchaseRepository = {
  async listSuppliers(): Promise<Supplier[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as Supplier[];
  },

  async saveSupplier(values: SupplierValues, id?: string): Promise<void> {
    const supabase = createClient();
    const payload = {
      nombre: values.nombre.trim(),
      ruc: toNull(values.ruc),
      telefono: toNull(values.telefono),
      email: toNull(values.email),
      direccion: toNull(values.direccion),
      is_active: values.is_active,
    };
    const { error } = id
      ? await supabase.from("suppliers").update(payload).eq("id", id)
      : await supabase.from("suppliers").insert(payload);
    if (error) throw new Error(error.message);
  },

  async removeSupplier(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("suppliers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("branches").select("*").order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async listSupplies(): Promise<SupplyOption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("supplies")
      .select("*")
      .is("deleted_at", null)
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as SupplyOption[];
  },

  async listOrders(): Promise<PurchaseOrder[]> {
    const supabase = createClient();
    const [ordersRes, itemsRes, suppliersRes, branchesRes] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("purchase_items").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("branches").select("*"),
    ]);
    const supplierMap = new Map(
      ((suppliersRes.data ?? []) as Supplier[]).map((s) => [s.id, s.nombre]),
    );
    const branchMap = new Map(((branchesRes.data ?? []) as Branch[]).map((b) => [b.id, b.nombre]));
    const items = itemsRes.data ?? [];
    return ((ordersRes.data ?? []) as PurchaseOrder[]).map((o) => ({
      ...o,
      supplier_name: supplierMap.get(o.supplier_id) ?? "—",
      branch_name: branchMap.get(o.branch_id) ?? "—",
      items: items.filter((i) => i.purchase_order_id === o.id),
    }));
  },

  async listSuppliesById(): Promise<Map<string, SupplyOption>> {
    const supabase = createClient();
    const { data } = await supabase.from("supplies").select("*");
    return new Map(((data ?? []) as SupplyOption[]).map((s) => [s.id, s]));
  },

  async createOrder(payload: PurchaseOrderInput): Promise<void> {
    const supabase = createClient();
    const total = payload.items.reduce((a, i) => a + i.cantidad * i.costo_unitario, 0);
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        branch_id: payload.branch_id,
        supplier_id: payload.supplier_id,
        status: "EMITIDA",
        total,
        notas: payload.notas,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const orderId = (data as { id: string }).id;
    const { error: itemsError } = await supabase.from("purchase_items").insert(
      payload.items.map((i) => ({
        purchase_order_id: orderId,
        supply_id: i.supply_id,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  },

  async recibir(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("recibir_compra", { p_purchase_order_id: id });
    if (error) throw new Error(error.message);
  },

  async cancelar(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("purchase_orders")
      .update({ status: "CANCELADA" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
