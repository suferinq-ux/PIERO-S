import { describe, expect, it } from "vitest";
import { applyMovement, isLowStock, hasEnoughStock } from "@/domain/inventory";

describe("inventory — movimientos de stock", () => {
  it("suma stock en una entrada", () => {
    expect(applyMovement(10, 5, "IN")).toEqual({ stock: 15, fulfilled: true });
  });

  it("resta stock en una salida", () => {
    expect(applyMovement(10, 4, "OUT")).toEqual({ stock: 6, fulfilled: true });
  });

  it("no permite stock negativo en una salida insuficiente", () => {
    expect(applyMovement(3, 5, "OUT")).toEqual({ stock: 3, fulfilled: false });
  });

  it("rechaza cantidades negativas", () => {
    expect(applyMovement(10, -1, "IN").fulfilled).toBe(false);
  });
});

describe("inventory — alertas y disponibilidad", () => {
  it("detecta stock bajo el mínimo", () => {
    expect(isLowStock(4, 10)).toBe(true);
    expect(isLowStock(10, 10)).toBe(false);
  });

  it("verifica stock suficiente", () => {
    expect(hasEnoughStock(10, 5)).toBe(true);
    expect(hasEnoughStock(2, 5)).toBe(false);
  });
});
