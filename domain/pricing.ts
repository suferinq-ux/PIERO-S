/**
 * Reglas de negocio de precios. Funciones PURAS: sin UI ni Supabase.
 * Los montos se manejan en soles (PEN) redondeando a 2 decimales en cada paso.
 * Para precisión contable, las RPC transaccionales usan `numeric` en PostgreSQL.
 */

export const IGV_RATE = 0.18;

/** Redondea a 2 decimales (centavos de sol). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface SaleLineInput {
  unitPrice: number;
  quantity: number;
  /** Descuento absoluto en soles aplicado a la línea (opcional). */
  discount?: number;
}

/** Subtotal de una línea: precio unitario × cantidad − descuento. */
export function lineSubtotal(line: SaleLineInput): number {
  const gross = line.unitPrice * line.quantity;
  const discount = Math.min(line.discount ?? 0, gross);
  return roundMoney(gross - discount);
}

/** Subtotal de la venta (suma de líneas). */
export function calcSubtotal(lines: SaleLineInput[]): number {
  return roundMoney(lines.reduce((acc, line) => acc + lineSubtotal(line), 0));
}

/** Aplica un descuento absoluto al subtotal, sin permitir valores negativos. */
export function applyDiscount(subtotal: number, discount: number): number {
  return roundMoney(Math.max(0, subtotal - Math.max(0, discount)));
}

/**
 * Calcula el IGV sobre una base imponible. Devuelve 0 si la base es 0 o menor.
 * El negocio puede operar sin IGV desglosado (config `igv_enabled`).
 */
export function calcIgv(base: number, rate: number = IGV_RATE): number {
  return roundMoney(Math.max(0, base) * rate);
}

/** Total de la venta: subtotal − descuento + IGV. */
export function calcTotal(
  lines: SaleLineInput[],
  options: { discount?: number; igvEnabled?: boolean; igvRate?: number } = {},
): { subtotal: number; discount: number; igv: number; total: number } {
  const subtotal = calcSubtotal(lines);
  const discount = roundMoney(Math.max(0, options.discount ?? 0));
  const base = applyDiscount(subtotal, discount);
  const igv = options.igvEnabled ? calcIgv(base, options.igvRate) : 0;
  const total = roundMoney(base + igv);
  return { subtotal, discount, igv, total };
}

/** Vuelto a devolver cuando el cliente paga en efectivo. */
export function calcChange(amountPaid: number, total: number): number {
  return roundMoney(Math.max(0, amountPaid - total));
}
