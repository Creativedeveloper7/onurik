-- Projects may use a normalized category dimension (`category_id`) while the app
-- sends human-readable `category` text. This migration aligns both and updates
-- `onurik_dashboard_project_upsert` so inserts never leave `category_id` null.

begin;

-- ---------------------------------------------------------------------------
-- 1) Category dimension (id matches what `onurik_projects.category_id` FK expects)
-- ---------------------------------------------------------------------------
-- A pre-existing `onurik_project_categories` table may omit `name`; CREATE TABLE
-- IF NOT EXISTS would skip, so we always align columns before seeding.

create table if not exists public.onurik_project_categories (
  id uuid primary key default gen_random_uuid()
);

alter table public.onurik_project_categories add column if not exists created_at timestamptz;
update public.onurik_project_categories
set created_at = timezone('utc', now())
where created_at is null;
alter table public.onurik_project_categories alter column created_at set default timezone('utc', now());
alter table public.onurik_project_categories alter column created_at set not null;

alter table public.onurik_project_categories add column if not exists name text;
alter table public.onurik_project_categories add column if not exists sort_order integer;

update public.onurik_project_categories
set sort_order = coalesce(sort_order, 0)
where sort_order is null;

alter table public.onurik_project_categories alter column sort_order set default 0;
alter table public.onurik_project_categories alter column sort_order set not null;

-- Backfill `name` from common legacy column names (existing Supabase shapes).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_project_categories' and column_name = 'title'
  ) then
    execute $q$
      update public.onurik_project_categories
      set name = trim(title)
      where (name is null or length(trim(name)) = 0) and title is not null and length(trim(title)) > 0
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_project_categories' and column_name = 'label'
  ) then
    execute $q$
      update public.onurik_project_categories
      set name = trim(label)
      where (name is null or length(trim(name)) = 0) and label is not null and length(trim(label)) > 0
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_project_categories' and column_name = 'display_name'
  ) then
    execute $q$
      update public.onurik_project_categories
      set name = trim(display_name)
      where (name is null or length(trim(name)) = 0) and display_name is not null and length(trim(display_name)) > 0
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_project_categories' and column_name = 'category_name'
  ) then
    execute $q$
      update public.onurik_project_categories
      set name = trim(category_name)
      where (name is null or length(trim(name)) = 0) and category_name is not null and length(trim(category_name)) > 0
    $q$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_project_categories' and column_name = 'slug'
  ) then
    execute $q$
      update public.onurik_project_categories
      set name = trim(replace(initcap(replace(trim(slug), '-', ' ')), '  ', ' '))
      where (name is null or length(trim(name)) = 0) and slug is not null and length(trim(slug)) > 0
    $q$;
  end if;
end $$;

update public.onurik_project_categories
set name = 'Legacy category ' || left(replace(id::text, '-', ''), 8)
where name is null or length(trim(name)) = 0;

-- De-duplicate display names so a unique index can be applied.
with ranked as (
  select
    id,
    name,
    row_number() over (partition by trim(lower(name)) order by id) as rn
  from public.onurik_project_categories
)
update public.onurik_project_categories c
set name = trim(c.name) || ' (' || left(replace(c.id::text, '-', ''), 6) || ')'
from ranked r
where c.id = r.id and r.rn > 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'onurik_project_categories_name_nonempty'
      and conrelid = 'public.onurik_project_categories'::regclass
  ) then
    alter table public.onurik_project_categories
      add constraint onurik_project_categories_name_nonempty check (char_length(trim(name)) > 0);
  end if;
end $$;

create unique index if not exists onurik_project_categories_name_ux
  on public.onurik_project_categories (trim(lower(name)));

insert into public.onurik_project_categories (name, sort_order)
select v.name, v.sort_order
from (
  values
    ('Standard Projects', 0),
    ('Branding & Identity', 1),
    ('Design & Art Direction', 2),
    ('Development', 3)
) as v(name, sort_order)
where not exists (
  select 1
  from public.onurik_project_categories c
  where trim(lower(c.name)) = trim(lower(v.name))
);

