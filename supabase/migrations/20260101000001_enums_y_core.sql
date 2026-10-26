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
