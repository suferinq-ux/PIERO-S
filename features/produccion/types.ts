export type ProductionStatus = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";

export interface RecipeIngredient {
  supply_id: string;
  cantidad: number;
  name: string;
  unit: string;
}

export interface RecipeOption {
  id: string;
  nombre: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  rendimiento: number;
  unidad_rendimiento: string;
  items: RecipeIngredient[];
}

export interface ProductionOrder {
  id: string;
  branch_id: string;
  recipe_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: ProductionStatus;
  notas: string | null;
  created_at: string;
  completed_at: string | null;
  branch_name: string;
  recipe_name: string;
  product_name: string;
}

export interface CreateOrderPayload {
  branch_id: string;
  recipe_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  notas: string | null;
}
