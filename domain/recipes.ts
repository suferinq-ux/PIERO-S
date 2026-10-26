/**
 * Costo de recetas y márgenes. Funciones PURAS: sin UI ni Supabase.
 */

import { roundMoney } from "./pricing";

export interface RecipeIngredient {
  quantity: number;
  unitCost: number;
}

/** Costo total de una receta: suma de cantidad × costo unitario de cada insumo. */
export function recipeCost(ingredients: RecipeIngredient[]): number {
  return roundMoney(ingredients.reduce((acc, i) => acc + i.quantity * i.unitCost, 0));
}

/** Costo unitario del producto terminado según el rendimiento de la receta. */
export function costPerUnit(totalCost: number, yieldQuantity: number): number {
  if (yieldQuantity <= 0) return 0;
  return roundMoney(totalCost / yieldQuantity);
}

/**
 * Margen de ganancia porcentual sobre el costo.
 * Devuelve null si el costo es 0 o negativo (no se puede calcular).
 */
export function marginPercentage(salePrice: number, cost: number): number | null {
  if (cost <= 0) return null;
  return roundMoney(((salePrice - cost) / cost) * 100);
}

/** Precio sugerido para alcanzar un margen objetivo sobre el costo. */
export function suggestedPrice(cost: number, targetMarginPercent: number): number {
  if (cost <= 0) return 0;
  return roundMoney(cost * (1 + targetMarginPercent / 100));
}
