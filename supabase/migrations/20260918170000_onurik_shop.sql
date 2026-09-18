-- Shop catalog + orders. Public can read live products; admin CRUD and order
-- management use the same dashboard secret as brands/projects.

begin;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create table if not exists public.onurik_shop_products (
  id text primary key,
  name text not null,
  gender text not null default 'men',
  category text not null,
  price integer not null default 0,
  original_price integer,
  images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '["S","M","L","XL"]'::jsonb,
  colors jsonb not null default '[{"id":"ink","label":"Ink","hex":"#1a1a1a"}]'::jsonb,
  description text not null default '',
  in_stock boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint onurik_shop_products_name_nonempty check (char_length(trim(name)) > 0),
  constraint onurik_shop_products_gender_chk check (gender in ('men', 'women')),
  constraint onurik_shop_products_category_chk check (
    category in ('hoodies', 't-shirts', 'caps', 'afrowear')
  ),
  constraint onurik_shop_products_price_chk check (price >= 0),
  constraint onurik_shop_products_original_price_chk check (
    original_price is null or original_price >= 0
  ),
  constraint onurik_shop_products_images_arr check (jsonb_typeof(images) = 'array'),
  constraint onurik_shop_products_sizes_arr check (jsonb_typeof(sizes) = 'array'),
  constraint onurik_shop_products_colors_arr check (jsonb_typeof(colors) = 'array')
);

create index if not exists onurik_shop_products_live_idx
  on public.onurik_shop_products (published, gender, category, created_at desc);

create or replace function public.onurik_shop_products_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists onurik_shop_products_set_updated_at on public.onurik_shop_products;
create trigger onurik_shop_products_set_updated_at
  before update on public.onurik_shop_products
  for each row execute function public.onurik_shop_products_set_updated_at();

alter table public.onurik_shop_products enable row level security;

drop policy if exists onurik_shop_products_public_select_live on public.onurik_shop_products;
create policy onurik_shop_products_public_select_live
  on public.onurik_shop_products
  for select to anon, authenticated
  using (published = true);

grant select on public.onurik_shop_products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table if not exists public.onurik_shop_orders (
  id text primary key,
  status text not null default 'new',
  total integer not null default 0,
  payment_label text not null default '',
  payment_ref text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_address text not null default '',
  customer_city text not null default '',
  shipping_id text not null default 'standard',
  shipping_label text not null default 'Standard',
  shipping_price integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint onurik_shop_orders_status_chk check (
    status in ('new', 'processing', 'fulfilled', 'cancelled')
  ),
  constraint onurik_shop_orders_total_chk check (total >= 0),
  constraint onurik_shop_orders_shipping_price_chk check (shipping_price >= 0)
);

create index if not exists onurik_shop_orders_status_created_idx
  on public.onurik_shop_orders (status, created_at desc);

create or replace function public.onurik_shop_orders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists onurik_shop_orders_set_updated_at on public.onurik_shop_orders;
create trigger onurik_shop_orders_set_updated_at
  before update on public.onurik_shop_orders
  for each row execute function public.onurik_shop_orders_set_updated_at();

alter table public.onurik_shop_orders enable row level security;

-- No public SELECT/UPDATE/DELETE. Reads and status changes go through RPCs.

-- ---------------------------------------------------------------------------
-- Order line items
-- ---------------------------------------------------------------------------

create table if not exists public.onurik_shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.onurik_shop_orders (id) on delete cascade,
  product_id text,
  name text not null default '',
  price integer not null default 0,
  original_price integer,
  image text not null default '',
  size text not null default '',
  color text not null default '',
  color_label text not null default '',
  qty integer not null default 1,
  constraint onurik_shop_order_items_qty_chk check (qty > 0),
  constraint onurik_shop_order_items_price_chk check (price >= 0)
);

create index if not exists onurik_shop_order_items_order_idx
  on public.onurik_shop_order_items (order_id);

alter table public.onurik_shop_order_items enable row level security;

-- ---------------------------------------------------------------------------
-- Dashboard RPCs (same secret as brands/projects)
-- ---------------------------------------------------------------------------

create or replace function public.onurik_dashboard_shop_products_all(p_secret text)
returns setof public.onurik_shop_products
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  return query
    select p.*
    from public.onurik_shop_products p
    order by p.created_at desc;
end;
$$;

