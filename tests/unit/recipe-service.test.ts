import { describe, expect, it } from "vitest";
import { computeRecipeEconomics } from "@/features/recetas/service";

describe("recetas — economía de la receta", () => {
  const items = [
    { cantidad: 0.5, costo: 3.5 },
    { cantidad: 0.4, costo: 18 },
    { cantidad: 2, costo: 0.6 },
  ];

  it("calcula costo total, costo unitario y margen", () => {
    const eco = computeRecipeEconomics(items, 12, 1.5);
    // total 10.15, unit 0.85, margen vs 1.5 = 76.47%
    expect(eco.totalCost).toBe(10.15);
    expect(eco.unitCost).toBe(0.85);
    expect(eco.margin).toBe(76.47);
  });

  it("devuelve margen null si no hay precio de venta", () => {
    const eco = computeRecipeEconomics(items, 12, null);
    expect(eco.margin).toBeNull();
  });

  it("con rendimiento 0 el costo unitario es 0", () => {
    const eco = computeRecipeEconomics(items, 0, 1.5);
    expect(eco.unitCost).toBe(0);
    expect(eco.margin).toBeNull();
  });
});
