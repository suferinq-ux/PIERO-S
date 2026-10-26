import { describe, expect, it } from "vitest";
import { canTransition, isTerminal, pendingBalance } from "@/domain/orders";

describe("orders — máquina de estados", () => {
  it("permite transiciones válidas", () => {
    expect(canTransition("PENDIENTE", "EN_PRODUCCION")).toBe(true);
    expect(canTransition("EN_PRODUCCION", "LISTO")).toBe(true);
    expect(canTransition("LISTO", "ENTREGADO")).toBe(true);
  });

  it("rechaza transiciones inválidas", () => {
    expect(canTransition("PENDIENTE", "ENTREGADO")).toBe(false);
    expect(canTransition("LISTO", "PENDIENTE")).toBe(false);
    expect(canTransition("CANCELADO", "LISTO")).toBe(false);
  });

  it("permite cancelar desde estados intermedios", () => {
    expect(canTransition("PENDIENTE", "CANCELADO")).toBe(true);
    expect(canTransition("LISTO", "CANCELADO")).toBe(true);
  });

  it("marca estados terminales", () => {
    expect(isTerminal("ENTREGADO")).toBe(true);
    expect(isTerminal("CANCELADO")).toBe(true);
    expect(isTerminal("LISTO")).toBe(false);
  });

  it("calcula el saldo pendiente", () => {
    expect(pendingBalance(100, 30)).toBe(70);
    expect(pendingBalance(50, 60)).toBe(0);
  });
});
