"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Branch, UserProfile } from "@/shared/types/entities";

async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) return null;
  return profile as UserProfile;
}

async function fetchBranches(): Promise<Branch[]> {
  const supabase = createClient();
  const { data } = await supabase.from("branches").select("*").order("nombre", { ascending: true });
  return (data ?? []) as Branch[];
}

/**
 * Sesión del usuario en el cliente, cacheada. Se consulta una sola vez por
 * sesión (no en cada navegación), lo que hace instantáneo el cambio de módulo.
 */
export function useSession() {
  const profileQuery = useQuery({
    queryKey: ["session-profile"],
    queryFn: fetchProfile,
    staleTime: 10 * 60_000,
  });
  const branchesQuery = useQuery({
    queryKey: ["session-branches"],
    queryFn: fetchBranches,
    staleTime: 10 * 60_000,
  });

  return {
    profile: profileQuery.data ?? null,
    branches: branchesQuery.data ?? [],
    isLoading: profileQuery.isLoading,
  };
}
