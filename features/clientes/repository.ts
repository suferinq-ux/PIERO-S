import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/shared/types/entities";
import type { CustomerValues } from "./schemas";
import type { CustomerSale } from "./types";

function toNull(s: string): string | null {
  return s.trim() === "" ? null : s.trim();
}

/** Repositorio de clientes. Lectura para autenticados; escritura admin/cajero. */
export const customerRepository = {
  async list(): Promise<Customer[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Customer[];
  },

  async save(values: CustomerValues, id?: string): Promise<void> {
    const supabase = createClient();
    const payload = {
      nombre: values.nombre.trim(),
      telefono: toNull(values.telefono),
      email: toNull(values.email),
      fecha_nacimiento: toNull(values.fecha_nacimiento),
      puntos: values.puntos,
      notas: toNull(values.notas),
    };
    const { error } = id
      ? await supabase.from("customers").update(payload).eq("id", id)
      : await supabase.from("customers").insert(payload);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listSales(customerId: string): Promise<CustomerSale[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select("id, total, status, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomerSale[];
  },

  async addPoints(customerId: string, points: number): Promise<void> {
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("puntos")
      .eq("id", customerId)
      .single();
    const current = (data as { puntos: number } | null)?.puntos ?? 0;
    const { error } = await supabase
      .from("customers")
      .update({ puntos: current + points })
      .eq("id", customerId);
    if (error) throw new Error(error.message);
  },
};
