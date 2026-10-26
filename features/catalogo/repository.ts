import { createClient } from "@/lib/supabase/client";
import type { Branch, Category, Product, ProductVariant } from "@/shared/types/entities";
import type { CatalogRepository, ProductPrice, ProductWithDetails } from "./types";

function toNull(s: string): string | null {
  return s.trim() === "" ? null : s.trim();
}

/**
 * Repositorio del catálogo (adapter sobre Supabase). Lecturas para cualquier
 * autenticado; escrituras protegidas por RLS (SUPER_ADMIN / ADMIN_SUCURSAL).
 */
export const catalogRepository: CatalogRepository = {
  async listCategories() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Category[];
  },

  async saveCategory(values, id) {
    const supabase = createClient();
    const payload = {
      nombre: values.nombre.trim(),
      descripcion: toNull(values.descripcion),
      is_active: values.is_active,
    };
    const { error } = id
      ? await supabase.from("categories").update(payload).eq("id", id)
      : await supabase.from("categories").insert(payload);
    if (error) throw new Error(error.message);
  },

  async removeCategory(id) {
    const supabase = createClient();
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listBranches() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async listProducts() {
    const supabase = createClient();
    const [productsRes, categoriesRes, variantsRes, pricesRes] = await Promise.all([
      supabase.from("products").select("*").is("deleted_at", null).order("nombre"),
      supabase.from("categories").select("*").is("deleted_at", null),
      supabase.from("product_variants").select("*").is("deleted_at", null),
      supabase.from("prices_by_branch").select("*"),
    ]);

    const categories = (categoriesRes.data ?? []) as Category[];
    const variants = (variantsRes.data ?? []) as ProductVariant[];
    const prices = (pricesRes.data ?? []) as ProductPrice[];

    const catMap = new Map(categories.map((c) => [c.id, c]));

    return ((productsRes.data ?? []) as Product[]).map((product) => ({
      ...product,
      category: catMap.get(product.category_id) ?? null,
      variants: variants.filter((v) => v.product_id === product.id),
      prices: prices.filter((p) => p.product_id === product.id),
    })) as ProductWithDetails[];
  },

  async saveProduct(payload) {
    const supabase = createClient();
    const { product, variants, prices } = payload;

    // 1. Upsert del producto
    let productId = product.id;
    const productPayload = {
      category_id: product.category_id,
      nombre: product.nombre.trim(),
      descripcion: toNull(product.descripcion ?? ""),
      image_url: toNull(product.image_url ?? ""),
      barcode: toNull(product.barcode ?? ""),
      has_variants: product.has_variants,
      is_active: product.is_active,
    };

    if (productId) {
      const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      productId = (data as Product).id;
    }

    // 2. Variantes: actualizar existentes, insertar nuevas, eliminar las quitadas.
    const existingRes = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .is("deleted_at", null);
    const existingIds = new Set(((existingRes.data ?? []) as { id: string }[]).map((v) => v.id));

    const keptIds = new Set<string>();
    const serverIdByLocalId = new Map<string, string>();

    for (const variant of variants) {
      if (variant.id) {
        keptIds.add(variant.id);
        serverIdByLocalId.set(variant.localId, variant.id);
        const { error } = await supabase
          .from("product_variants")
          .update({ nombre: variant.nombre.trim(), sku: toNull(variant.sku ?? "") })
          .eq("id", variant.id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from("product_variants")
          .insert({
            product_id: productId,
            nombre: variant.nombre.trim(),
            sku: toNull(variant.sku ?? ""),
            is_active: true,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        serverIdByLocalId.set(variant.localId, (data as ProductVariant).id);
      }
    }

    // Eliminar variantes que ya no están en la lista.
    for (const id of existingIds) {
      if (!keptIds.has(id)) {
        await supabase
          .from("product_variants")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);
      }
    }

    // 3. Precios: insertar o actualizar por id (resolviendo variantes nuevas).
    for (const price of prices) {
      const pricePayload = {
        product_id: productId,
        variant_id: price.variantLocalId
          ? (serverIdByLocalId.get(price.variantLocalId) ?? null)
          : null,
        branch_id: price.branch_id,
        price: Number(price.price) || 0,
        is_active: true,
      };
      if (price.id) {
        const { error } = await supabase
          .from("prices_by_branch")
          .update(pricePayload)
          .eq("id", price.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("prices_by_branch").insert(pricePayload);
        if (error) throw new Error(error.message);
      }
    }

    return productId;
  },

  async removeProduct(id) {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
