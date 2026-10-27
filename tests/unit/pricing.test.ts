import { describe, expect, it } from "vitest";
import {
  calcSubtotal,
  calcTotal,
  calcIgv,
  calcChange,
  lineSubtotal,
  applyDiscount,
  roundMoney,
} from "@/domain/pricing";

describe("pricing — subtotales y totales", () => {
  it("calcula el subtotal de una línea", () => {
    expect(lineSubtotal({ unitPrice: 1.5, quantity: 4 })).toBe(6);
  });

  it("aplica descuento por línea sin volverla negativa", () => {
    expect(lineSubtotal({ unitPrice: 10, quantity: 1, discount: 3 })).toBe(7);
    expect(lineSubtotal({ unitPrice: 10, quantity: 1, discount: 999 })).toBe(0);
  });

  it("calcula el subtotal total de varias líneas", () => {
    const subtotal = calcSubtotal([
      { unitPrice: 1.5, quantity: 2 },
      { unitPrice: 55, quantity: 1 },
    ]);
    expect(subtotal).toBe(58);
  });

  it("redondea a 2 decimales correctamente", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it("aplica un descuento global al subtotal", () => {
    expect(applyDiscount(100, 15)).toBe(85);
    expect(applyDiscount(10, 50)).toBe(0);
  });
});

describe("pricing — IGV", () => {
  it("calcula el IGV al 18%", () => {
    expect(calcIgv(100)).toBe(18);
  });

  it("calcula el IGV con tasa personalizada", () => {
    expect(calcIgv(100, 0.1)).toBe(10);
  });

  it("no genera IGV si está deshabilitado", () => {
    const { igv, total } = calcTotal([{ unitPrice: 100, quantity: 1 }], {
      igvEnabled: false,
    });
    expect(igv).toBe(0);
    expect(total).toBe(100);
  });

  it("genera IGV y lo suma al total si está habilitado", () => {
    const { subtotal, igv, total } = calcTotal([{ unitPrice: 100, quantity: 1 }], {
      igvEnabled: true,
      igvRate: 0.18,
    });
    expect(subtotal).toBe(100);
    expect(igv).toBe(18);
    expect(total).toBe(118);
  });

  it("combina descuento e IGV: base = subtotal − descuento", () => {
    const { total } = calcTotal([{ unitPrice: 100, quantity: 1 }], {
      discount: 10,
      igvEnabled: true,
      igvRate: 0.18,
    });
    // base 90 + IGV 16.2 = 106.2
    expect(total).toBe(106.2);
  });
});

describe("pricing — vuelto", () => {
  it("calcula el vuelto correctamente", () => {
    expect(calcChange(50, 37.5)).toBe(12.5);
  });

  it("no devuelve vuelto negativo si el pago es insuficiente", () => {
    expect(calcChange(10, 20)).toBe(0);
  });
});