alter table public.onurik_project_categories alter column name set not null;

alter table public.onurik_project_categories enable row level security;

drop policy if exists onurik_project_categories_public_read on public.onurik_project_categories;
create policy onurik_project_categories_public_read on public.onurik_project_categories
  for select to anon, authenticated
  using (true);

grant select on public.onurik_project_categories to anon, authenticated;

-- Resolve / create category row by display name (used by upsert + triggers).
create or replace function public.onurik_project_category_id_for_name(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  if length(v_name) < 1 then
    v_name := 'Standard Projects';
  end if;

  select c.id into v_id
  from public.onurik_project_categories c
  where trim(lower(c.name)) = trim(lower(v_name))
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  begin
    insert into public.onurik_project_categories (name, sort_order)
    values (v_name, 999)
    returning id into v_id;
  exception
    when unique_violation then
      select c2.id into v_id
      from public.onurik_project_categories c2
      where trim(lower(c2.name)) = trim(lower(v_name))
      limit 1;
  end;

  return v_id;
end;
$$;

revoke all on function public.onurik_project_category_id_for_name(text) from public;
-- Called only from security-definer RPC / triggers; no direct client execute needed.

-- ---------------------------------------------------------------------------
-- 2) Ensure `onurik_projects.category_id` exists, backfill, wire FK to dimension
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  v_std uuid;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'onurik_projects'
      and column_name = 'category_id'
  ) then
    alter table public.onurik_projects
      add column category_id uuid;
  end if;

  -- Drop FKs that reference anything other than our dimension (dev / legacy shapes).
  for r in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = c.conkey[1]
     and a.attnum > 0
     and not a.attisdropped
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f'
      and n.nspname = 'public'
      and c.conrelid = 'public.onurik_projects'::regclass
      and a.attname = 'category_id'
      and c.confrelid is distinct from 'public.onurik_project_categories'::regclass
  loop
    execute format('alter table public.onurik_projects drop constraint %I', r.conname);
  end loop;

  select id into v_std
  from public.onurik_project_categories
  where name = 'Standard Projects'
  limit 1;

  if v_std is null then
    raise exception 'onurik_project_categories missing Standard Projects seed';
  end if;

  update public.onurik_projects p
  set category_id = c.id
  from public.onurik_project_categories c
  where p.category_id is null
    and trim(coalesce(p.category, '')) = c.name;

  update public.onurik_projects
  set category_id = v_std
  where category_id is null;

  -- Orphan ids (legacy FK target) would block adding our FK: remap by category text first.
  update public.onurik_projects p
  set category_id = c.id
  from public.onurik_project_categories c
  where not exists (
    select 1 from public.onurik_project_categories x where x.id = p.category_id
  )
    and trim(coalesce(p.category, '')) = c.name;

  update public.onurik_projects
  set category_id = v_std
  where not exists (
    select 1 from public.onurik_project_categories c where c.id = category_id
  );

  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = c.conkey[1]
     and a.attnum > 0
     and not a.attisdropped
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f'
      and n.nspname = 'public'
      and c.conrelid = 'public.onurik_projects'::regclass
      and a.attname = 'category_id'
      and c.confrelid = 'public.onurik_project_categories'::regclass
  ) then
    alter table public.onurik_projects
      add constraint onurik_projects_category_id_fkey
      foreign key (category_id) references public.onurik_project_categories (id);
  end if;

  alter table public.onurik_projects alter column category_id set not null;
end $$;

-- Keep `category` text in sync when only `category_id` is present (admin selects, imports).
create or replace function public.onurik_projects_sync_category_from_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.category_id is not null
     and (new.category is null or length(trim(new.category)) = 0) then
    select c.name into v_name
    from public.onurik_project_categories c
    where c.id = new.category_id
    limit 1;
    if v_name is not null then
      new.category := v_name;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists onurik_projects_sync_category_from_id on public.onurik_projects;
create trigger onurik_projects_sync_category_from_id
  before insert or update on public.onurik_projects
  for each row execute function public.onurik_projects_sync_category_from_id();

