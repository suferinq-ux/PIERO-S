import { createClient } from "@/lib/supabase/client";
import { endOfDay, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Branch, Recipe, RecipeItem, Supply, UserProfile } from "@/shared/types/entities";

interface RawSale {
  id: string;
  branch_id: string;
  cashier_id: string | null;
  total: number;
  created_at: string;
}
interface RawSaleItem {
  sale_id: string;
  product_id: string;
  cantidad: number;
  subtotal: number;
}
interface RawProduct {
  id: string;
  nombre: string;
}
interface RawStock {
  branch_id: string;
  item_type: string;
  item_id: string;
  quantity: number;
}

export interface ReportData {
  ventasTotal: number;
  transacciones: number;
  ticketPromedio: number;
  utilidadEstimada: number;
  porDia: { label: string; total: number }[];
  porProducto: { name: string; cantidad: number; total: number }[];
  porCajero: { name: string; total: number; count: number }[];
  porSucursal: { name: string; total: number }[];
  inventario: { name: string; quantity: number; unit: string; cost: number; value: number }[];
  inventarioTotal: number;
}

/** Repositorio de reportes: agrega ventas, utilidad estimada e inventario. */
export const reportRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("branches").select("*").order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async get(filters: { branchId: string; from: string; to: string }): Promise<ReportData> {
    const supabase = createClient();
    const desde = startOfDay(new Date(filters.from)).toISOString();
    const hasta = endOfDay(new Date(filters.to)).toISOString();

    let salesQuery = supabase
      .from("sales")
      .select("*")
      .eq("status", "COMPLETADA")
      .gte("created_at", desde)
      .lte("created_at", hasta);
    if (filters.branchId) salesQuery = salesQuery.eq("branch_id", filters.branchId);

    const [
      salesRes,
      productsRes,
      profilesRes,
      branchesRes,
      recipesRes,
      recipeItemsRes,
      suppliesRes,
      stockRes,
    ] = await Promise.all([
      salesQuery,
      supabase.from("products").select("id, nombre").is("deleted_at", null),
      supabase.from("users_profiles").select("id, full_name, email"),
      supabase.from("branches").select("*"),
      supabase.from("recipes").select("*").is("deleted_at", null),
      supabase.from("recipe_items").select("*"),
      supabase.from("supplies").select("*").is("deleted_at", null),
      supabase.from("stock_levels").select("*"),
    ]);

    const sales = (salesRes.data ?? []) as RawSale[];
    const products = (productsRes.data ?? []) as RawProduct[];
    const profiles = (profilesRes.data ?? []) as UserProfile[];
    const branches = (branchesRes.data ?? []) as Branch[];
    const recipes = (recipesRes.data ?? []) as Recipe[];
    const recipeItems = (recipeItemsRes.data ?? []) as RecipeItem[];
    const supplies = (suppliesRes.data ?? []) as Supply[];
    const stock = (stockRes.data ?? []) as RawStock[];

    let items: RawSaleItem[] = [];
    if (sales.length > 0) {
      const { data } = await supabase
        .from("sale_items")
        .select("*")
        .in(
          "sale_id",
          sales.map((s) => s.id),
        );
      items = (data ?? []) as RawSaleItem[];
    }

    const productName = new Map(products.map((p) => [p.id, p.nombre]));
    const profileName = new Map(profiles.map((p) => [p.id, p.full_name ?? p.email ?? "—"]));
    const branchName = new Map(branches.map((b) => [b.id, b.nombre]));
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));

    // Costo unitario estimado por producto (receta).
    const costByProduct = new Map<string, number>();
    for (const recipe of recipes) {
      if (!recipe.rendimiento || recipe.rendimiento <= 0) continue;
      const cost = recipeItems
        .filter((i) => i.recipe_id === recipe.id)
        .reduce((a, i) => a + i.cantidad * (supplyMap.get(i.supply_id)?.costo ?? 0), 0);
      const unit = cost / recipe.rendimiento;
      const current = costByProduct.get(recipe.product_id);
      if (current === undefined || unit < current) costByProduct.set(recipe.product_id, unit);
    }

    // Agregados de ventas
    const ventasTotal = sales.reduce((a, s) => a + Number(s.total), 0);

    const porProductoMap = new Map<string, { cantidad: number; total: number }>();
    for (const it of items) {
      const name = productName.get(it.product_id) ?? "—";
      const agg = porProductoMap.get(name) ?? { cantidad: 0, total: 0 };
      agg.cantidad += Number(it.cantidad);
      agg.total += Number(it.subtotal);
      porProductoMap.set(name, agg);
    }

    const porCajeroMap = new Map<string, { total: number; count: number }>();
    for (const s of sales) {
      const name = profileName.get(s.cashier_id ?? "") ?? "—";
      const agg = porCajeroMap.get(name) ?? { total: 0, count: 0 };
      agg.total += Number(s.total);
      agg.count += 1;
      porCajeroMap.set(name, agg);
    }

    const porSucursalMap = new Map<string, number>();
    for (const s of sales) {
      porSucursalMap.set(s.branch_id, (porSucursalMap.get(s.branch_id) ?? 0) + Number(s.total));
    }

    const porDiaMap = new Map<string, number>();
    for (const s of sales) {
      const key = format(new Date(s.created_at), "yyyy-MM-dd");
      porDiaMap.set(key, (porDiaMap.get(key) ?? 0) + Number(s.total));
    }
    const porDia = Array.from(porDiaMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        label: format(new Date(date), "dd/MM", { locale: es }),
        total,
      }));

    const cogs = items.reduce(
      (a, it) => a + (costByProduct.get(it.product_id) ?? 0) * Number(it.cantidad),
      0,
    );

    // Inventario valorizado (insumos por costo; productos por costo de receta).
    const inventario: ReportData["inventario"] = [];
    for (const st of stock) {
      if (filters.branchId && st.branch_id !== filters.branchId) continue;
      const supply = supplyMap.get(st.item_id);
      if (st.item_type === "INSUMO" && supply) {
        inventario.push({
          name: supply.nombre,
          quantity: Number(st.quantity),
          unit: supply.unidad_medida,
          cost: Number(supply.costo),
          value: Number(st.quantity) * Number(supply.costo),
        });
      } else if (st.item_type === "PRODUCTO") {
        const unit = costByProduct.get(st.item_id) ?? 0;
        inventario.push({
          name: productName.get(st.item_id) ?? "—",
          quantity: Number(st.quantity),
          unit: "unidad",
          cost: unit,
          value: Number(st.quantity) * unit,
        });
      }
    }

    return {
      ventasTotal,
      transacciones: sales.length,
      ticketPromedio: sales.length ? ventasTotal / sales.length : 0,
      utilidadEstimada: ventasTotal - cogs,
      porDia,
      porProducto: Array.from(porProductoMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.total - a.total),
      porCajero: Array.from(porCajeroMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.total - a.total),
      porSucursal: Array.from(porSucursalMap.entries())
        .map(([id, total]) => ({ name: branchName.get(id) ?? "—", total }))
        .sort((a, b) => b.total - a.total),
      inventario: inventario.sort((a, b) => b.value - a.value),
      inventarioTotal: inventario.reduce((a, i) => a + i.value, 0),
    };
  },
};
