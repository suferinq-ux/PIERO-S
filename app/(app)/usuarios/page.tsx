import type { Metadata } from "next";
import { UsersManager } from "@/features/usuarios/components/users-manager";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsuariosPage() {
  return <UsersManager />;
}
