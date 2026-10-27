export type CashMovementType = "INGRESO" | "EGRESO";

export interface CashMovement {
  id: string;
  cash_register_id: string;
  tipo: CashMovementType;
  monto: number;
  motivo: string | null;
  referencia: string | null;
  created_at: string;
}

export interface CierreResult {
  esperado: number;
  real: number;
  diferencia: number;
}
