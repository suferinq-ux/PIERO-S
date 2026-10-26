-- =============================================================================
-- PIERO'S — Tests de seguridad RLS (pgTAP)
-- =============================================================================
-- Ejecutar con: supabase test db   (requiere la extensión pgtap)
-- Docs: https://supabase.com/docs/guides/cli/testing-and-linting
-- =============================================================================

begin;
select plan(1);
select * from no_plan();

-- 1. Tablas con Row Level Security activada
select has_rls('public', 'branches', 'branches tiene RLS');
select has_rls('public', 'users_profiles', 'users_profiles tiene RLS');
select has_rls('public', 'user_branches', 'user_branches tiene RLS');
select has_rls('public', 'categories', 'categories tiene RLS');
select has_rls('public', 'products', 'products tiene RLS');
select has_rls('public', 'product_variants', 'product_variants tiene RLS');
select has_rls('public', 'prices_by_branch', 'prices_by_branch tiene RLS');
select has_rls('public', 'supplies', 'supplies tiene RLS');
select has_rls('public', 'recipes', 'recipes tiene RLS');
select has_rls('public', 'recipe_items', 'recipe_items tiene RLS');
select has_rls('public', 'stock_levels', 'stock_levels tiene RLS');
select has_rls('public', 'inventory_movements', 'inventory_movements tiene RLS');
select has_rls('public', 'transfers', 'transfers tiene RLS');
select has_rls('public', 'transfer_items', 'transfer_items tiene RLS');
select has_rls('public', 'production_orders', 'production_orders tiene RLS');
select has_rls('public', 'sales', 'sales tiene RLS');
select has_rls('public', 'sale_items', 'sale_items tiene RLS');
select has_rls('public', 'payments', 'payments tiene RLS');
select has_rls('public', 'cash_registers', 'cash_registers tiene RLS');
select has_rls('public', 'cash_movements', 'cash_movements tiene RLS');
select has_rls('public', 'customers', 'customers tiene RLS');
select has_rls('public', 'orders_custom', 'orders_custom tiene RLS');
select has_rls('public', 'order_payments', 'order_payments tiene RLS');
select has_rls('public', 'suppliers', 'suppliers tiene RLS');
select has_rls('public', 'purchase_orders', 'purchase_orders tiene RLS');
select has_rls('public', 'purchase_items', 'purchase_items tiene RLS');
select has_rls('public', 'expenses', 'expenses tiene RLS');
select has_rls('public', 'audit_logs', 'audit_logs tiene RLS');

-- 2. Políticas de acceso por sucursal
select policies_are('public', 'branches', array['branches_select','branches_insert','branches_update','branches_delete'], 'branches tiene políticas por operación');
select policies_are('public', 'sales', array['sales_select','sales_insert','sales_update','sales_delete'], 'sales tiene políticas por operación');
select policies_are('public', 'cash_registers', array['cash_select','cash_write'], 'cash_registers tiene políticas');

-- 3. Funciones de seguridad existen
select has_function('public', 'is_super_admin', 'is_super_admin existe');
select has_function('public', 'user_has_branch_access', 'user_has_branch_access existe');
select has_function('public', 'current_user_role', 'current_user_role existe');
select has_function('public', 'get_user_branch_ids', 'get_user_branch_ids existe');
select has_function('public', 'user_has_role', 'user_has_role existe');

-- 4. Trigger de protección de rol
select has_trigger('public', 'users_profiles', 'trig_proteger_rol_perfil', 'trigger de protección de rol existe');

-- 5. El rol default de un perfil nuevo es mínimo privilegio
select col_default_is('public', 'users_profiles', 'role', 'VENDEDOR_SOLO_LECTURA'::public.user_role, 'rol por defecto es VENDEDOR_SOLO_LECTURA');

select * from finish();
rollback;
