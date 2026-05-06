-- Brands carousel: table, storage upload rules, dashboard-secret RPCs for admin.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.onurik_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text not null default '',
  logo_storage_path text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint onurik_brands_name_nonempty check (char_length(trim(name)) > 0)
);

create index if not exists onurik_brands_carousel_idx
  on public.onurik_brands (visible, sort_order);

create or replace function public.onurik_brands_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists onurik_brands_set_updated_at on public.onurik_brands;
create trigger onurik_brands_set_updated_at
  before update on public.onurik_brands
  for each row execute function public.onurik_brands_set_updated_at();

-- ---------------------------------------------------------------------------
-- Bucket (public read logos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onurik-brand-logos', 'onurik-brand-logos', true,
  5242880, array['image/png','image/jpeg','image/svg+xml']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS: public sees visible brands only
-- ---------------------------------------------------------------------------
alter table public.onurik_brands enable row level security;

drop policy if exists onurik_brands_public_read on public.onurik_brands;
create policy onurik_brands_public_read on public.onurik_brands
  for select to anon, authenticated
  using (visible = true);

-- No direct writes for anon — admin uses SECURITY DEFINER RPCs

-- ---------------------------------------------------------------------------
-- Storage: public read; anon upload only under an existing brand row id folder
-- ---------------------------------------------------------------------------
drop policy if exists storage_onurik_brands_public_read on storage.objects;
create policy storage_onurik_brands_public_read on storage.objects
  for select to public
  using (bucket_id = 'onurik-brand-logos');

drop policy if exists storage_onurik_brands_anon_insert on storage.objects;
create policy storage_onurik_brands_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'onurik-brand-logos'
    and exists (
      select 1 from public.onurik_brands b
      where b.id::text = split_part(name, '/', 1)
    )
  );

-- ---------------------------------------------------------------------------
-- Secret helper (same source as inbox dashboard)
-- ---------------------------------------------------------------------------
create or replace function public.onurik_dashboard_brands_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      trim(both from coalesce(s.value #>> '{}', '')) is not null
      and length(trim(both from coalesce(s.value #>> '{}', ''))) > 0
      and trim(both from p_secret) = trim(both from coalesce(s.value #>> '{}', ''))
    from public.onurik_site_settings s
    where s.key = 'dashboard_read_secret'
  ), false);
$$;

revoke all on function public.onurik_dashboard_brands_secret_ok(text) from public;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.onurik_dashboard_brands_all(p_secret text)
returns setof public.onurik_brands
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  return query
    select b.*
    from public.onurik_brands b
    order by b.sort_order asc, b.created_at asc;
end;
$$;

create or replace function public.onurik_dashboard_brand_create_draft(p_secret text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
  v_id uuid;
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;
  select coalesce(max(sort_order), 0) + 1 into v_next from public.onurik_brands;
  insert into public.onurik_brands (name, logo_url, visible, sort_order)
  values (trim(p_name), '', false, v_next)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.onurik_dashboard_brand_set_logo(
  p_secret text,
  p_id uuid,
  p_logo_url text,
  p_logo_storage_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  update public.onurik_brands
  set
    logo_url = coalesce(nullif(trim(p_logo_url), ''), logo_url),
    logo_storage_path = p_logo_storage_path,
    visible = true
  where id = p_id;
  if not found then
    raise exception 'brand not found';
  end if;
end;
$$;

create or replace function public.onurik_dashboard_brand_patch(
  p_secret text,
  p_id uuid,
  p_name text default null,
  p_visible boolean default null,
  p_sort_order integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  update public.onurik_brands
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    visible = coalesce(p_visible, visible),
    sort_order = coalesce(p_sort_order, sort_order)
  where id = p_id;
  if not found then
    raise exception 'brand not found';
  end if;
end;
$$;

create or replace function public.onurik_dashboard_brand_delete(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  p text;
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  select logo_storage_path into p from public.onurik_brands where id = p_id;
  if p is not null and length(trim(p)) > 0 then
    delete from storage.objects
    where bucket_id = 'onurik-brand-logos'
      and name = p;
  end if;
  delete from public.onurik_brands where id = p_id;
end;
$$;

revoke all on function public.onurik_dashboard_brands_all(text) from public;
grant execute on function public.onurik_dashboard_brands_all(text) to anon, authenticated;

revoke all on function public.onurik_dashboard_brand_create_draft(text, text) from public;
grant execute on function public.onurik_dashboard_brand_create_draft(text, text) to anon, authenticated;

revoke all on function public.onurik_dashboard_brand_set_logo(text, uuid, text, text) from public;
grant execute on function public.onurik_dashboard_brand_set_logo(text, uuid, text, text) to anon, authenticated;

revoke all on function public.onurik_dashboard_brand_patch(text, uuid, text, boolean, integer) from public;
grant execute on function public.onurik_dashboard_brand_patch(text, uuid, text, boolean, integer) to anon, authenticated;

revoke all on function public.onurik_dashboard_brand_delete(text, uuid) from public;
grant execute on function public.onurik_dashboard_brand_delete(text, uuid) to anon, authenticated;

commit;
