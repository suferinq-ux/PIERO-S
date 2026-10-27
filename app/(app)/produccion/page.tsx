import type { Metadata } from "next";
import { ProduccionManager } from "@/features/produccion/components/produccion-manager";

export const metadata: Metadata = { title: "Producción" };

export default function ProduccionPage() {
  return <ProduccionManager />;
}
