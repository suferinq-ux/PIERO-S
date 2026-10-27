import type { Metadata } from "next";
import { TransferenciasManager } from "@/features/transferencias/components/transferencias-manager";

export const metadata: Metadata = { title: "Transferencias" };

export default function TransferenciasPage() {
  return <TransferenciasManager />;
}
