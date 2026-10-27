-- =============================================================================
-- PIERO'S — Esquema completo de Supabase (GENERADO)
-- =============================================================================
-- Este archivo es GENERADO: no lo edites a mano.
-- Se reconstruye con: npm run schema
-- Equivale a ejecutar en orden todas las migraciones de supabase/migrations/.
-- Incluye enums, tablas, índices, funciones, RLS, triggers y el bucket de
-- Storage. NO incluye datos de ejemplo (ver supabase/seed.sql).
-- =============================================================================

-- >>> 20260101000001_enums_y_core.sql

-- =============================================================================
-- PIERO'S — Migración 1: enums, tablas de identidad/acceso y catálogo/insumos
-- =============================================================================
-- Migración versionada (Supabase CLI). Idempotente donde corresponde.
-- Identificadores UUID, timestamps con zona horaria (timestamptz).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'SUPER_ADMIN', 'ADMIN_SUCURSAL', 'CAJERO', 'PRODUCCION', 'VENDEDOR_SOLO_LECTURA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA', 'MIXTO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'consumption_type') then
    create type public.consumption_type as enum ('LOCAL', 'PARA_LLEVAR');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sale_status') then
    create type public.sale_status as enum ('COMPLETADA', 'ANULADA');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transfer_status') then
    create type public.transfer_status as enum ('SOLICITADO', 'ENVIADO', 'RECIBIDO', 'CANCELADO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'production_status') then
    create type public.production_status as enum ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_register_status') then
    create type public.cash_register_status as enum ('ABIERTA', 'CERRADA');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_movement_type') then
    create type public.cash_movement_type as enum ('INGRESO', 'EGRESO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'purchase_status') then
    create type public.purchase_status as enum ('BORRADOR', 'EMITIDA', 'RECIBIDA', 'CANCELADA');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_item_type') then
    create type public.inventory_item_type as enum ('INSUMO', 'PRODUCTO');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'movement_type') then
    create type public.movement_type as enum (
      'ENTRADA', 'SALIDA', 'AJUSTE', 'MERMA', 'TRANSFERENCIA', 'PRODUCCION', 'VENTA', 'COMPRA'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Sucursales
-- ---------------------------------------------------------------------------
create table if not exists public.branches (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  codigo          text unique,
  direccion       text,
  telefono        text,
  horario         text,
  serie_boleta    text,
  serie_factura   text,
  logo_url        text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Perfiles de usuario (espejo de auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'VENDEDOR_SOLO_LECTURA',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Asignación usuario <-> sucursal (multisucursal)
-- ---------------------------------------------------------------------------
create table if not exists public.user_branches (
  user_id     uuid not null references public.users_profiles(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  primary key (user_id, branch_id)
);

-- ---------------------------------------------------------------------------
-- Funciones de seguridad (SECURITY DEFINER con SET search_path)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public, pg_temp
as $$
  select role from public.users_profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'SUPER_ADMIN'::public.user_role, false);
$$;

create or replace function public.get_user_branch_ids()
returns uuid[]
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(array_agg(branch_id), '{}'::uuid[])
  from public.user_branches
  where user_id = auth.uid();
$$;

create or replace function public.user_has_branch_access(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.is_super_admin() or p_branch_id = any(public.get_user_branch_ids());
$$;

create or replace function public.user_has_role(p_roles public.user_role[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.current_user_role() = any(p_roles);
$$;

-- ---------------------------------------------------------------------------
-- Catálogo: categorías
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo: productos
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id),
  nombre        text not null,
  descripcion   text,
  image_url     text,
  barcode       text unique,
  has_variants  boolean not null default false,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);

-- ---------------------------------------------------------------------------
-- Catálogo: variantes (tamaños, sabores)
-- ---------------------------------------------------------------------------
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  nombre      text not null,
  sku         text,
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_variants_product on public.product_variants(product_id);

-- ---------------------------------------------------------------------------
-- Catálogo: precios por sucursal
-- ---------------------------------------------------------------------------
create table if not exists public.prices_by_branch (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  price       numeric(12,2) not null check (price >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_prices_branch on public.prices_by_branch(branch_id);
create unique index if not exists uq_prices_branch on public.prices_by_branch
  (product_id, variant_id, branch_id) nulls not distinct;

-- ---------------------------------------------------------------------------
-- Insumos (materias primas)
-- ---------------------------------------------------------------------------
create table if not exists public.supplies (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  unidad_medida     text not null default 'unidad',
  costo             numeric(12,4) not null default 0,
  stock_minimo      numeric(12,3) not null default 0,
  is_active         boolean not null default true,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recetas
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products(id) on delete cascade,
  variant_id         uuid references public.product_variants(id) on delete cascade,
  nombre             text not null,
  rendimiento        numeric(12,3) not null default 1,
  unidad_rendimiento text not null default 'unidad',
  instrucciones      text,
  is_active          boolean not null default true,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_recipes_product on public.recipes(product_id);

create table if not exists public.recipe_items (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  supply_id  uuid not null references public.supplies(id),
  cantidad   numeric(12,4) not null check (cantidad > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_recipe_items_recipe on public.recipe_items(recipe_id);

-- ---------------------------------------------------------------------------
-- Configuración del negocio (clave-valor JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.business_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- >>> 20260101000002_operaciones.sql

-- =============================================================================
-- PIERO'S — Migración 2: tablas operativas (inventario, ventas, caja, etc.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Stock por sucursal (insumos y productos terminados)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_levels (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  item_type   public.inventory_item_type not null,
  item_id     uuid not null,
  quantity    numeric(12,3) not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists idx_stock_branch on public.stock_levels(branch_id);
create unique index if not exists uq_stock_levels on public.stock_levels
  (branch_id, item_type, item_id);

-- ---------------------------------------------------------------------------
-- Kardex: historial de movimientos de inventario
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  item_type      public.inventory_item_type not null,
  item_id        uuid not null,
  movement_type  public.movement_type not null,
  quantity       numeric(12,3) not null check (quantity <> 0),
  unit_cost      numeric(12,4),
  reference_type text,
  reference_id   uuid,
  motivo         text,
  created_by     uuid references public.users_profiles(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_movements_branch on public.inventory_movements(branch_id);
create index if not exists idx_movements_item on public.inventory_movements(item_type, item_id);
create index if not exists idx_movements_created on public.inventory_movements(created_at);

-- ---------------------------------------------------------------------------
-- Transferencias entre sucursales
-- ---------------------------------------------------------------------------
create table if not exists public.transfers (
  id             uuid primary key default gen_random_uuid(),
  from_branch_id uuid not null references public.branches(id),
  to_branch_id   uuid not null references public.branches(id),
  status         public.transfer_status not null default 'SOLICITADO',
  notas          text,
  created_by     uuid references public.users_profiles(id),
  created_at     timestamptz not null default now(),
  enviado_por    uuid references public.users_profiles(id),
  enviado_at     timestamptz,
  recibido_por   uuid references public.users_profiles(id),
  recibido_at    timestamptz,
  constraint transfers_distintas check (from_branch_id <> to_branch_id)
);

create index if not exists idx_transfers_from on public.transfers(from_branch_id);
create index if not exists idx_transfers_to on public.transfers(to_branch_id);

create table if not exists public.transfer_items (
  id                 uuid primary key default gen_random_uuid(),
  transfer_id        uuid not null references public.transfers(id) on delete cascade,
  item_type          public.inventory_item_type not null,
  item_id            uuid not null,
  quantity           numeric(12,3) not null check (quantity > 0),
  received_quantity  numeric(12,3) not null default 0
);

create index if not exists idx_transfer_items on public.transfer_items(transfer_id);

-- ---------------------------------------------------------------------------
-- Órdenes de producción
-- ---------------------------------------------------------------------------
create table if not exists public.production_orders (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  recipe_id      uuid not null references public.recipes(id),
  product_id     uuid not null references public.products(id),
  variant_id     uuid references public.product_variants(id),
  quantity       numeric(12,3) not null check (quantity > 0),
  status         public.production_status not null default 'PENDIENTE',
  notas          text,
  created_by     uuid references public.users_profiles(id),
  created_at     timestamptz not null default now(),
  completed_by   uuid references public.users_profiles(id),
  completed_at   timestamptz
);

create index if not exists idx_production_branch on public.production_orders(branch_id);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  telefono          text,
  email             text,
  fecha_nacimiento  date,
  puntos            int not null default 0,
  notas             text,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ventas (POS)
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  serie         text,
  numero        int,
  customer_id   uuid references public.customers(id),
  cashier_id    uuid references public.users_profiles(id),
  subtotal      numeric(12,2) not null default 0,
  descuento     numeric(12,2) not null default 0,
  igv           numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  tipo_consumo  public.consumption_type not null default 'LOCAL',
  status        public.sale_status not null default 'COMPLETADA',
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_sales_branch on public.sales(branch_id);
create index if not exists idx_sales_created on public.sales(created_at);
create index if not exists idx_sales_numero on public.sales(branch_id, numero);

create table if not exists public.sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references public.sales(id) on delete cascade,
  product_id       uuid not null references public.products(id),
  variant_id       uuid references public.product_variants(id),
  cantidad         numeric(12,3) not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null,
  descuento        numeric(12,2) not null default 0,
  subtotal         numeric(12,2) not null default 0
);

create index if not exists idx_sale_items_sale on public.sale_items(sale_id);

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales(id) on delete cascade,
  method      public.payment_method not null,
  amount      numeric(12,2) not null check (amount > 0),
  referencia  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_payments_sale on public.payments(sale_id);

-- ---------------------------------------------------------------------------
-- Caja
-- ---------------------------------------------------------------------------
create table if not exists public.cash_registers (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  abierto_por     uuid references public.users_profiles(id),
  monto_inicial   numeric(12,2) not null default 0,
  abierto_at      timestamptz not null default now(),
  cerrado_por     uuid references public.users_profiles(id),
  cerrado_at      timestamptz,
  monto_esperado  numeric(12,2),
  monto_real      numeric(12,2),
  diferencia      numeric(12,2),
  justificacion   text,
  status          public.cash_register_status not null default 'ABIERTA'
);

create index if not exists idx_cash_branch on public.cash_registers(branch_id);

create table if not exists public.cash_movements (
  id               uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  tipo             public.cash_movement_type not null,
  monto            numeric(12,2) not null check (monto > 0),
  motivo           text,
  referencia       text,
  sale_id          uuid references public.sales(id) on delete set null,
  created_by       uuid references public.users_profiles(id),
  created_at       timestamptz not null default now()
);

create index if not exists idx_cash_movements on public.cash_movements(cash_register_id);

-- ---------------------------------------------------------------------------
-- Pedidos por encargo
-- ---------------------------------------------------------------------------
create table if not exists public.orders_custom (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  customer_id    uuid not null references public.customers(id),
  product_id     uuid not null references public.products(id),
  fecha_entrega  date not null,
  hora_entrega   time,
  mensaje        text,
  sabor          text,
  relleno        text,
  tamano         text,
  cantidad       int not null default 1 check (cantidad > 0),
  total          numeric(12,2) not null default 0,
  anticipo       numeric(12,2) not null default 0,
  saldo          numeric(12,2) not null default 0,
  status         public.order_status not null default 'PENDIENTE',
  notas          text,
  created_by     uuid references public.users_profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_orders_branch on public.orders_custom(branch_id);
create index if not exists idx_orders_status on public.orders_custom(status);

create table if not exists public.order_payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders_custom(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      public.payment_method not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_order_payments on public.order_payments(order_id);

-- ---------------------------------------------------------------------------
-- Proveedores
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  ruc         text unique,
  telefono    text,
  email       text,
  direccion   text,
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references public.branches(id) on delete cascade,
  supplier_id  uuid not null references public.suppliers(id),
  status       public.purchase_status not null default 'BORRADOR',
  total        numeric(12,2) not null default 0,
  notas        text,
  created_by   uuid references public.users_profiles(id),
  created_at   timestamptz not null default now(),
  recibida_at  timestamptz
);

create index if not exists idx_purchase_branch on public.purchase_orders(branch_id);

create table if not exists public.purchase_items (
  id                 uuid primary key default gen_random_uuid(),
  purchase_order_id  uuid not null references public.purchase_orders(id) on delete cascade,
  supply_id          uuid not null references public.supplies(id),
  cantidad           numeric(12,3) not null check (cantidad > 0),
  costo_unitario     numeric(12,4) not null default 0
);

create index if not exists idx_purchase_items on public.purchase_items(purchase_order_id);

-- ---------------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  categoria   text not null,
  monto       numeric(12,2) not null check (monto > 0),
  descripcion text,
  fecha       date not null default current_date,
  created_by  uuid references public.users_profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_expenses_branch on public.expenses(branch_id);

-- ---------------------------------------------------------------------------
-- Personal y turnos (opcional)
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  nombre      text not null,
  cargo       text,
  telefono    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.shifts (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  branch_id    uuid not null references public.branches(id) on delete cascade,
  fecha        date not null,
  hora_inicio  time not null,
  hora_fin     time not null,
  notas        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_shifts_employee on public.shifts(employee_id);

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users_profiles(id),
  branch_id   uuid references public.branches(id),
  accion      text not null,
  entidad     text not null,
  entidad_id  uuid,
  detalles    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_entity on public.audit_logs(entidad, entidad_id);
create index if not exists idx_audit_created on public.audit_logs(created_at);

-- >>> 20260101000003_rls_y_triggers.sql

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

-- >>> 20260101000004_storage.sql

-- =============================================================================
-- PIERO'S — Migración 4: bucket de Storage para imágenes de productos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Lectura pública del bucket.
drop policy if exists "productos_public_read" on storage.objects;
create policy "productos_public_read" on storage.objects
  for select using (bucket_id = 'productos');

-- Escritura solo para usuarios autenticados (la UI limita a admin/cajero).
drop policy if exists "productos_auth_insert" on storage.objects;
create policy "productos_auth_insert" on storage.objects
  for insert with check (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "productos_auth_update" on storage.objects;
create policy "productos_auth_update" on storage.objects
  for update using (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "productos_auth_delete" on storage.objects;
create policy "productos_auth_delete" on storage.objects
  for delete using (bucket_id = 'productos' and auth.role() = 'authenticated');

-- >>> 20260101000005_rpc_inventario.sql

-- =============================================================================
-- PIERO'S — Migración 5: RPC transaccionales (inventario, transferencias, producción)
-- =============================================================================
-- Operaciones críticas como funciones PostgreSQL atómicas. Validan permisos por
-- rol y sucursal internamente (aunque sean SECURITY DEFINER, no confían solo en
-- la RLS). Cada una actualiza stock + kardex + auditoría en una sola transacción.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Autoriza una escritura sobre una sucursal para ciertos roles.
create or replace function public.require_branch_role(
  p_branch_id uuid,
  p_roles public.user_role[]
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_super_admin()
     and not (public.user_has_branch_access(p_branch_id) and public.user_has_role(p_roles)) then
    raise exception 'No tienes permisos para operar esta sucursal';
  end if;
end;
$$;

-- Aplica un delta al stock (positivo=entrada, negativo=salida) con control de no-negativos.
create or replace function public.apply_stock_delta(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_delta numeric
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current numeric := 0;
begin
  select quantity into v_current
  from public.stock_levels
  where branch_id = p_branch_id and item_type = p_item_type and item_id = p_item_id
  for update;

  if not found then
    v_current := 0;
  end if;

  if v_current + p_delta < 0 then
    raise exception 'Stock insuficiente (disponible: %)', v_current;
  end if;

  insert into public.stock_levels (branch_id, item_type, item_id, quantity)
  values (p_branch_id, p_item_type, p_item_id, v_current + p_delta)
  on conflict (branch_id, item_type, item_id)
  do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

-- Registra un movimiento de kardex.
create or replace function public.insert_inventory_movement(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_movement_type public.movement_type,
  p_quantity numeric,
  p_reference_type text,
  p_reference_id uuid default null,
  p_motivo text default null,
  p_unit_cost numeric default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.inventory_movements
    (branch_id, item_type, item_id, movement_type, quantity, reference_type, reference_id, motivo, unit_cost, created_by)
  values
    (p_branch_id, p_item_type, p_item_id, p_movement_type, p_quantity, p_reference_type, p_reference_id, p_motivo, p_unit_cost, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajuste de stock y mermas
-- ---------------------------------------------------------------------------
create or replace function public.registrar_ajuste_stock(
  p_branch_id uuid,
  p_item_type public.inventory_item_type,
  p_item_id uuid,
  p_quantity numeric,          -- delta: positivo = entrada, negativo = salida
  p_movement_type public.movement_type,  -- 'AJUSTE' o 'MERMA'
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  if p_movement_type not in ('AJUSTE', 'MERMA') then
    raise exception 'Tipo de movimiento inválido';
  end if;
  if p_quantity = 0 then
    raise exception 'La cantidad no puede ser 0';
  end if;
  if p_movement_type = 'MERMA' and p_quantity > 0 then
    raise exception 'Las mermas siempre descuentan stock (usa cantidad negativa)';
  end if;

  perform public.apply_stock_delta(p_branch_id, p_item_type, p_item_id, p_quantity);
  perform public.insert_inventory_movement(
    p_branch_id, p_item_type, p_item_id, p_movement_type, p_quantity, 'ajuste', null, p_motivo, null
  );
  perform public.record_audit(
    'AJUSTE_STOCK', p_item_type::text, p_item_id, p_branch_id,
    jsonb_build_object('cantidad', p_quantity, 'tipo', p_movement_type::text, 'motivo', p_motivo)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Transferencias
-- ---------------------------------------------------------------------------
create or replace function public.enviar_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
  v_item record;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'SOLICITADO' then
    raise exception 'La transferencia ya fue procesada';
  end if;
  perform public.require_branch_role(v_transfer.from_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  for v_item in select * from public.transfer_items where transfer_id = p_transfer_id loop
    perform public.apply_stock_delta(v_transfer.from_branch_id, v_item.item_type, v_item.item_id, -v_item.quantity);
    perform public.insert_inventory_movement(
      v_transfer.from_branch_id, v_item.item_type, v_item.item_id, 'TRANSFERENCIA', -v_item.quantity, 'transferencia', p_transfer_id, null, null
    );
  end loop;

  update public.transfers set status = 'ENVIADO', enviado_at = now(), enviado_por = auth.uid()
  where id = p_transfer_id;

  perform public.record_audit('TRANSFERENCIA_ENVIADA', 'transferencia', p_transfer_id, v_transfer.from_branch_id);
end;
$$;

create or replace function public.recibir_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
  v_item record;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'ENVIADO' then
    raise exception 'La transferencia debe estar ENVIADA para recibirse';
  end if;
  perform public.require_branch_role(v_transfer.to_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  for v_item in select * from public.transfer_items where transfer_id = p_transfer_id loop
    perform public.apply_stock_delta(v_transfer.to_branch_id, v_item.item_type, v_item.item_id, v_item.quantity);
    perform public.insert_inventory_movement(
      v_transfer.to_branch_id, v_item.item_type, v_item.item_id, 'TRANSFERENCIA', v_item.quantity, 'transferencia', p_transfer_id, null, null
    );
    update public.transfer_items set received_quantity = quantity where id = v_item.id;
  end loop;

  update public.transfers set status = 'RECIBIDO', recibido_at = now(), recibido_por = auth.uid()
  where id = p_transfer_id;

  perform public.record_audit('TRANSFERENCIA_RECIBIDA', 'transferencia', p_transfer_id, v_transfer.to_branch_id);
end;
$$;

create or replace function public.cancelar_transferencia(p_transfer_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_transfer public.transfers%rowtype;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transferencia no encontrada'; end if;
  if v_transfer.status <> 'SOLICITADO' then
    raise exception 'Solo se pueden cancelar transferencias en estado SOLICITADO';
  end if;
  perform public.require_branch_role(v_transfer.from_branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  update public.transfers set status = 'CANCELADO' where id = p_transfer_id;
  perform public.record_audit('TRANSFERENCIA_CANCELADA', 'transferencia', p_transfer_id, v_transfer.from_branch_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Producción
-- ---------------------------------------------------------------------------
create or replace function public.completar_produccion(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.production_orders%rowtype;
  v_recipe public.recipes%rowtype;
  v_item record;
  v_scale numeric;
begin
  select * into v_order from public.production_orders where id = p_order_id for update;
  if not found then raise exception 'Orden de producción no encontrada'; end if;
  if v_order.status not in ('PENDIENTE', 'EN_PROCESO') then
    raise exception 'La orden ya fue completada o cancelada';
  end if;
  perform public.require_branch_role(v_order.branch_id, array['ADMIN_SUCURSAL','PRODUCCION']::public.user_role[]);

  select * into v_recipe from public.recipes where id = v_order.recipe_id;
  if not found then raise exception 'Receta no encontrada'; end if;
  if v_recipe.rendimiento <= 0 then raise exception 'La receta no tiene rendimiento válido'; end if;

  v_scale := v_order.quantity / v_recipe.rendimiento;

  -- Descuenta insumos según la receta escalada.
  for v_item in select * from public.recipe_items where recipe_id = v_order.recipe_id loop
    perform public.apply_stock_delta(v_order.branch_id, 'INSUMO', v_item.supply_id, -(v_item.cantidad * v_scale));
    perform public.insert_inventory_movement(
      v_order.branch_id, 'INSUMO', v_item.supply_id, 'PRODUCCION', -(v_item.cantidad * v_scale), 'produccion', p_order_id, null, null
    );
  end loop;

  -- Suma producto terminado.
  perform public.apply_stock_delta(v_order.branch_id, 'PRODUCTO', v_order.product_id, v_order.quantity);
  perform public.insert_inventory_movement(
    v_order.branch_id, 'PRODUCTO', v_order.product_id, 'PRODUCCION', v_order.quantity, 'produccion', p_order_id, null, null
  );

  update public.production_orders
  set status = 'COMPLETADA', completed_at = now(), completed_by = auth.uid()
  where id = p_order_id;

  perform public.record_audit('PRODUCCION_COMPLETADA', 'produccion', p_order_id, v_order.branch_id);
end;
$$;

-- >>> 20260101000006_rpc_ventas_caja.sql

-- =============================================================================
-- PIERO'S — Migración 6: RPC de ventas y caja
-- =============================================================================
-- `registrar_venta` es la operación crítica del POS: crea la venta, resuelve
-- precios desde la BD, descuenta stock, registra pagos y actualiza la caja en
-- una sola transacción. La anulación revierte stock y efectivo.

-- ---------------------------------------------------------------------------
-- Registrar venta
-- ---------------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_branch_id uuid,
  p_items jsonb,        -- [{product_id, variant_id, cantidad}]
  p_payments jsonb,     -- [{method, amount, referencia}]
  p_descuento numeric default 0,
  p_tipo_consumo public.consumption_type default 'LOCAL',
  p_customer_id uuid default null,
  p_notas text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_numero int;
  v_serie text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item record;
  v_pay record;
  v_price numeric;
  v_line numeric;
  v_payments_sum numeric := 0;
  v_register_id uuid;
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select serie_boleta into v_serie from public.branches where id = p_branch_id;
  select coalesce(max(numero), 0) + 1 into v_numero from public.sales where branch_id = p_branch_id;

  -- Subtotal desde precios configurados en BD (no se confía en el cliente).
  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, cantidad numeric) loop
    if v_item.cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select price into v_price
    from public.prices_by_branch
    where product_id = v_item.product_id
      and branch_id = p_branch_id
      and variant_id is not distinct from v_item.variant_id
    limit 1;

    if v_price is null then
      raise exception 'No hay precio configurado para el producto en esta sucursal';
    end if;

    v_line := v_price * v_item.cantidad;
    v_subtotal := v_subtotal + v_line;

    insert into public.sale_items (sale_id, product_id, variant_id, cantidad, precio_unitario, subtotal)
    values (v_sale_id, v_item.product_id, v_item.variant_id, v_item.cantidad, v_price, v_line);
  end loop;

  if p_descuento < 0 or p_descuento > v_subtotal then
    raise exception 'Descuento inválido';
  end if;
  v_total := v_subtotal - p_descuento;

  -- Validar que los pagos cubran exactamente el total.
  for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
    if v_pay.amount <= 0 then
      raise exception 'Monto de pago inválido';
    end if;
    v_payments_sum := v_payments_sum + v_pay.amount;
  end loop;

  if abs(v_payments_sum - v_total) > 0.01 then
    raise exception 'El total pagado no coincide con el total de la venta';
  end if;

  insert into public.sales
    (id, branch_id, serie, numero, customer_id, cashier_id, subtotal, descuento, igv, total, tipo_consumo, notas, status)
  values
    (v_sale_id, p_branch_id, v_serie, v_numero, p_customer_id, auth.uid(), v_subtotal, p_descuento, 0, v_total, p_tipo_consumo, p_notas, 'COMPLETADA');

  for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
    insert into public.payments (sale_id, method, amount, referencia)
    values (v_sale_id, v_pay.method, v_pay.amount, v_pay.referencia);
  end loop;

  -- Descuento de stock (producto terminado).
  for v_item in select product_id, sum(cantidad) as cantidad
    from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, cantidad numeric)
    group by product_id loop
    perform public.apply_stock_delta(p_branch_id, 'PRODUCTO', v_item.product_id, -v_item.cantidad);
    perform public.insert_inventory_movement(
      p_branch_id, 'PRODUCTO', v_item.product_id, 'VENTA', -v_item.cantidad, 'venta', v_sale_id, null, null
    );
  end loop;

  -- Caja: registrar ingresos en efectivo (los medios digitales no entran al cajón).
  select id into v_register_id from public.cash_registers
  where branch_id = p_branch_id and status = 'ABIERTA' limit 1;

  if v_register_id is not null then
    for v_pay in select * from jsonb_to_recordset(p_payments) as x(method public.payment_method, amount numeric, referencia text) loop
      if v_pay.method = 'EFECTIVO' then
        insert into public.cash_movements (cash_register_id, tipo, monto, motivo, referencia, sale_id, created_by)
        values (v_register_id, 'INGRESO', v_pay.amount, 'Venta', v_serie || '-' || v_numero::text, v_sale_id, auth.uid());
      end if;
    end loop;
  end if;

  perform public.record_audit('VENTA_REGISTRADA', 'venta', v_sale_id, p_branch_id,
    jsonb_build_object('total', v_total, 'numero', v_numero));

  return jsonb_build_object(
    'id', v_sale_id, 'numero', v_numero, 'serie', v_serie,
    'subtotal', v_subtotal, 'descuento', p_descuento, 'total', v_total
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Anular venta (requiere ADMIN_SUCURSAL)
-- ---------------------------------------------------------------------------
create or replace function public.anular_venta(p_sale_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_register_id uuid;
  v_efectivo numeric := 0;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if v_sale.status <> 'COMPLETADA' then raise exception 'La venta ya fue anulada'; end if;
  perform public.require_branch_role(v_sale.branch_id, array['ADMIN_SUCURSAL']::public.user_role[]);

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    perform public.apply_stock_delta(v_sale.branch_id, 'PRODUCTO', v_item.product_id, v_item.cantidad);
    perform public.insert_inventory_movement(
      v_sale.branch_id, 'PRODUCTO', v_item.product_id, 'AJUSTE', v_item.cantidad, 'venta', p_sale_id, 'Anulación de venta', null
    );
  end loop;

  select id into v_register_id from public.cash_registers
  where branch_id = v_sale.branch_id and status = 'ABIERTA' limit 1;

  if v_register_id is not null then
    select coalesce(sum(amount), 0) into v_efectivo from public.payments where sale_id = p_sale_id and method = 'EFECTIVO';
    if v_efectivo > 0 then
      insert into public.cash_movements (cash_register_id, tipo, monto, motivo, referencia, sale_id, created_by)
      values (v_register_id, 'EGRESO', v_efectivo, 'Anulación de venta', v_sale.serie || '-' || v_sale.numero::text, p_sale_id, auth.uid());
    end if;
  end if;

  update public.sales set status = 'ANULADA', updated_at = now() where id = p_sale_id;
  perform public.record_audit('VENTA_ANULADA', 'venta', p_sale_id, v_sale.branch_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Caja: apertura, cierre y movimientos manuales
-- ---------------------------------------------------------------------------
create or replace function public.abrir_caja(p_branch_id uuid, p_monto_inicial numeric default 0)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_existing uuid;
  v_id uuid := gen_random_uuid();
begin
  perform public.require_branch_role(p_branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select id into v_existing from public.cash_registers where branch_id = p_branch_id and status = 'ABIERTA' limit 1;
  if v_existing is not null then raise exception 'Ya existe una caja abierta para esta sucursal'; end if;

  insert into public.cash_registers (id, branch_id, abierto_por, monto_inicial, abierto_at, status)
  values (v_id, p_branch_id, auth.uid(), p_monto_inicial, now(), 'ABIERTA');

  perform public.record_audit('CAJA_ABIERTA', 'caja', v_id, p_branch_id, jsonb_build_object('monto_inicial', p_monto_inicial));
  return v_id;
end;
$$;

create or replace function public.cerrar_caja(
  p_cash_register_id uuid,
  p_monto_real numeric,
  p_justificacion text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_reg public.cash_registers%rowtype;
  v_ingresos numeric;
  v_egresos numeric;
  v_esperado numeric;
  v_diferencia numeric;
begin
  select * into v_reg from public.cash_registers where id = p_cash_register_id for update;
  if not found then raise exception 'Caja no encontrada'; end if;
  if v_reg.status <> 'ABIERTA' then raise exception 'La caja ya está cerrada'; end if;
  perform public.require_branch_role(v_reg.branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  select coalesce(sum(monto), 0) into v_ingresos from public.cash_movements where cash_register_id = p_cash_register_id and tipo = 'INGRESO';
  select coalesce(sum(monto), 0) into v_egresos from public.cash_movements where cash_register_id = p_cash_register_id and tipo = 'EGRESO';
  v_esperado := v_reg.monto_inicial + v_ingresos - v_egresos;
  v_diferencia := p_monto_real - v_esperado;

  update public.cash_registers
  set status = 'CERRADA', cerrado_por = auth.uid(), cerrado_at = now(),
      monto_esperado = v_esperado, monto_real = p_monto_real, diferencia = v_diferencia, justificacion = p_justificacion
  where id = p_cash_register_id;

  perform public.record_audit('CAJA_CERRADA', 'caja', p_cash_register_id, v_reg.branch_id,
    jsonb_build_object('esperado', v_esperado, 'real', p_monto_real, 'diferencia', v_diferencia));

  return jsonb_build_object('esperado', v_esperado, 'real', p_monto_real, 'diferencia', v_diferencia);
end;
$$;

create or replace function public.registrar_movimiento_caja(
  p_cash_register_id uuid,
  p_tipo public.cash_movement_type,
  p_monto numeric,
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_reg public.cash_registers%rowtype;
begin
  select * into v_reg from public.cash_registers where id = p_cash_register_id for update;
  if not found then raise exception 'Caja no encontrada'; end if;
  if v_reg.status <> 'ABIERTA' then raise exception 'La caja está cerrada'; end if;
  perform public.require_branch_role(v_reg.branch_id, array['ADMIN_SUCURSAL','CAJERO']::public.user_role[]);

  if p_monto <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;

  insert into public.cash_movements (cash_register_id, tipo, monto, motivo, created_by)
  values (p_cash_register_id, p_tipo, p_monto, p_motivo, auth.uid());

  perform public.record_audit('CAJA_MOVIMIENTO', 'caja', p_cash_register_id, v_reg.branch_id,
    jsonb_build_object('tipo', p_tipo::text, 'monto', p_monto, 'motivo', p_motivo));
end;
$$;

-- >>> 20260101000007_rpc_compras.sql

-- =============================================================================
-- PIERO'S — Migración 7: RPC de compras (recepción de mercadería)
-- =============================================================================
-- Al recibir una orden de compra: suma stock de insumos, actualiza el costo del
-- insumo y registra el kardex, todo en una transacción.

create or replace function public.recibir_compra(p_purchase_order_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_item record;
begin
  select * into v_po from public.purchase_orders where id = p_purchase_order_id for update;
  if not found then raise exception 'Orden de compra no encontrada'; end if;
  if v_po.status <> 'EMITIDA' then
    raise exception 'La orden debe estar EMITIDA para recibirse';
  end if;
  perform public.require_branch_role(v_po.branch_id, array['ADMIN_SUCURSAL']::public.user_role[]);

  for v_item in select * from public.purchase_items where purchase_order_id = p_purchase_order_id loop
    perform public.apply_stock_delta(v_po.branch_id, 'INSUMO', v_item.supply_id, v_item.cantidad);
    perform public.insert_inventory_movement(
      v_po.branch_id, 'INSUMO', v_item.supply_id, 'COMPRA', v_item.cantidad,
      'compra', p_purchase_order_id, null, v_item.costo_unitario
    );
    -- Actualiza el costo del insumo al último costo de compra.
    update public.supplies set costo = v_item.costo_unitario where id = v_item.supply_id;
  end loop;

  update public.purchase_orders set status = 'RECIBIDA', recibida_at = now() where id = p_purchase_order_id;

  perform public.record_audit('COMPRA_RECIBIDA', 'compra', p_purchase_order_id, v_po.branch_id);
end;
$$;

-- >>> 20260101000008_perfiles_admin.sql

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
