import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient, isDemoMode } from "./demo-client";

/** Cliente de Supabase para el navegador (anon key + RLS). Demo si está activo. */
export function createClient(): SupabaseClient {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
