import { createClient } from "@/lib/supabase/client";
import type { Branch, Product, Recipe, RecipeItem, Supply } from "@/shared/types/entities";
import type { CreateOrderPayload, ProductionOrder, RecipeOption } from "./types";

/** Repositorio de producción. Completar una orden va por RPC transaccional. */
export const productionRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async listRecipes(): Promise<RecipeOption[]> {
    const supabase = createClient();
    const [recipesRes, itemsRes, suppliesRes, productsRes] = await Promise.all([
      supabase.from("recipes").select("*").is("deleted_at", null),
      supabase.from("recipe_items").select("*"),
      supabase.from("supplies").select("*").is("deleted_at", null),
      supabase.from("products").select("*").is("deleted_at", null),
    ]);

    const supplies = (suppliesRes.data ?? []) as Supply[];
    const products = (productsRes.data ?? []) as Product[];
    const items = (itemsRes.data ?? []) as RecipeItem[];
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return ((recipesRes.data ?? []) as Recipe[]).map((recipe) => ({
      id: recipe.id,
      nombre: recipe.nombre,
      product_id: recipe.product_id,
      variant_id: recipe.variant_id,
      product_name: productMap.get(recipe.product_id)?.nombre ?? "—",
      rendimiento: recipe.rendimiento,
      unidad_rendimiento: recipe.unidad_rendimiento,
      items: items
        .filter((i) => i.recipe_id === recipe.id)
        .map((i) => ({
          supply_id: i.supply_id,
          cantidad: i.cantidad,
          name: supplyMap.get(i.supply_id)?.nombre ?? "—",
          unit: supplyMap.get(i.supply_id)?.unidad_medida ?? "unidad",
        })),
    }));
  },

  async listOrders(): Promise<ProductionOrder[]> {
    const supabase = createClient();
    const [ordersRes, branchesRes, recipesRes, productsRes] = await Promise.all([
      supabase.from("production_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("branches").select("*"),
      supabase.from("recipes").select("*"),
      supabase.from("products").select("*"),
    ]);

    const branches = (branchesRes.data ?? []) as Branch[];
    const recipes = (recipesRes.data ?? []) as Recipe[];
    const products = (productsRes.data ?? []) as Product[];
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return ((ordersRes.data ?? []) as ProductionOrder[]).map((o) => ({
      ...o,
      branch_name: branchMap.get(o.branch_id)?.nombre ?? "—",
      recipe_name: recipeMap.get(o.recipe_id)?.nombre ?? "—",
      product_name: productMap.get(o.product_id)?.nombre ?? "—",
    }));
  },

  async create(payload: CreateOrderPayload): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("production_orders").insert({
      branch_id: payload.branch_id,
      recipe_id: payload.recipe_id,
      product_id: payload.product_id,
      variant_id: payload.variant_id,
      quantity: payload.quantity,
      notas: payload.notas,
      status: "PENDIENTE",
    });
    if (error) throw new Error(error.message);
  },

  async completar(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("completar_produccion", { p_order_id: id });
    if (error) throw new Error(error.message);
  },

  async cancelar(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("production_orders")
      .update({ status: "CANCELADA" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
