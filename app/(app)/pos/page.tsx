import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PosClient } from "@/features/pos/components/pos-client";
import type { Role } from "@/shared/types/entities";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("users_profiles").select("role").eq("id", user.id).single();
  const role = ((data?.role as Role) ?? "VENDEDOR_SOLO_LECTURA") as Role;

  return <PosClient role={role} />;
}
