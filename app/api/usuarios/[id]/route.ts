import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { updateUserSchema } from "@/features/usuarios/schemas";

/**
 * Actualiza rol, estado y sucursales de un usuario. La service_role key solo
 * se usa en el servidor; el trigger protect_role permite el cambio por servicio.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { full_name, role, is_active, branch_ids } = parsed.data;

  if (role !== "SUPER_ADMIN" && branch_ids.length === 0) {
    return NextResponse.json({ error: "Asigna al menos una sucursal" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("users_profiles")
    .update({ full_name, role, is_active })
    .eq("id", id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { error: delError } = await admin.from("user_branches").delete().eq("user_id", id);
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  if (branch_ids.length > 0) {
    const { error: branchError } = await admin
      .from("user_branches")
      .insert(branch_ids.map((branch_id) => ({ user_id: id, branch_id })));
    if (branchError) return NextResponse.json({ error: branchError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
