-- Enquiries / bookings list for admin HTML (anon calls RPC + shared secret).
-- Requires existing tables: public.onurik_enquiries, public.onurik_bookings,
-- public.onurik_site_settings (from main Onurik dashboard schema migration).

begin;

insert into public.onurik_site_settings (key, value)
values ('dashboard_read_secret', to_jsonb(''::text))
on conflict (key) do nothing;

create or replace function public.onurik_dashboard_read_secret()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(s.value #>> '{}', '')
  from public.onurik_site_settings s
  where s.key = 'dashboard_read_secret';
$$;

revoke all on function public.onurik_dashboard_read_secret() from public;

create or replace function public.onurik_dashboard_enquiries(p_secret text)
returns setof public.onurik_enquiries
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text := trim(both from public.onurik_dashboard_read_secret());
begin
  if expected is null or length(expected) = 0 then
    raise exception 'dashboard_read_secret not set'
      using hint = 'Update onurik_site_settings where key = ''dashboard_read_secret'' (same string as site .env).';
  end if;
  if p_secret is null or trim(both from p_secret) is distinct from expected then
    raise exception 'invalid_dashboard_secret';
  end if;
  return query
    select e.*
    from public.onurik_enquiries e
    order by e.created_at desc
    limit 500;
end;
$$;

create or replace function public.onurik_dashboard_bookings(p_secret text)
returns setof public.onurik_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text := trim(both from public.onurik_dashboard_read_secret());
begin
  if expected is null or length(expected) = 0 then
    raise exception 'dashboard_read_secret not set'
      using hint = 'Update onurik_site_settings where key = ''dashboard_read_secret''.';
  end if;
  if p_secret is null or trim(both from p_secret) is distinct from expected then
    raise exception 'invalid_dashboard_secret';
  end if;
  return query
    select b.*
    from public.onurik_bookings b
    order by b.starts_at desc
    limit 500;
end;
$$;

revoke all on function public.onurik_dashboard_enquiries(text) from public;
grant execute on function public.onurik_dashboard_enquiries(text) to anon, authenticated;

revoke all on function public.onurik_dashboard_bookings(text) from public;
grant execute on function public.onurik_dashboard_bookings(text) to anon, authenticated;

commit;
