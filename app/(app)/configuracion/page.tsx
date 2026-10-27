import type { Metadata } from "next";
import { ConfiguracionManager } from "@/features/configuracion/components/configuracion-manager";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return <ConfiguracionManager />;
}
