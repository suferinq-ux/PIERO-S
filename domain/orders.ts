/**
 * Máquina de estados de pedidos por encargo. Funciones PURAS.
 */

export const ORDER_STATUS = [
  "PENDIENTE",
  "EN_PRODUCCION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO",
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

/** Transiciones válidas de estado. CANCELADO es terminal. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE: ["EN_PRODUCCION", "CANCELADO"],
  EN_PRODUCCION: ["LISTO", "CANCELADO"],
  LISTO: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

/** Indica si es válido pasar de `from` a `to`. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Estados terminales (no admiten más cambios). */
export function isTerminal(status: OrderStatus): boolean {
  return status === "ENTREGADO" || status === "CANCELADO";
}

/** Calcula el saldo pendiente de un pedido con anticipo. */
export function pendingBalance(total: number, advance: number): number {
  return Math.max(0, total - advance);
}
