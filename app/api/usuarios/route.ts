import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { createUserSchema } from "@/features/usuarios/schemas";

/**
 * Crea un usuario (auth + perfil + asignación de sucursales).
 * Usa la service_role key SOLO en el servidor.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email, password, full_name, role, branch_ids } = parsed.data;

  if (role !== "SUPER_ADMIN" && branch_ids.length === 0) {
    return NextResponse.json({ error: "Asigna al menos una sucursal" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const userId = data.user.id;

  // El trigger handle_new_user ya creó el perfil con rol mínimo; aquí se asigna
  // el rol y las sucursales elegidos.
  const { error: profileError } = await admin
    .from("users_profiles")
    .update({ full_name, role })
    .eq("id", userId);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  if (branch_ids.length > 0) {
    const { error: branchError } = await admin
      .from("user_branches")
      .insert(branch_ids.map((branch_id) => ({ user_id: userId, branch_id })));
    if (branchError) return NextResponse.json({ error: branchError.message }, { status: 500 });
  }

  return NextResponse.json({ id: userId });
}
