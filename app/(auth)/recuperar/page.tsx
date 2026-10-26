import type { Metadata } from "next";
import { RecoverForm } from "@/features/auth/components/recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-semibold">Recuperar contraseña</h2>
        <p className="text-sm text-muted-foreground">Te enviaremos un enlace para restablecerla.</p>
      </div>
      <RecoverForm />
    </div>
  );
}
