/**
 * Reglas de inventario. Funciones PURAS: sin UI ni Supabase.
 */

export type MovementDirection = "IN" | "OUT";

export interface StockLine {
  itemId: string;
  quantity: number;
  direction: MovementDirection;
}

/**
 * Aplica un movimiento al stock actual y devuelve el nuevo stock.
 * Un movimiento de salida nunca deja el stock en negativo; si no alcanza,
 * devuelve el stock actual y marca el movimiento como no satisfecho.
 */
export function applyMovement(
  currentStock: number,
  quantity: number,
  direction: MovementDirection,
): { stock: number; fulfilled: boolean } {
  if (quantity < 0) return { stock: currentStock, fulfilled: false };

  if (direction === "IN") {
    return { stock: currentStock + quantity, fulfilled: true };
  }

  const available = currentStock - quantity;
  if (available < 0) {
    return { stock: currentStock, fulfilled: false };
  }
  return { stock: available, fulfilled: true };
}

/** Indica si un stock está por debajo del mínimo (alerta). */
export function isLowStock(stock: number, minimum: number): boolean {
  return stock < minimum;
}

/** Verifica si hay stock suficiente para una cantidad solicitada. */
export function hasEnoughStock(currentStock: number, requested: number): boolean {
  return requested >= 0 && currentStock >= requested;
}
