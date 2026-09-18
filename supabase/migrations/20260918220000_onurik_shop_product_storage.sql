-- Product image storage + catalog wipe RPC. Public can read files; uploads
-- are allowed only under an existing product id folder (same pattern as brands).

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onurik-shop-products',
  'onurik-shop-products',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.onurik_shop_product_id_exists_for_storage(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.onurik_shop_products p
    where p.id = nullif(trim(both from p_id), '')
  );
$$;

revoke all on function public.onurik_shop_product_id_exists_for_storage(text) from public;
grant execute on function public.onurik_shop_product_id_exists_for_storage(text) to anon, authenticated;

drop policy if exists storage_onurik_shop_products_public_read on storage.objects;
create policy storage_onurik_shop_products_public_read on storage.objects
  for select to public
  using (bucket_id = 'onurik-shop-products');

drop policy if exists storage_onurik_shop_products_anon_insert on storage.objects;
create policy storage_onurik_shop_products_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'onurik-shop-products'
    and public.onurik_shop_product_id_exists_for_storage(split_part(name, '/', 1))
  );

drop policy if exists storage_onurik_shop_products_anon_update on storage.objects;
create policy storage_onurik_shop_products_anon_update on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'onurik-shop-products'
    and public.onurik_shop_product_id_exists_for_storage(split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'onurik-shop-products'
    and public.onurik_shop_product_id_exists_for_storage(split_part(name, '/', 1))
  );

drop policy if exists storage_onurik_shop_products_anon_delete on storage.objects;
create policy storage_onurik_shop_products_anon_delete on storage.objects
  for delete to anon, authenticated
  using (
    bucket_id = 'onurik-shop-products'
    and public.onurik_shop_product_id_exists_for_storage(split_part(name, '/', 1))
  );

create or replace function public.onurik_dashboard_shop_product_delete(
  p_secret text,
  p_id text
)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  delete from storage.objects
  where bucket_id = 'onurik-shop-products'
    and name like trim(p_id) || '/%';
  delete from public.onurik_shop_products where id = trim(p_id);
end;
$$;

create or replace function public.onurik_dashboard_shop_products_clear(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  delete from storage.objects where bucket_id = 'onurik-shop-products';
  delete from public.onurik_shop_products;
end;
$$;

revoke all on function public.onurik_dashboard_shop_product_delete(text, text) from public;
grant execute on function public.onurik_dashboard_shop_product_delete(text, text) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_products_clear(text) from public;
grant execute on function public.onurik_dashboard_shop_products_clear(text) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.onurik_shop_products;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

commit;
