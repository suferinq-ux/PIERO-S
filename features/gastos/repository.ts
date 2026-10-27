import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/shared/types/entities";
import type { Expense, ExpenseValues } from "./schemas";

/** Repositorio de gastos. Escritura admin/administrador de sucursal. */
export const expenseRepository = {
  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("branches").select("*").order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },

  async list(): Promise<Expense[]> {
    const supabase = createClient();
    const [expensesRes, branchesRes] = await Promise.all([
      supabase.from("expenses").select("*").order("fecha", { ascending: false }),
      supabase.from("branches").select("*"),
    ]);
    const branchMap = new Map(((branchesRes.data ?? []) as Branch[]).map((b) => [b.id, b.nombre]));
    return ((expensesRes.data ?? []) as Expense[]).map((e) => ({
      ...e,
      branch_name: branchMap.get(e.branch_id) ?? "—",
    }));
  },

  async save(values: ExpenseValues, id?: string): Promise<void> {
    const supabase = createClient();
    const payload = {
      branch_id: values.branch_id,
      categoria: values.categoria,
      monto: values.monto,
      descripcion: values.descripcion.trim() || null,
      fecha: values.fecha,
    };
    const { error } = id
      ? await supabase.from("expenses").update(payload).eq("id", id)
      : await supabase.from("expenses").insert(payload);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
