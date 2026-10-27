import { createClient } from "@/lib/supabase/client";
import type { Branch, UserProfile } from "@/shared/types/entities";

export interface AuditLog {
  id: string;
  user_id: string | null;
  branch_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalles: Record<string, unknown> | null;
  created_at: string;
  user_name: string;
  branch_name: string;
}

/** Repositorio de auditoría (solo lectura). */
export const auditRepository = {
  async list(): Promise<AuditLog[]> {
    const supabase = createClient();
    const [logsRes, profilesRes, branchesRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("users_profiles").select("id, full_name, email"),
      supabase.from("branches").select("*"),
    ]);
    const userMap = new Map(
      ((profilesRes.data ?? []) as UserProfile[]).map((p) => [p.id, p.full_name ?? p.email ?? "—"]),
    );
    const branchMap = new Map(((branchesRes.data ?? []) as Branch[]).map((b) => [b.id, b.nombre]));
    return ((logsRes.data ?? []) as AuditLog[]).map((l) => ({
      ...l,
      user_name: l.user_id ? (userMap.get(l.user_id) ?? "Sistema") : "Sistema",
      branch_name: l.branch_id ? (branchMap.get(l.branch_id) ?? "—") : "—",
    }));
  },
};
