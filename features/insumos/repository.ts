import { createClient } from "@/lib/supabase/client";
import type { Supply } from "@/shared/types/entities";

/** Repositorio de insumos (materias primas). Escrituras protegidas por RLS. */
export const supplyRepository = {
  async list(): Promise<Supply[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("supplies")
      .select("*")
      .is("deleted_at", null)
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Supply[];
  },

  async save(
    values: {
      nombre: string;
      unidad_medida: string;
      costo: number;
      stock_minimo: number;
      is_active: boolean;
    },
    id?: string,
  ): Promise<void> {
    const supabase = createClient();
    const payload = {
      nombre: values.nombre.trim(),
      unidad_medida: values.unidad_medida.trim(),
      costo: values.costo,
      stock_minimo: values.stock_minimo,
      is_active: values.is_active,
    };
    const { error } = id
      ? await supabase.from("supplies").update(payload).eq("id", id)
      : await supabase.from("supplies").insert(payload);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("supplies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
