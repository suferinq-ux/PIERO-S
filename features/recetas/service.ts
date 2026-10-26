import { costPerUnit, marginPercentage, recipeCost } from "@/domain/recipes";

export interface RecipeEconomics {
  totalCost: number;
  unitCost: number;
  margin: number | null;
}

/**
 * Caso de uso: economía de una receta (costo total, costo unitario y margen
 * frente a un precio de venta). Compone funciones puras del dominio.
 */
export function computeRecipeEconomics(
  items: { cantidad: number; costo: number }[],
  rendimiento: number,
  salePrice: number | null,
): RecipeEconomics {
  const totalCost = recipeCost(items.map((i) => ({ quantity: i.cantidad, unitCost: i.costo })));
  const unitCost = costPerUnit(totalCost, rendimiento);
  const margin = salePrice != null ? marginPercentage(salePrice, unitCost) : null;
  return { totalCost, unitCost, margin };
}
