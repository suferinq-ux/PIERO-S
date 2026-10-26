import { describe, expect, it } from "vitest";
import { recipeCost, costPerUnit, marginPercentage, suggestedPrice } from "@/domain/recipes";

describe("recipes — costo y márgenes", () => {
  it("calcula el costo total de una receta", () => {
    const cost = recipeCost([
      { quantity: 0.5, unitCost: 3.5 }, // harina
      { quantity: 0.4, unitCost: 18 }, // queso
      { quantity: 2, unitCost: 0.6 }, // huevos
    ]);
    // 1.75 + 7.2 + 1.2 = 10.15
    expect(cost).toBe(10.15);
  });

  it("calcula el costo unitario según rendimiento", () => {
    expect(costPerUnit(12, 12)).toBe(1);
    expect(costPerUnit(10.15, 12)).toBe(0.85);
  });

  it("devuelve 0 si el rendimiento es inválido", () => {
    expect(costPerUnit(10, 0)).toBe(0);
  });

  it("calcula el margen de ganancia", () => {
    expect(marginPercentage(1.5, 1)).toBe(50);
    expect(marginPercentage(100, 80)).toBe(25);
  });

  it("devuelve null si el costo es 0", () => {
    expect(marginPercentage(10, 0)).toBeNull();
  });

  it("sugiere precio según margen objetivo", () => {
    expect(suggestedPrice(1, 50)).toBe(1.5);
    expect(suggestedPrice(10, 20)).toBe(12);
  });
});
