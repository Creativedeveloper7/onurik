-- App uses string ids (e.g. proj-abc123). If the table was created with uuid id, upserts fail with 42804.

begin;

do $$
declare
  id_is_uuid boolean;
begin
  if to_regclass('public.onurik_projects') is null then
    return;
  end if;

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
end $$;

commit;
