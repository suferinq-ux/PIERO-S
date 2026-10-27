import type { Metadata } from "next";
import { ReportesManager } from "@/features/reportes/components/reportes-manager";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportesPage() {
  return <ReportesManager />;
}
