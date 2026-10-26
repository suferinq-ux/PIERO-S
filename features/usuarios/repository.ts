import { createClient } from "@/lib/supabase/client";
import type { Branch, UserProfile } from "@/shared/types/entities";
import type { CreateUserValues, UpdateUserValues } from "./schemas";

export interface UserWithBranches extends UserProfile {
  branch_ids: string[];
}

async function apiFetch<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(json.error ?? "Error en la operación");
  }
  return json;
}

/**
 * Repositorio de usuarios. Las lecturas usan el cliente de navegador (RLS:
 * solo SUPER_ADMIN ve todos); las mutaciones de auth van por API routes que
 * usan la service_role key en el servidor.
 */
export const userRepository = {
  async list(): Promise<UserWithBranches[]> {
    const supabase = createClient();
    const [{ data: profiles, error }, { data: assignments }] = await Promise.all([
      supabase.from("users_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_branches").select("user_id, branch_id"),
    ]);
    if (error) throw new Error(error.message);

    const byUser = new Map<string, string[]>();
    for (const a of assignments ?? []) {
      const arr = byUser.get(a.user_id) ?? [];
      arr.push(a.branch_id);
      byUser.set(a.user_id, arr);
    }
    return (profiles ?? []).map((p) => ({ ...p, branch_ids: byUser.get(p.id) ?? [] }));
  },

  async listBranches(): Promise<Branch[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  create(values: CreateUserValues) {
    return apiFetch<{ id: string }>("/api/usuarios", "POST", values);
  },

  update(id: string, values: UpdateUserValues) {
    return apiFetch<{ ok: boolean }>(`/api/usuarios/${id}`, "PATCH", values);
  },
};
