import type { Metadata } from "next";
import { DashboardClient } from "@/features/dashboard/components/dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <DashboardClient />;
}