create or replace function public.onurik_dashboard_shop_product_upsert(
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
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;

  v_id := trim(coalesce(p_payload->>'id', ''));
  if length(v_id) < 1 then
    raise exception 'id required';
  end if;

  insert into public.onurik_shop_products (
    id, name, gender, category, price, original_price, images, sizes, colors,
    description, in_stock, published, created_at, updated_at
  ) values (
    v_id,
    trim(coalesce(p_payload->>'name', '')),
    case when p_payload->>'gender' = 'women' then 'women' else 'men' end,
    trim(coalesce(p_payload->>'category', 't-shirts')),
    coalesce((p_payload->>'price')::integer, 0),
    nullif((p_payload->>'original_price')::integer, 0),
    case when jsonb_typeof(p_payload->'images') = 'array' then p_payload->'images' else '[]'::jsonb end,
    case when jsonb_typeof(p_payload->'sizes') = 'array' then p_payload->'sizes' else '["S","M","L","XL"]'::jsonb end,
    case when jsonb_typeof(p_payload->'colors') = 'array' then p_payload->'colors' else '[]'::jsonb end,
    coalesce(p_payload->>'description', ''),
    coalesce((p_payload->>'in_stock')::boolean, true),
    coalesce((p_payload->>'published')::boolean, true),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update set
    name = excluded.name,
    gender = excluded.gender,
    category = excluded.category,
    price = excluded.price,
    original_price = excluded.original_price,
    images = excluded.images,
    sizes = excluded.sizes,
    colors = excluded.colors,
    description = excluded.description,
    in_stock = excluded.in_stock,
    published = excluded.published,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.onurik_dashboard_shop_product_delete(
  p_secret text,
  p_id text
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
  delete from public.onurik_shop_products where id = trim(p_id);
end;
$$;

create or replace function public.onurik_dashboard_shop_orders_all(p_secret text)
returns table (
  id text,
  status text,
  total integer,
  payment_label text,
  payment_ref text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  shipping_id text,
  shipping_label text,
  shipping_price integer,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  return query
    select
      o.id,
      o.status,
      o.total,
      o.payment_label,
      o.payment_ref,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.customer_address,
      o.customer_city,
      o.shipping_id,
      o.shipping_label,
      o.shipping_price,
      o.created_at,
      o.updated_at,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'productId', i.product_id,
          'name', i.name,
          'price', i.price,
          'originalPrice', i.original_price,
          'image', i.image,
          'size', i.size,
          'color', i.color,
          'colorLabel', i.color_label,
          'qty', i.qty
        ) order by i.name)
        from public.onurik_shop_order_items i
        where i.order_id = o.id
      ), '[]'::jsonb) as items
    from public.onurik_shop_orders o
    order by o.created_at desc;
end;
$$;

create or replace function public.onurik_dashboard_shop_order_set_status(
  p_secret text,
  p_id text,
  p_status text
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
  if p_status not in ('new', 'processing', 'fulfilled', 'cancelled') then
    raise exception 'invalid_status';
  end if;
  update public.onurik_shop_orders
  set status = p_status
  where id = trim(p_id);
end;
$$;

create or replace function public.onurik_dashboard_shop_order_delete(
  p_secret text,
  p_id text
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
  delete from public.onurik_shop_orders where id = trim(p_id);
end;
$$;

-- Public checkout: insert an order + line items (no dashboard secret).
create or replace function public.onurik_shop_order_place(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_item jsonb;
begin
  v_id := trim(coalesce(p_payload->>'id', ''));
  if length(v_id) < 1 then
    v_id := 'ONK-' || to_char(timezone('utc', now()), 'YYYYMMDDHH24MISS');
  end if;

  insert into public.onurik_shop_orders (
    id, status, total, payment_label, payment_ref,
    customer_name, customer_email, customer_phone, customer_address, customer_city,
    shipping_id, shipping_label, shipping_price
  ) values (
    v_id,
    'new',
    coalesce((p_payload->>'total')::integer, 0),
    coalesce(p_payload->>'payment_label', ''),
    coalesce(p_payload->>'payment_ref', ''),
    coalesce(p_payload->'customer'->>'name', ''),
    coalesce(p_payload->'customer'->>'email', ''),
    coalesce(p_payload->'customer'->>'phone', ''),
    coalesce(p_payload->'customer'->>'address', ''),
    coalesce(p_payload->'customer'->>'city', ''),
    coalesce(p_payload->'shipping'->>'id', 'standard'),
    coalesce(p_payload->'shipping'->>'label', 'Standard'),
    coalesce((p_payload->'shipping'->>'price')::integer, 0)
  );

  if jsonb_typeof(p_payload->'items') = 'array' then
    for v_item in select value from jsonb_array_elements(p_payload->'items')
    loop
      insert into public.onurik_shop_order_items (
        order_id, product_id, name, price, original_price, image, size, color, color_label, qty
      ) values (
        v_id,
        v_item->>'productId',
        coalesce(v_item->>'name', ''),
        coalesce((v_item->>'price')::integer, 0),
        nullif((v_item->>'originalPrice')::integer, 0),
        coalesce(v_item->>'image', ''),
        coalesce(v_item->>'size', ''),
        coalesce(v_item->>'color', ''),
        coalesce(v_item->>'colorLabel', ''),
        greatest(coalesce((v_item->>'qty')::integer, 1), 1)
      );
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.onurik_dashboard_shop_products_all(text) from public;
grant execute on function public.onurik_dashboard_shop_products_all(text) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_product_upsert(text, jsonb) from public;
grant execute on function public.onurik_dashboard_shop_product_upsert(text, jsonb) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_product_delete(text, text) from public;
grant execute on function public.onurik_dashboard_shop_product_delete(text, text) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_orders_all(text) from public;
grant execute on function public.onurik_dashboard_shop_orders_all(text) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_order_set_status(text, text, text) from public;
grant execute on function public.onurik_dashboard_shop_order_set_status(text, text, text) to anon, authenticated;

revoke all on function public.onurik_dashboard_shop_order_delete(text, text) from public;
grant execute on function public.onurik_dashboard_shop_order_delete(text, text) to anon, authenticated;

revoke all on function public.onurik_shop_order_place(jsonb) from public;
grant execute on function public.onurik_shop_order_place(jsonb) to anon, authenticated;

commit;
