-- Public social URLs (footer + contact). Read: anon. Write: dashboard secret (same as Brands).

begin;

insert into public.onurik_site_settings (key, value)
values (
  'public_social_links',
  '{"instagram":"","linkedin":"","behance":"","twitter":"","github":"","email":""}'::jsonb
)
on conflict (key) do nothing;

create or replace function public.onurik_public_social_links()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.value
      from public.onurik_site_settings s
      where s.key = 'public_social_links'
    ),
    '{}'::jsonb
  );
$$;

revoke all on function public.onurik_public_social_links() from public;
grant execute on function public.onurik_public_social_links() to anon, authenticated;

create or replace function public.onurik_dashboard_social_links_set(p_secret text, p_links jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  merged jsonb;
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  merged := jsonb_build_object(
    'instagram', coalesce(nullif(trim(p_links->>'instagram'), ''), ''),
    'linkedin', coalesce(nullif(trim(p_links->>'linkedin'), ''), ''),
    'behance', coalesce(nullif(trim(p_links->>'behance'), ''), ''),
    'twitter', coalesce(nullif(trim(p_links->>'twitter'), ''), ''),
    'github', coalesce(nullif(trim(p_links->>'github'), ''), ''),
    'email', coalesce(nullif(trim(p_links->>'email'), ''), '')
  );
  insert into public.onurik_site_settings (key, value)
  values ('public_social_links', merged)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.onurik_dashboard_social_links_set(text, jsonb) from public;
grant execute on function public.onurik_dashboard_social_links_set(text, jsonb) to anon, authenticated;

commit;
