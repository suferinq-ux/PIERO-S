export type PurchaseStatus = "BORRADOR" | "EMITIDA" | "RECIBIDA" | "CANCELADA";

export interface PurchaseItem {
  id: string;
  purchase_order_id: string;
  supply_id: string;
  cantidad: number;
  costo_unitario: number;
  name: string;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string;
  supplier_id: string;
  status: PurchaseStatus;
  total: number;
  notas: string | null;
  created_at: string;
  recibida_at: string | null;
  supplier_name: string;
  branch_name: string;
  items: PurchaseItem[];
}

export interface SupplyOption {
  id: string;
  nombre: string;
  unidad_medida: string;
  costo: number;
}

export interface PurchaseOrderInput {
  branch_id: string;
  supplier_id: string;
  notas: string | null;
  items: { supply_id: string; cantidad: number; costo_unitario: number }[];
}
