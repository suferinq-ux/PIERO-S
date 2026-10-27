-- =============================================================================
-- PIERO'S — Migración 8: visibilidad de perfiles para administradores de sucursal
-- =============================================================================
-- Permite que ADMIN_SUCURSAL vea los perfiles de usuarios asignados a sus
-- sucursales (necesario para reportes por cajero). Se suma a la política
-- existente `profiles_select` (las políticas SELECT se combinan con OR).

drop policy if exists profiles_select_admin_branch on public.users_profiles;
create policy profiles_select_admin_branch on public.users_profiles
  for select using (
    public.is_super_admin()
    or id = auth.uid()
    or (
      public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[])
      and exists (
        select 1 from public.user_branches ub
        where ub.user_id = users_profiles.id
          and public.user_has_branch_access(ub.branch_id)
      )
    )
  );
