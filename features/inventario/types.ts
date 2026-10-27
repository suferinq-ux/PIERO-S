import type { Branch } from "@/shared/types/entities";

export type ItemType = "INSUMO" | "PRODUCTO";

export interface StockLine {
  id: string;
  branch_id: string;
  item_type: ItemType;
  item_id: string;
  quantity: number;
  updated_at: string;
  name: string;
  unit: string;
  stock_minimo: number | null;
}

export interface InventoryMovement {
  id: string;
  branch_id: string;
  item_type: ItemType;
  item_id: string;
  movement_type: string;
  quantity: number;
  motivo: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AjustePayload {
  branch_id: string;
  item_type: ItemType;
  item_id: string;
  quantity: number;
  movement_type: "AJUSTE" | "MERMA";
  motivo: string | null;
}

export interface ItemOption {
  id: string;
  item_type: ItemType;
  name: string;
  unit: string;
}

export interface InventoryRepository {
  listBranches(): Promise<Branch[]>;
  listStock(): Promise<StockLine[]>;
  listItems(): Promise<ItemOption[]>;
  listMovements(branchId: string, itemType: ItemType, itemId: string): Promise<InventoryMovement[]>;
  ajustarStock(payload: AjustePayload): Promise<void>;
}
