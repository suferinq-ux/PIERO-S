import type { Metadata } from "next";
import { InsumosManager } from "@/features/insumos/components/insumos-manager";

export const metadata: Metadata = { title: "Insumos" };

export default function InsumosPage() {
  return <InsumosManager />;
}
