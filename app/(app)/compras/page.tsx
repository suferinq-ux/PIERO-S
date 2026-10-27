import type { Metadata } from "next";
import { ComprasManager } from "@/features/compras/components/compras-manager";

export const metadata: Metadata = { title: "Compras" };

export default function ComprasPage() {
  return <ComprasManager />;
}
