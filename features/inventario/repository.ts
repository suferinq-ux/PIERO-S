import { createClient } from "@/lib/supabase/client";
import type { Branch, Product, Supply } from "@/shared/types/entities";
import type { InventoryMovement, InventoryRepository, ItemOption, StockLine } from "./types";

/**
 * Repositorio de inventario. Lecturas protegidas por RLS (por sucursal).
 * Los ajustes y mermas se ejecutan vía RPC transaccional `registrar_ajuste_stock`.
 */
export const inventoryRepository: InventoryRepository = {
  async listBranches() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async listStock() {
    const supabase = createClient();
    const [stockRes, suppliesRes, productsRes] = await Promise.all([
      supabase.from("stock_levels").select("*"),
      supabase.from("supplies").select("*").is("deleted_at", null),
      supabase.from("products").select("*").is("deleted_at", null),
    ]);

    const supplies = (suppliesRes.data ?? []) as Supply[];
    const products = (productsRes.data ?? []) as Product[];
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return ((stockRes.data ?? []) as Omit<StockLine, "name" | "unit" | "stock_minimo">[]).map(
      (row) => {
        const supply = row.item_type === "INSUMO" ? supplyMap.get(row.item_id) : null;
        const product = row.item_type === "PRODUCTO" ? productMap.get(row.item_id) : null;
        return {
          ...row,
          name: supply?.nombre ?? product?.nombre ?? "—",
          unit: supply?.unidad_medida ?? "unidad",
          stock_minimo: supply?.stock_minimo ?? null,
        } as StockLine;
      },
    );
  },

  async listItems() {
    const supabase = createClient();
    const [suppliesRes, productsRes] = await Promise.all([
      supabase.from("supplies").select("*").is("deleted_at", null).order("nombre"),
      supabase.from("products").select("*").is("deleted_at", null).order("nombre"),
    ]);
    const insumos: ItemOption[] = ((suppliesRes.data ?? []) as Supply[]).map((s) => ({
      id: s.id,
      item_type: "INSUMO",
      name: s.nombre,
      unit: s.unidad_medida,
    }));
    const productos: ItemOption[] = ((productsRes.data ?? []) as Product[]).map((p) => ({
      id: p.id,
      item_type: "PRODUCTO",
      name: p.nombre,
      unit: "unidad",
    }));
    return [...insumos, ...productos];
  },

  async listMovements(branchId, itemType, itemId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("branch_id", branchId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as InventoryMovement[];
  },

  async ajustarStock(payload) {
    const supabase = createClient();
    const { error } = await supabase.rpc("registrar_ajuste_stock", {
      p_branch_id: payload.branch_id,
      p_item_type: payload.item_type,
      p_item_id: payload.item_id,
      p_quantity: payload.quantity,
      p_movement_type: payload.movement_type,
      p_motivo: payload.motivo,
    });
    if (error) throw new Error(error.message);
  },
};
