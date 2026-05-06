-- Fix storage upload RLS: the insert policy subquery on onurik_brands ran as anon and
-- could not see draft rows (visible = false), so uploads to {brand_id}/logo.ext always failed.

begin;

create or replace function public.onurik_brand_id_exists_for_storage(p_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.onurik_brands b
    where b.id::text = nullif(trim(both from p_id), '')
  );
$$;

revoke all on function public.onurik_brand_id_exists_for_storage(text) from public;
grant execute on function public.onurik_brand_id_exists_for_storage(text) to anon, authenticated;

drop policy if exists storage_onurik_brands_anon_insert on storage.objects;
create policy storage_onurik_brands_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'onurik-brand-logos'
    and public.onurik_brand_id_exists_for_storage(split_part(name, '/', 1))
  );

-- Upsert may UPDATE an existing object; mirror the same rule.
drop policy if exists storage_onurik_brands_anon_update on storage.objects;
create policy storage_onurik_brands_anon_update on storage.objects
  for update to anon, authenticated
  using (
    bucket_id = 'onurik-brand-logos'
    and public.onurik_brand_id_exists_for_storage(split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'onurik-brand-logos'
    and public.onurik_brand_id_exists_for_storage(split_part(name, '/', 1))
  );

commit;