-- Safety net: any insert/update with text category but null id gets resolved.
create or replace function public.onurik_projects_fill_category_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category_id is null
     and new.category is not null
     and length(trim(new.category)) > 0 then
    new.category_id := public.onurik_project_category_id_for_name(new.category);
  end if;
  return new;
end;
$$;

drop trigger if exists onurik_projects_fill_category_id on public.onurik_projects;
create trigger onurik_projects_fill_category_id
  before insert or update on public.onurik_projects
  for each row execute function public.onurik_projects_fill_category_id();

-- Trigger order (BEFORE INSERT/UPDATE): PostgreSQL runs multiple triggers in name order.
-- `onurik_projects_fill_category_id` runs before `onurik_projects_sync_category_from_id`
-- so text category is turned into an id first, then missing text can be filled from id.

-- ---------------------------------------------------------------------------
-- 3) Dashboard upsert: always set category_id from the payload category name
-- ---------------------------------------------------------------------------

create or replace function public.onurik_dashboard_project_upsert(
  p_secret text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_title text;
  v_category text;
  v_category_id uuid;
  v_tags jsonb;
  v_description text;
  v_project_url text;
  v_image text;
  v_privacy text;
  v_status text;
  v_sort integer;
  v_created timestamptz;
  v_updated timestamptz;
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;

  v_id := trim(coalesce(p_payload->>'id', ''));
  if length(v_id) < 1 then
    raise exception 'id required';
  end if;

  v_title := trim(coalesce(p_payload->>'title', ''));
  v_category := trim(coalesce(p_payload->>'category', p_payload->>'category_of', ''));
  if length(v_title) < 1 or length(v_category) < 1 then
    raise exception 'title and category required';
  end if;

  -- Always derive from display name so changing category in the admin cannot leave a stale uuid.
  v_category_id := public.onurik_project_category_id_for_name(v_category);

  if jsonb_typeof(p_payload->'tags') = 'array' then
    v_tags := p_payload->'tags';
  else
    v_tags := '[]'::jsonb;
  end if;

  v_description := coalesce(p_payload->>'description', '');
  v_project_url := trim(coalesce(p_payload->>'projectUrl', p_payload->>'project_url', ''));
  v_image := coalesce(p_payload->>'image', '');

  if trim(lower(coalesce(p_payload->>'privacy', 'public'))) = 'private' then
    v_privacy := 'private';
  else
    v_privacy := 'public';
  end if;

  if trim(lower(coalesce(p_payload->>'status', 'published'))) = 'draft' then
    v_status := 'draft';
  else
    v_status := 'published';
  end if;

  v_sort := coalesce(
    nullif((p_payload->>'sortOrder'), '')::integer,
    nullif((p_payload->>'sort_order'), '')::integer,
    0
  );

  if p_payload ? 'createdAt' and nullif(trim(p_payload->>'createdAt'), '') is not null then
    v_created := to_timestamp((trim(p_payload->>'createdAt'))::numeric / 1000.0) at time zone 'utc';
  else
    v_created := timezone('utc', now());
  end if;

  if p_payload ? 'updatedAt' and nullif(trim(p_payload->>'updatedAt'), '') is not null then
    v_updated := to_timestamp((trim(p_payload->>'updatedAt'))::numeric / 1000.0) at time zone 'utc';
  else
    v_updated := timezone('utc', now());
  end if;

  insert into public.onurik_projects (
    id, title, category, category_id, tags, description, project_url, image,
    privacy, status, sort_order, created_at, updated_at
  )
  values (
    v_id, v_title, v_category, v_category_id, v_tags, v_description, v_project_url, v_image,
    v_privacy, v_status, v_sort, v_created, v_updated
  )
  on conflict (id) do update set
    title = excluded.title,
    category = excluded.category,
    category_id = excluded.category_id,
    tags = excluded.tags,
    description = excluded.description,
    project_url = excluded.project_url,
    image = excluded.image,
    privacy = excluded.privacy,
    status = excluded.status,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;
end;
$$;

commit;
