import { AppShell } from "@/shared/components/app-shell";

/**
 * Layout de la zona autenticada. No hace consultas en el servidor: la sesión se
 * resuelve en el cliente una sola vez (useSession) y se cachea, de modo que el
 * cambio entre módulos es instantáneo. La protección de rutas la hace el
 * middleware.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
