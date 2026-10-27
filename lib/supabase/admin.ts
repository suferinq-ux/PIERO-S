import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient, isDemoMode } from "./demo-client";

/**
 * Cliente de Supabase con la service_role key (solo servidor). En modo demo
 * devuelve el cliente simulado.
 */
export function createAdminClient(): SupabaseClient {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está definida (solo servidor).");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
