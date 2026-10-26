import { createClient } from "@/lib/supabase/client";
import type { Product, ProductVariant, Recipe, RecipeItem, Supply } from "@/shared/types/entities";
import type {
  ProductPrice,
  RecipeItemWithSupply,
  RecipeWithDetails,
  SaveRecipePayload,
} from "./types";

/** Repositorio de recetas. Escrituras protegidas por RLS (admin / producción). */
export const recipeRepository = {
  async list(): Promise<RecipeWithDetails[]> {
    const supabase = createClient();
    const [recipesRes, itemsRes, suppliesRes, productsRes] = await Promise.all([
      supabase.from("recipes").select("*").is("deleted_at", null).order("nombre"),
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
      ...recipe,
      product: productMap.get(recipe.product_id) ?? null,
      items: items
        .filter((i) => i.recipe_id === recipe.id)
        .map((i) => ({
          ...i,
          supply: supplyMap.get(i.supply_id) ?? null,
        })) as RecipeItemWithSupply[],
    }));
  },

  async listSupplies(): Promise<Supply[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("supplies")
      .select("*")
      .is("deleted_at", null)
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Supply[];
  },

  async listProductsWithVariants(): Promise<{ products: Product[]; variants: ProductVariant[] }> {
    const supabase = createClient();
    const [productsRes, variantsRes] = await Promise.all([
      supabase.from("products").select("*").is("deleted_at", null).order("nombre"),
      supabase.from("product_variants").select("*").is("deleted_at", null),
    ]);
    return {
      products: (productsRes.data ?? []) as Product[],
      variants: (variantsRes.data ?? []) as ProductVariant[],
    };
  },

  async listPrices(): Promise<ProductPrice[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("prices_by_branch")
      .select("product_id, variant_id, price");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductPrice[];
  },

  async save(payload: SaveRecipePayload): Promise<void> {
    const supabase = createClient();

    let recipeId = payload.id;
    const recipePayload = {
      product_id: payload.product_id,
      variant_id: payload.variant_id,
      nombre: payload.nombre.trim(),
      rendimiento: payload.rendimiento,
      unidad_rendimiento: payload.unidad_rendimiento.trim(),
      instrucciones: payload.instrucciones?.trim() ? payload.instrucciones.trim() : null,
    };

    if (recipeId) {
      const { error } = await supabase.from("recipes").update(recipePayload).eq("id", recipeId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("recipes")
        .insert(recipePayload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      recipeId = (data as Recipe).id;
    }

    // Reemplazar items.
    await supabase.from("recipe_items").delete().eq("recipe_id", recipeId);
    if (payload.items.length > 0) {
      const { error } = await supabase.from("recipe_items").insert(
        payload.items.map((i) => ({
          recipe_id: recipeId,
          supply_id: i.supply_id,
          cantidad: i.cantidad,
        })),
      );
      if (error) throw new Error(error.message);
    }
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("recipes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
