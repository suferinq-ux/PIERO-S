import type { Metadata } from "next";
import { PosClient } from "@/features/pos/components/pos-client";

export const metadata: Metadata = { title: "Punto de venta" };

export default function PosPage() {
  return <PosClient />;
}
