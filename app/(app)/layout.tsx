import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/shared/components/app-shell";
import type { Branch, UserProfile } from "@/shared/types/entities";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileData as UserProfile | null;

  // Cuenta sin perfil (p. ej. creada antes del trigger): redirige a login.
  if (!profile) redirect("/login?error=perfil");

  const { data: branchesData } = await supabase
    .from("branches")
    .select("*")
    .order("nombre", { ascending: true });
  const branches = (branchesData ?? []) as Branch[];

  return (
    <AppShell profile={profile} branches={branches ?? []}>
      {children}
    </AppShell>
  );
}
