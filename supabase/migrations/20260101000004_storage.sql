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
