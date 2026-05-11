-- Hardening migration for projects uploads across old/new schemas.
-- Fixes legacy column mismatch (`category_of` vs `category`) and ensures
-- dashboard upsert accepts both payload keys.

begin;

create table if not exists public.onurik_projects (
  id text primary key,
  title text not null,
  category text not null default 'Standard Projects',
  tags jsonb not null default '[]'::jsonb,
  description text not null default '',
  project_url text not null default '',
  image text not null default '',
  privacy text not null default 'public',
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.onurik_projects add column if not exists title text;
alter table public.onurik_projects add column if not exists category text;
alter table public.onurik_projects add column if not exists tags jsonb;
alter table public.onurik_projects add column if not exists description text;
alter table public.onurik_projects add column if not exists project_url text;
alter table public.onurik_projects add column if not exists image text;
alter table public.onurik_projects add column if not exists privacy text;
alter table public.onurik_projects add column if not exists status text;
alter table public.onurik_projects add column if not exists sort_order integer;
alter table public.onurik_projects add column if not exists created_at timestamptz;
alter table public.onurik_projects add column if not exists updated_at timestamptz;

update public.onurik_projects set title = coalesce(nullif(trim(title), ''), '(untitled)');
update public.onurik_projects
set category = coalesce(nullif(trim(category), ''), 'Standard Projects');
update public.onurik_projects set tags = coalesce(tags, '[]'::jsonb);
update public.onurik_projects set description = coalesce(description, '');
update public.onurik_projects set project_url = coalesce(project_url, '');
update public.onurik_projects set image = coalesce(image, '');
update public.onurik_projects set privacy = case
  when trim(lower(coalesce(privacy, ''))) = 'private' then 'private'
  else 'public'
end;
update public.onurik_projects set status = case
  when trim(lower(coalesce(status, ''))) = 'draft' then 'draft'
  else 'published'
end;
update public.onurik_projects set sort_order = coalesce(sort_order, 0);
update public.onurik_projects set created_at = coalesce(created_at, timezone('utc', now()));
update public.onurik_projects set updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.onurik_projects alter column title set not null;
alter table public.onurik_projects alter column category set not null;
alter table public.onurik_projects alter column category set default 'Standard Projects';
alter table public.onurik_projects alter column tags set not null;
alter table public.onurik_projects alter column tags set default '[]'::jsonb;
alter table public.onurik_projects alter column description set not null;
alter table public.onurik_projects alter column description set default '';
alter table public.onurik_projects alter column project_url set not null;
alter table public.onurik_projects alter column project_url set default '';
alter table public.onurik_projects alter column image set not null;
alter table public.onurik_projects alter column image set default '';
alter table public.onurik_projects alter column privacy set not null;
alter table public.onurik_projects alter column privacy set default 'public';
alter table public.onurik_projects alter column status set not null;
alter table public.onurik_projects alter column status set default 'draft';
alter table public.onurik_projects alter column sort_order set not null;
alter table public.onurik_projects alter column sort_order set default 0;
alter table public.onurik_projects alter column created_at set not null;
alter table public.onurik_projects alter column created_at set default timezone('utc', now());
alter table public.onurik_projects alter column updated_at set not null;
alter table public.onurik_projects alter column updated_at set default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'onurik_projects'
      and column_name = 'category_of'
  ) then
    execute $sql$
      update public.onurik_projects
      set category_of = coalesce(nullif(trim(category_of), ''), nullif(trim(category), ''), 'Standard Projects')
    $sql$;

    execute $sql$
      alter table public.onurik_projects
      alter column category_of set default 'Standard Projects'
    $sql$;

    execute $sql$
      alter table public.onurik_projects
      alter column category_of set not null
    $sql$;

    execute $sql$
      create or replace function public.onurik_projects_sync_legacy_category()
      returns trigger
      language plpgsql
      as $fn$
      begin
        if new.category is null or length(trim(new.category)) = 0 then
          new.category := coalesce(nullif(trim(new.category_of), ''), 'Standard Projects');
        end if;
        if new.category_of is null or length(trim(new.category_of)) = 0 then
          new.category_of := coalesce(nullif(trim(new.category), ''), 'Standard Projects');
        end if;
        return new;
      end;
      $fn$
    $sql$;

    execute 'drop trigger if exists onurik_projects_sync_legacy_category on public.onurik_projects';
    execute $sql$
      create trigger onurik_projects_sync_legacy_category
      before insert or update on public.onurik_projects
      for each row execute function public.onurik_projects_sync_legacy_category()
    $sql$;
  else
    drop trigger if exists onurik_projects_sync_legacy_category on public.onurik_projects;
    drop function if exists public.onurik_projects_sync_legacy_category();
  end if;
end $$;

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
    id, title, category, tags, description, project_url, image,
    privacy, status, sort_order, created_at, updated_at
  )
  values (
    v_id, v_title, v_category, v_tags, v_description, v_project_url, v_image,
    v_privacy, v_status, v_sort, v_created, v_updated
  )
  on conflict (id) do update set
    title = excluded.title,
    category = excluded.category,
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
