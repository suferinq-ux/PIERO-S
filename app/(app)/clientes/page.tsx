import type { Metadata } from "next";
import { ClientesManager } from "@/features/clientes/components/clientes-manager";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return <ClientesManager />;
}
