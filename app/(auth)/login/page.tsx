import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-semibold">Iniciar sesión</h2>
        <p className="text-sm text-muted-foreground">Ingresa con tu cuenta de PIERO&apos;S</p>
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          No se pudo confirmar tu cuenta. Intenta nuevamente.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
