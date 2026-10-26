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
