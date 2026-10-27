import type { Metadata } from "next";
import { AuditoriaManager } from "@/features/auditoria/components/auditoria-manager";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditoriaPage() {
  return <AuditoriaManager />;
}
