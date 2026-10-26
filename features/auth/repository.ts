import { createClient } from "@/lib/supabase/client";
import type { AuthRepository } from "./types";

/** Implementación del repositorio de autenticación sobre Supabase. */
export const supabaseAuthRepository: AuthRepository = {
  async signIn(email, password) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: traducirError(error.message) };
    }
    return { error: null };
  },

  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  },

  async recoverPassword(email) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    });
    return { error: error ? traducirError(error.message) : null };
  },

  async getSessionUser() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? "" };
  },
};

/** Traduce mensajes de error comunes de Supabase a español. */
function traducirError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Correo o contraseña incorrectos",
    "Email not confirmed": "Confirma tu correo antes de ingresar",
  };
  return map[message] ?? message;
}
