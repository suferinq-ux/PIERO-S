import type { Metadata } from "next";
import { GastosManager } from "@/features/gastos/components/gastos-manager";

export const metadata: Metadata = { title: "Gastos" };

export default function GastosPage() {
  return <GastosManager />;
}
