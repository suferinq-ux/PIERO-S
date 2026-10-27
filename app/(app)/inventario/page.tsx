import type { Metadata } from "next";
import { InventarioManager } from "@/features/inventario/components/inventario-manager";

export const metadata: Metadata = { title: "Inventario" };

export default function InventarioPage() {
  return <InventarioManager />;
}
