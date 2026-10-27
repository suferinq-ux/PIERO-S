import type { ItemType } from "@/features/inventario/types";

export type TransferStatus = "SOLICITADO" | "ENVIADO" | "RECIBIDO" | "CANCELADO";

export interface TransferItem {
  id: string;
  transfer_id: string;
  item_type: ItemType;
  item_id: string;
  quantity: number;
  received_quantity: number;
  name: string;
  unit: string;
}

export interface Transfer {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  status: TransferStatus;
  notas: string | null;
  created_at: string;
  from_branch_name: string;
  to_branch_name: string;
  items: TransferItem[];
}

export interface TransferItemInput {
  item_type: ItemType;
  item_id: string;
  quantity: number;
}

export interface CreateTransferPayload {
  from_branch_id: string;
  to_branch_id: string;
  notas: string | null;
  items: TransferItemInput[];
}
