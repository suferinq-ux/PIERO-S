import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/shared/types/entities";
import type { BranchValues } from "./schemas";

/** Convierte cadenas vacías en null para respetar la unicidad de `codigo`. */
function toInput(values: BranchValues) {
  const toNull = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    nombre: values.nombre.trim(),
    codigo: toNull(values.codigo),
    direccion: toNull(values.direccion),
    telefono: toNull(values.telefono),
    horario: toNull(values.horario),
    serie_boleta: toNull(values.serie_boleta),
    serie_factura: toNull(values.serie_factura),
  };
}

/**
 * Repositorio de sucursales (adapter sobre Supabase). Las escrituras pasan por
 * RLS: SUPER_ADMIN gestiona todo; ADMIN_SUCURSAL solo su sucursal.
 */
export const branchRepository = {
  async list(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async create(values: BranchValues): Promise<Branch> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .insert(toInput(values))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, values: BranchValues): Promise<Branch> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .update(toInput(values))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
