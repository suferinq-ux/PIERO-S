-- =============================================================================
-- PIERO'S — Migración 3: Row Level Security, triggers y auditoría
-- =============================================================================
-- Toda tabla de datos lleva RLS activada. Las políticas filtran por rol y por
-- sucursal asignada (user_branches). SUPER_ADMIN salta el filtro por sucursal.

-- ---------------------------------------------------------------------------
-- Timestamps automáticos (updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creación automática de perfil al registrarse en auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.users_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'VENDEDOR_SOLO_LECTURA'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Protección de rol: impide el auto-ascenso (salvo SUPER_ADMIN / servicio)
-- ---------------------------------------------------------------------------
create or replace function public.protect_role()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Solo un SUPER_ADMIN puede cambiar roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trig_proteger_rol_perfil on public.users_profiles;
create trigger trig_proteger_rol_perfil
  before update on public.users_profiles
  for each row execute function public.protect_role();

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
create or replace function public.record_audit(
  p_accion     text,
  p_entidad    text,
  p_entidad_id uuid default null,
  p_branch_id  uuid default null,
  p_detalles   jsonb default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (user_id, branch_id, accion, entidad, entidad_id, detalles)
  values (auth.uid(), p_branch_id, p_accion, p_entidad, p_entidad_id, p_detalles);
end;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.branches          enable row level security;
alter table public.users_profiles    enable row level security;
alter table public.user_branches     enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.prices_by_branch  enable row level security;
alter table public.supplies          enable row level security;
alter table public.recipes           enable row level security;
alter table public.recipe_items      enable row level security;
alter table public.business_settings enable row level security;
alter table public.stock_levels      enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.transfers         enable row level security;
alter table public.transfer_items    enable row level security;
alter table public.production_orders enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.payments          enable row level security;
alter table public.cash_registers    enable row level security;
alter table public.cash_movements    enable row level security;
alter table public.customers         enable row level security;
alter table public.orders_custom     enable row level security;
alter table public.order_payments    enable row level security;
alter table public.suppliers         enable row level security;
alter table public.purchase_orders   enable row level security;
alter table public.purchase_items    enable row level security;
alter table public.expenses          enable row level security;
alter table public.employees         enable row level security;
alter table public.shifts            enable row level security;
alter table public.audit_logs        enable row level security;

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (public.is_super_admin() or id = any(public.get_user_branch_ids()));

drop policy if exists branches_insert on public.branches;
create policy branches_insert on public.branches
  for insert with check (public.is_super_admin());

drop policy if exists branches_update on public.branches;
create policy branches_update on public.branches
  for update using (
    public.is_super_admin()
    or (id = any(public.get_user_branch_ids())
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (true);

drop policy if exists branches_delete on public.branches;
create policy branches_delete on public.branches
  for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- users_profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.users_profiles;
create policy profiles_select on public.users_profiles
  for select using (public.is_super_admin() or id = auth.uid());

drop policy if exists profiles_insert on public.users_profiles;
create policy profiles_insert on public.users_profiles
  for insert with check (public.is_super_admin());

drop policy if exists profiles_update on public.users_profiles;
create policy profiles_update on public.users_profiles
  for update using (public.is_super_admin() or id = auth.uid())
  with check (public.is_super_admin() or id = auth.uid());

drop policy if exists profiles_delete on public.users_profiles;
create policy profiles_delete on public.users_profiles
  for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- user_branches
-- ---------------------------------------------------------------------------
drop policy if exists user_branches_select on public.user_branches;
create policy user_branches_select on public.user_branches
  for select using (public.is_super_admin() or user_id = auth.uid());

drop policy if exists user_branches_insert on public.user_branches;
create policy user_branches_insert on public.user_branches
  for insert with check (public.is_super_admin());

drop policy if exists user_branches_update on public.user_branches;
create policy user_branches_update on public.user_branches
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists user_branches_delete on public.user_branches;
create policy user_branches_delete on public.user_branches
  for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using ((select auth.uid()) is not null);

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using ((select auth.uid()) is not null);

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
drop policy if exists variants_select on public.product_variants;
create policy variants_select on public.product_variants
  for select using ((select auth.uid()) is not null);

drop policy if exists variants_write on public.product_variants;
create policy variants_write on public.product_variants
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- prices_by_branch
-- ---------------------------------------------------------------------------
drop policy if exists prices_select on public.prices_by_branch;
create policy prices_select on public.prices_by_branch
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists prices_write on public.prices_by_branch;
create policy prices_write on public.prices_by_branch
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  );

-- ---------------------------------------------------------------------------
-- supplies / recipes / recipe_items
-- ---------------------------------------------------------------------------
drop policy if exists supplies_select on public.supplies;
create policy supplies_select on public.supplies
  for select using ((select auth.uid()) is not null);

drop policy if exists supplies_write on public.supplies;
create policy supplies_write on public.supplies
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]));

