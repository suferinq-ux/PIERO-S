export type OrderStatus = "PENDIENTE" | "EN_PRODUCCION" | "LISTO" | "ENTREGADO" | "CANCELADO";

export interface CustomOrder {
  id: string;
  branch_id: string;
  customer_id: string;
  product_id: string;
  fecha_entrega: string;
  hora_entrega: string | null;
  mensaje: string | null;
  sabor: string | null;
  relleno: string | null;
  tamano: string | null;
  cantidad: number;
  total: number;
  anticipo: number;
  saldo: number;
  status: OrderStatus;
  notas: string | null;
  created_at: string;
  customer_name: string;
  product_name: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
}

export interface OrderOption {
  id: string;
  nombre: string;
}

/** Siguiente estado en el flujo de producción/entrega. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDIENTE: "EN_PRODUCCION",
  EN_PRODUCCION: "LISTO",
  LISTO: "ENTREGADO",
  ENTREGADO: null,
  CANCELADO: null,
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PRODUCCION: "En producción",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};
