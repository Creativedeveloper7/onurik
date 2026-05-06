-- Let anon read only the public_social_links row via PostgREST (fallback if RPC layer differs).
-- Keeps dashboard_read_secret and other keys unreadable without a matching policy.

begin;

alter table public.onurik_site_settings enable row level security;

drop policy if exists onurik_site_settings_public_social_link_select on public.onurik_site_settings;
create policy onurik_site_settings_public_social_link_select
  on public.onurik_site_settings
  for select
  to anon, authenticated
  using (key = 'public_social_links');

commit;
