import type { Product, Supply } from "@/shared/types/entities";

export interface RecipeItemWithSupply {
  id: string;
  recipe_id: string;
  supply_id: string;
  cantidad: number;
  supply: Supply | null;
}

export interface RecipeWithDetails {
  id: string;
  product_id: string;
  variant_id: string | null;
  nombre: string;
  rendimiento: number;
  unidad_rendimiento: string;
  instrucciones: string | null;
  is_active: boolean;
  product: Product | null;
  items: RecipeItemWithSupply[];
}

export interface RecipeItemInput {
  supply_id: string;
  cantidad: number;
}

export interface SaveRecipePayload {
  id?: string;
  product_id: string;
  variant_id: string | null;
  nombre: string;
  rendimiento: number;
  unidad_rendimiento: string;
  instrucciones: string | null;
  items: RecipeItemInput[];
}

export interface ProductPrice {
  product_id: string;
  variant_id: string | null;
  price: number;
}
