import type { Metadata } from "next";
import { RecetasManager } from "@/features/recetas/components/recetas-manager";

export const metadata: Metadata = { title: "Recetas" };

export default function RecetasPage() {
  return <RecetasManager />;
}
