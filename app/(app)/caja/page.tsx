import type { Metadata } from "next";
import { CajaManager } from "@/features/caja/components/caja-manager";

export const metadata: Metadata = { title: "Caja" };

export default function CajaPage() {
  return <CajaManager />;
}
