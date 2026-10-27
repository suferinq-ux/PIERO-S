-- =============================================================================
-- PIERO'S — Test de aislamiento RLS entre sucursales (pgTAP)
-- =============================================================================
-- Ejecutar con: supabase test db  (requiere `supabase start` local).
-- Crea dos sucursales y dos administradores, y verifica que cada uno sólo ve
-- los datos de su sucursal.
-- =============================================================================

begin;
select plan(6);

-- ---------------------------------------------------------------------------
-- Setup como superusuario (bypass RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'admin-a@test.pe', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'admin-b@test.pe', now(), now(), now());

update public.users_profiles set role = 'ADMIN_SUCURSAL'
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.branches (id, nombre, codigo) values
  ('a0000000-0000-0000-0000-000000000001', 'Sucursal A', 'A'),
  ('b0000000-0000-0000-0000-000000000002', 'Sucursal B', 'B');

insert into public.user_branches (user_id, branch_id) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000002');

insert into public.categories (id, nombre) values ('c0000000-0000-0000-0000-000000000001', 'Cat');
insert into public.products (id, category_id, nombre)
values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Producto');

insert into public.stock_levels (branch_id, item_type, item_id, quantity) values
  ('a0000000-0000-0000-0000-000000000001', 'PRODUCTO', 'd0000000-0000-0000-0000-000000000001', 10),
  ('b0000000-0000-0000-0000-000000000002', 'PRODUCTO', 'd0000000-0000-0000-0000-000000000001', 20);

-- ---------------------------------------------------------------------------
-- Administrador A
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.branches), 1::bigint, 'admin A ve 1 sucursal');
select is((select nombre from public.branches), 'Sucursal A', 'admin A ve su sucursal');
select is((select count(*) from public.stock_levels), 1::bigint, 'admin A ve 1 stock');

reset role;

-- ---------------------------------------------------------------------------
-- Administrador B
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*) from public.branches), 1::bigint, 'admin B ve 1 sucursal');
select is((select nombre from public.branches), 'Sucursal B', 'admin B ve su sucursal');
select is((select quantity from public.stock_levels), 20::numeric, 'admin B ve su stock');

reset role;

select * from finish();
rollback;
