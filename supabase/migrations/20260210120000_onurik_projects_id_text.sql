-- App uses string ids (e.g. proj-abc123). If projects.id is uuid, upserts fail with 42804.
-- RLS + FKs block ALTER TYPE — drop, fix, recreate.
--
-- Entire script is ONE plpgsql DO block so Supabase SQL Editor / poolers run it as a
-- single round-trip (no missing staging table between statements).

begin;

do $$
declare
  r record;
  fk_col text;
  id_is_uuid boolean;
  del_clause text;
begin
  drop table if exists public._onurik_fk_fix_staging;

  create temporary table _onurik_fk_fix_staging (
    conname text primary key,
    child_tbl regclass not null,
    child_col text not null,
    child_typ text not null,
    confdeltype "char" not null
  ) on commit drop;

  insert into _onurik_fk_fix_staging (conname, child_tbl, child_col, child_typ, confdeltype)
  select
    c.conname,
    c.conrelid::regclass,
    src.attname,
    format_type(src.atttypid, src.atttypmod),
    c.confdeltype
  from pg_constraint c
  join pg_attribute src
    on src.attrelid = c.conrelid
   and src.attnum = c.conkey[1]
   and src.attnum > 0
   and not src.attisdropped
  join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
  where c.contype = 'f'
    and c.confrelid = 'public.onurik_projects'::regclass
    and n.nspname = 'public';

  -- 1) Policies
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('onurik_projects', 'onurik_project_tags')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;

  -- 2) Drop FKs
  for r in select conname, child_tbl from _onurik_fk_fix_staging
  loop
    execute format('alter table %s drop constraint %I', r.child_tbl, r.conname);
  end loop;

  -- 3) Parent id → text
  if to_regclass('public.onurik_projects') is not null then
    select coalesce(
      bool_or(format_type(a.atttypid, a.atttypmod) = 'uuid'),
      false
    )
      into id_is_uuid
    from pg_attribute a
    join pg_class c on a.attrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'onurik_projects'
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;

    if id_is_uuid then
      alter table public.onurik_projects
        alter column id type text using id::text;
    end if;
  end if;

  -- 4) Child FK columns → text
  for r in select * from _onurik_fk_fix_staging
  loop
    if r.child_typ = 'uuid' then
      execute format(
        'alter table %s alter column %I type text using %I::text',
        r.child_tbl,
        r.child_col,
        r.child_col
      );
    end if;
  end loop;

  -- 5) Recreate FKs
  for r in select * from _onurik_fk_fix_staging
  loop
    del_clause := case r.confdeltype
      when 'c' then ' on delete cascade'
      when 'n' then ' on delete set null'
      when 'd' then ' on delete set default'
      else ' on delete no action'
    end;
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.onurik_projects (id)%s',
      r.child_tbl,
      r.conname,
      r.child_col,
      del_clause
    );
  end loop;

  -- 6) RLS projects
  execute 'drop policy if exists onurik_projects_public_select_published on public.onurik_projects';
  execute $p$
    create policy onurik_projects_public_select_published on public.onurik_projects
      for select to anon, authenticated
      using (status = 'published')
  $p$;

  -- 7) RLS tags
  if to_regclass('public.onurik_project_tags') is not null then
    select s.child_col into fk_col
    from _onurik_fk_fix_staging s
    where s.child_tbl = 'public.onurik_project_tags'::regclass
    limit 1;

    if fk_col is not null then
      execute format(
        $q$
        create policy onurik_project_tags_public_read on public.onurik_project_tags
          for select to anon, authenticated
          using (
            %I in (select id from public.onurik_projects where status = 'published')
          )
        $q$,
        fk_col
      );
    end if;
  end if;
end $$;

commit;
