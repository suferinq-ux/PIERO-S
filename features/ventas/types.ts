export type PaymentMethod = "EFECTIVO" | "YAPE" | "PLIN" | "TARJETA";

export type ConsumptionType = "LOCAL" | "PARA_LLEVAR";

export interface CartItem {
  key: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  price: number;
  quantity: number;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  referencia: string | null;
}

export interface SaleResult {
  id: string;
  numero: number;
  serie: string;
  subtotal: number;
  descuento: number;
  total: number;
}

export interface Sale {
  id: string;
  branch_id: string;
  serie: string | null;
  numero: number | null;
  subtotal: number;
  descuento: number;
  total: number;
  tipo_consumo: ConsumptionType;
  status: "COMPLETADA" | "ANULADA";
  created_at: string;
}

export interface CashRegister {
  id: string;
  branch_id: string;
  status: "ABIERTA" | "CERRADA";
  monto_inicial: number;
  abierto_at: string;
  cerrado_at: string | null;
  monto_esperado: number | null;
  monto_real: number | null;
  diferencia: number | null;
  justificacion: string | null;
}
