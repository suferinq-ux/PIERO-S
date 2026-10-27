import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoClient, isDemoMode } from "./demo-client";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Cliente de Supabase para Server Components / Route Handlers. */
export async function createClient(): Promise<SupabaseClient> {
  if (isDemoMode()) {
    return createDemoClient() as unknown as SupabaseClient;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // El middleware refresca la sesión; aquí se ignora si no se puede escribir.
          }
        },
      },
    },
  );
}