drop policy if exists recipes_select on public.recipes;
create policy recipes_select on public.recipes
  for select using ((select auth.uid()) is not null);

drop policy if exists recipes_write on public.recipes;
create policy recipes_write on public.recipes
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]));

drop policy if exists recipe_items_select on public.recipe_items;
create policy recipe_items_select on public.recipe_items
  for select using ((select auth.uid()) is not null);

drop policy if exists recipe_items_write on public.recipe_items;
create policy recipe_items_write on public.recipe_items
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- business_settings
-- ---------------------------------------------------------------------------
drop policy if exists settings_select on public.business_settings;
create policy settings_select on public.business_settings
  for select using ((select auth.uid()) is not null);

drop policy if exists settings_write on public.business_settings;
create policy settings_write on public.business_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- stock_levels / inventory_movements
-- ---------------------------------------------------------------------------
drop policy if exists stock_select on public.stock_levels;
create policy stock_select on public.stock_levels
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists stock_write on public.stock_levels;
create policy stock_write on public.stock_levels
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  );

drop policy if exists movements_select on public.inventory_movements;
create policy movements_select on public.inventory_movements
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists movements_insert on public.inventory_movements;
create policy movements_insert on public.inventory_movements
  for insert with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  );

drop policy if exists movements_update on public.inventory_movements;
create policy movements_update on public.inventory_movements
  for update using (public.is_super_admin());

drop policy if exists movements_delete on public.inventory_movements;
create policy movements_delete on public.inventory_movements
  for delete using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- transfers / transfer_items
-- ---------------------------------------------------------------------------
drop policy if exists transfers_select on public.transfers;
create policy transfers_select on public.transfers
  for select using (
    public.user_has_branch_access(from_branch_id)
    or public.user_has_branch_access(to_branch_id)
  );

drop policy if exists transfers_write on public.transfers;
create policy transfers_write on public.transfers
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(from_branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(from_branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  );

drop policy if exists transfer_items_select on public.transfer_items;
create policy transfer_items_select on public.transfer_items
  for select using (
    exists (
      select 1 from public.transfers t
      where t.id = transfer_id
        and (public.user_has_branch_access(t.from_branch_id)
             or public.user_has_branch_access(t.to_branch_id))
    )
  );

drop policy if exists transfer_items_write on public.transfer_items;
create policy transfer_items_write on public.transfer_items
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.transfers t
      where t.id = transfer_id
        and public.user_has_branch_access(t.from_branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.transfers t
      where t.id = transfer_id
        and public.user_has_branch_access(t.from_branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- production_orders
-- ---------------------------------------------------------------------------
drop policy if exists production_select on public.production_orders;
create policy production_select on public.production_orders
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists production_write on public.production_orders;
create policy production_write on public.production_orders
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]))
  );

-- ---------------------------------------------------------------------------
-- sales / sale_items / payments
-- ---------------------------------------------------------------------------
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales
  for insert with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  );

drop policy if exists sales_update on public.sales;
create policy sales_update on public.sales
  for update using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  ) with check (true);

drop policy if exists sales_delete on public.sales;
create policy sales_delete on public.sales
  for delete using (public.is_super_admin());

drop policy if exists sale_items_select on public.sale_items;
create policy sale_items_select on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.user_has_branch_access(s.branch_id)
    )
  );

drop policy if exists sale_items_write on public.sale_items;
create policy sale_items_write on public.sale_items
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.sales s
      where s.id = sale_id
        and public.user_has_branch_access(s.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.sales s
      where s.id = sale_id
        and public.user_has_branch_access(s.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.user_has_branch_access(s.branch_id)
    )
  );

drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.sales s
      where s.id = sale_id
        and public.user_has_branch_access(s.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.sales s
      where s.id = sale_id
        and public.user_has_branch_access(s.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- cash_registers / cash_movements
-- ---------------------------------------------------------------------------
drop policy if exists cash_select on public.cash_registers;
create policy cash_select on public.cash_registers
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists cash_write on public.cash_registers;
create policy cash_write on public.cash_registers
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  );

drop policy if exists cash_movements_select on public.cash_movements;
create policy cash_movements_select on public.cash_movements
  for select using (
    exists (
      select 1 from public.cash_registers c
      where c.id = cash_register_id and public.user_has_branch_access(c.branch_id)
    )
  );

drop policy if exists cash_movements_write on public.cash_movements;
create policy cash_movements_write on public.cash_movements
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.cash_registers c
      where c.id = cash_register_id
        and public.user_has_branch_access(c.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.cash_registers c
      where c.id = cash_register_id
        and public.user_has_branch_access(c.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using ((select auth.uid()) is not null);

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL','CAJERO']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- orders_custom / order_payments
-- ---------------------------------------------------------------------------
drop policy if exists orders_select on public.orders_custom;
create policy orders_select on public.orders_custom
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists orders_write on public.orders_custom;
create policy orders_write on public.orders_custom
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]))
  );

drop policy if exists order_payments_select on public.order_payments;
create policy order_payments_select on public.order_payments
  for select using (
    exists (
      select 1 from public.orders_custom o
      where o.id = order_id and public.user_has_branch_access(o.branch_id)
    )
  );

drop policy if exists order_payments_write on public.order_payments;
create policy order_payments_write on public.order_payments
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.orders_custom o
      where o.id = order_id
        and public.user_has_branch_access(o.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.orders_custom o
      where o.id = order_id
        and public.user_has_branch_access(o.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL','CAJERO']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- suppliers / purchase_orders / purchase_items
-- ---------------------------------------------------------------------------
drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
  for select using ((select auth.uid()) is not null);

drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers
  for all using (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]))
  with check (public.user_has_role(array['SUPER_ADMIN','ADMIN_SUCURSAL']::public.user_role[]));

drop policy if exists purchase_select on public.purchase_orders;
create policy purchase_select on public.purchase_orders
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists purchase_write on public.purchase_orders;
create policy purchase_write on public.purchase_orders
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  );

drop policy if exists purchase_items_select on public.purchase_items;
create policy purchase_items_select on public.purchase_items
  for select using (
    exists (
      select 1 from public.purchase_orders p
      where p.id = purchase_order_id and public.user_has_branch_access(p.branch_id)
    )
  );

drop policy if exists purchase_items_write on public.purchase_items;
create policy purchase_items_write on public.purchase_items
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.purchase_orders p
      where p.id = purchase_order_id
        and public.user_has_branch_access(p.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[])
    )
  ) with check (
    public.is_super_admin()
    or exists (
      select 1 from public.purchase_orders p
      where p.id = purchase_order_id
        and public.user_has_branch_access(p.branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists expenses_write on public.expenses;
create policy expenses_write on public.expenses
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  );

-- ---------------------------------------------------------------------------
-- employees / shifts
-- ---------------------------------------------------------------------------
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists employees_write on public.employees;
create policy employees_write on public.employees
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  );

drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts
  for select using (public.user_has_branch_access(branch_id));

drop policy if exists shifts_write on public.shifts;
create policy shifts_write on public.shifts
  for all using (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  ) with check (
    public.is_super_admin()
    or (public.user_has_branch_access(branch_id)
        and public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[]))
  );

-- ---------------------------------------------------------------------------
-- audit_logs (solo lectura; inserción vía record_audit)
-- ---------------------------------------------------------------------------
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select using (
    public.is_super_admin()
    or (
      public.user_has_role(array['ADMIN_SUCURSAL']::public.user_role[])
      and (branch_id is null or public.user_has_branch_access(branch_id))
    )
  );

-- =============================================================================
-- Triggers updated_at
-- =============================================================================
drop trigger if exists trg_branches_updated on public.branches;
create trigger trg_branches_updated before update on public.branches
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_variants_updated on public.product_variants;
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prices_updated on public.prices_by_branch;
create trigger trg_prices_updated before update on public.prices_by_branch
  for each row execute function public.set_updated_at();

drop trigger if exists trg_supplies_updated on public.supplies;
create trigger trg_supplies_updated before update on public.supplies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_recipes_updated on public.recipes;
create trigger trg_recipes_updated before update on public.recipes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_updated on public.sales;
create trigger trg_sales_updated before update on public.sales
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders_custom;
create trigger trg_orders_updated before update on public.orders_custom
  for each row execute function public.set_updated_at();
