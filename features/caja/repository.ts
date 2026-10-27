import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/shared/types/entities";
import type { CashRegister } from "@/features/ventas/types";
import type { CashMovement, CashMovementType, CierreResult } from "./types";

/** Repositorio de caja. Apertura, cierre y movimientos van por RPC. */
export const cajaRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
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

  async listMovements(registerId: string): Promise<CashMovement[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_movements")
      .select("*")
      .eq("cash_register_id", registerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CashMovement[];
  },

  async abrir(branchId: string, montoInicial: number): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("abrir_caja", {
      p_branch_id: branchId,
      p_monto_inicial: montoInicial,
    });
    if (error) throw new Error(error.message);
  },

  async cerrar(
    registerId: string,
    montoReal: number,
    justificacion: string | null,
  ): Promise<CierreResult> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("cerrar_caja", {
      p_cash_register_id: registerId,
      p_monto_real: montoReal,
      p_justificacion: justificacion,
    });
    if (error) throw new Error(error.message);
    return data as CierreResult;
  },

  async registrarMovimiento(
    registerId: string,
    tipo: CashMovementType,
    monto: number,
    motivo: string | null,
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("registrar_movimiento_caja", {
      p_cash_register_id: registerId,
      p_tipo: tipo,
      p_monto: monto,
      p_motivo: motivo,
    });
    if (error) throw new Error(error.message);
  },
};
