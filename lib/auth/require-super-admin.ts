import { createClient } from "@/lib/supabase/server";

export type AuthCheck = { ok: true } | { ok: false; status: number; error: string };

/**
 * Verifica en el servidor que el llamador es un SUPER_ADMIN. Se usa en las API
 * routes que operan con la service_role key (gestión de usuarios).
 */
export async function requireSuperAdmin(): Promise<AuthCheck> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return { ok: false, status: 401, error: "No autorizado" };

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if ((profile as { role?: string } | null)?.role !== "SUPER_ADMIN") {
    return { ok: false, status: 403, error: "Prohibido" };
  }

  return { ok: true };
}
