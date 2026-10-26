import type { Metadata } from "next";
import { BranchesManager } from "@/features/sucursales/components/branches-manager";

export const metadata: Metadata = { title: "Sucursales" };

export default function SucursalesPage() {
  return <BranchesManager />;
}
