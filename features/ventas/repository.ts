import { createClient } from "@/lib/supabase/client";
import type { CashRegister, PaymentInput, Sale, SaleResult } from "./types";

export interface RegistrarVentaInput {
  branch_id: string;
  items: { product_id: string; variant_id: string | null; cantidad: number }[];
  payments: PaymentInput[];
  descuento: number;
  tipo_consumo: "LOCAL" | "PARA_LLEVAR";
  notas: string | null;
}

/**
 * Repositorio de ventas. La creación y anulación van por RPC transaccionales
 * (`registrar_venta`, `anular_venta`), que resuelven precios y descuentan stock.
 */
export const ventaRepository = {
  async registrar(input: RegistrarVentaInput): Promise<SaleResult> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("registrar_venta", {
      p_branch_id: input.branch_id,
      p_items: input.items,
      p_payments: input.payments,
      p_descuento: input.descuento,
      p_tipo_consumo: input.tipo_consumo,
      p_customer_id: null,
      p_notas: input.notas,
    });
    if (error) throw new Error(error.message);
    return data as SaleResult;
  },

  async listSales(branchId: string): Promise<Sale[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Sale[];
  },

  async anular(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("anular_venta", { p_sale_id: id });
    if (error) throw new Error(error.message);
  },

  async listOpenRegister(branchId: string): Promise<CashRegister | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("branch_id", branchId)
      .eq("status", "ABIERTA")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as CashRegister | null) ?? null;
  },
};
