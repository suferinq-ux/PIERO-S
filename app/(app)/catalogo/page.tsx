import type { Metadata } from "next";
import { CatalogoManager } from "@/features/catalogo/components/catalogo-manager";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogoPage() {
  return <CatalogoManager />;
}
