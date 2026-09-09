-- Case-study fields for portfolio projects (non-destructive ADD COLUMN).
-- Adds: client, scope_tags, challenge, approach, result

begin;

alter table public.onurik_projects add column if not exists client text;
alter table public.onurik_projects add column if not exists scope_tags jsonb;
alter table public.onurik_projects add column if not exists challenge text;
alter table public.onurik_projects add column if not exists approach jsonb;
alter table public.onurik_projects add column if not exists result text;

update public.onurik_projects set client = coalesce(client, '');
update public.onurik_projects
set scope_tags = case
  when scope_tags is not null and jsonb_typeof(scope_tags) = 'array' then scope_tags
  else '[]'::jsonb
end;
update public.onurik_projects set challenge = coalesce(challenge, '');
update public.onurik_projects
set approach = case
  when approach is not null and jsonb_typeof(approach) = 'array' then approach
  else '[]'::jsonb
end;
update public.onurik_projects set result = coalesce(result, '');

alter table public.onurik_projects alter column client set default '';
alter table public.onurik_projects alter column client set not null;
alter table public.onurik_projects alter column scope_tags set default '[]'::jsonb;
alter table public.onurik_projects alter column scope_tags set not null;
alter table public.onurik_projects alter column challenge set default '';
alter table public.onurik_projects alter column challenge set not null;
alter table public.onurik_projects alter column approach set default '[]'::jsonb;
alter table public.onurik_projects alter column approach set not null;
alter table public.onurik_projects alter column result set default '';
alter table public.onurik_projects alter column result set not null;

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
  v_scope_tags jsonb;
  v_description text;
  v_challenge text;
  v_approach jsonb;
  v_result text;
  v_client text;
  v_project_url text;
  v_image text;
  v_images jsonb;
  v_privacy text;
  v_status text;
  v_sort integer;
  v_created timestamptz;
  v_updated timestamptz;
  v_has_category_id boolean;
  v_has_images boolean;
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

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_projects' and column_name = 'category_id'
  ) into v_has_category_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'onurik_projects' and column_name = 'images'
  ) into v_has_images;

  if v_has_category_id and to_regprocedure('public.onurik_project_category_id_for_name(text)') is not null then
    v_category_id := public.onurik_project_category_id_for_name(v_category);
  else
    v_category_id := null;
  end if;

  if jsonb_typeof(p_payload->'tags') = 'array' then
    v_tags := p_payload->'tags';
  else
    v_tags := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_payload->'scopeTags') = 'array' then
    v_scope_tags := p_payload->'scopeTags';
  elsif jsonb_typeof(p_payload->'scope_tags') = 'array' then
    v_scope_tags := p_payload->'scope_tags';
  else
    v_scope_tags := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_payload->'approach') = 'array' then
    v_approach := p_payload->'approach';
  else
    v_approach := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_payload->'images') = 'array' then
    v_images := p_payload->'images';
  else
    v_images := '[]'::jsonb;
  end if;

  v_description := coalesce(p_payload->>'description', '');
  v_challenge := coalesce(p_payload->>'challenge', '');
  v_result := coalesce(p_payload->>'result', '');
  v_client := trim(coalesce(p_payload->>'client', ''));
  v_project_url := trim(coalesce(p_payload->>'projectUrl', p_payload->>'project_url', ''));
  v_image := coalesce(p_payload->>'image', '');
  if length(trim(v_image)) < 1 and jsonb_array_length(v_images) > 0 then
    v_image := coalesce(v_images->>0, '');
  end if;
  if jsonb_array_length(v_images) < 1 and length(trim(v_image)) > 0 then
    v_images := jsonb_build_array(v_image);
  end if;

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

  if v_has_category_id and v_has_images then
    insert into public.onurik_projects (
      id, title, category, category_id, tags, scope_tags, description, challenge, approach, result, client,
      project_url, image, images, privacy, status, sort_order, created_at, updated_at
    ) values (
      v_id, v_title, v_category, v_category_id, v_tags, v_scope_tags, v_description, v_challenge, v_approach, v_result, v_client,
      v_project_url, v_image, v_images, v_privacy, v_status, v_sort, v_created, v_updated
    )
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      category_id = excluded.category_id,
      tags = excluded.tags,
      scope_tags = excluded.scope_tags,
      description = excluded.description,
      challenge = excluded.challenge,
      approach = excluded.approach,
      result = excluded.result,
      client = excluded.client,
      project_url = excluded.project_url,
      image = excluded.image,
      images = excluded.images,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  elsif v_has_images then
    insert into public.onurik_projects (
      id, title, category, tags, scope_tags, description, challenge, approach, result, client,
      project_url, image, images, privacy, status, sort_order, created_at, updated_at
    ) values (
      v_id, v_title, v_category, v_tags, v_scope_tags, v_description, v_challenge, v_approach, v_result, v_client,
      v_project_url, v_image, v_images, v_privacy, v_status, v_sort, v_created, v_updated
    )
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      tags = excluded.tags,
      scope_tags = excluded.scope_tags,
      description = excluded.description,
      challenge = excluded.challenge,
      approach = excluded.approach,
      result = excluded.result,
      client = excluded.client,
      project_url = excluded.project_url,
      image = excluded.image,
      images = excluded.images,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  elsif v_has_category_id then
    insert into public.onurik_projects (
      id, title, category, category_id, tags, scope_tags, description, challenge, approach, result, client,
      project_url, image, privacy, status, sort_order, created_at, updated_at
    ) values (
      v_id, v_title, v_category, v_category_id, v_tags, v_scope_tags, v_description, v_challenge, v_approach, v_result, v_client,
      v_project_url, v_image, v_privacy, v_status, v_sort, v_created, v_updated
    )
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      category_id = excluded.category_id,
      tags = excluded.tags,
      scope_tags = excluded.scope_tags,
      description = excluded.description,
      challenge = excluded.challenge,
      approach = excluded.approach,
      result = excluded.result,
      client = excluded.client,
      project_url = excluded.project_url,
      image = excluded.image,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  else
    insert into public.onurik_projects (
      id, title, category, tags, scope_tags, description, challenge, approach, result, client,
      project_url, image, privacy, status, sort_order, created_at, updated_at
    ) values (
      v_id, v_title, v_category, v_tags, v_scope_tags, v_description, v_challenge, v_approach, v_result, v_client,
      v_project_url, v_image, v_privacy, v_status, v_sort, v_created, v_updated
    )
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      tags = excluded.tags,
      scope_tags = excluded.scope_tags,
      description = excluded.description,
      challenge = excluded.challenge,
      approach = excluded.approach,
      result = excluded.result,
      client = excluded.client,
      project_url = excluded.project_url,
      image = excluded.image,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  end if;
end;
$$;

commit;
