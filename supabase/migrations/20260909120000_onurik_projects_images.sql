-- Multi-image gallery for portfolio projects (cover stays in `image`).

begin;

alter table public.onurik_projects
  add column if not exists images jsonb;

update public.onurik_projects
set images = case
  when images is not null and jsonb_typeof(images) = 'array' then images
  when coalesce(nullif(trim(image), ''), '') <> '' then jsonb_build_array(image)
  else '[]'::jsonb
end
where images is null
   or jsonb_typeof(images) <> 'array';

alter table public.onurik_projects
  alter column images set default '[]'::jsonb;

alter table public.onurik_projects
  alter column images set not null;

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
  v_images jsonb;
  v_privacy text;
  v_status text;
  v_sort integer;
  v_created timestamptz;
  v_updated timestamptz;
  v_has_category_id boolean;
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
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'onurik_projects'
      and column_name = 'category_id'
  ) into v_has_category_id;

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

  if jsonb_typeof(p_payload->'images') = 'array' then
    v_images := p_payload->'images';
  else
    v_images := '[]'::jsonb;
  end if;

  v_description := coalesce(p_payload->>'description', '');
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

  if v_has_category_id then
    insert into public.onurik_projects (
      id, title, category, category_id, tags, description, project_url, image, images,
      privacy, status, sort_order, created_at, updated_at
    )
    values (
      v_id, v_title, v_category, v_category_id, v_tags, v_description, v_project_url, v_image, v_images,
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
      images = excluded.images,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  else
    insert into public.onurik_projects (
      id, title, category, tags, description, project_url, image, images,
      privacy, status, sort_order, created_at, updated_at
    )
    values (
      v_id, v_title, v_category, v_tags, v_description, v_project_url, v_image, v_images,
      v_privacy, v_status, v_sort, v_created, v_updated
    )
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      tags = excluded.tags,
      description = excluded.description,
      project_url = excluded.project_url,
      image = excluded.image,
      images = excluded.images,
      privacy = excluded.privacy,
      status = excluded.status,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at;
  end if;
end;
$$;

commit;
