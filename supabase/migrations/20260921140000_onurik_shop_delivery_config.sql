-- Shop delivery rules (zones, turnaround, optional date). Public read; admin write via dashboard secret.

begin;

insert into public.onurik_site_settings (key, value)
values (
  'shop_delivery_config',
  '{
    "freeDeliveryThreshold": 10000,
    "defaultZoneId": "greater-nairobi",
    "defaultTurnaroundId": "standard",
    "allowDeliveryDate": true,
    "zoneNote": "Tap your zone to lock in delivery. FREE on orders over {threshold}. Production extras still apply.",
    "turnaroundHint": "How fast we produce your order — delivery is charged separately.",
    "dateHint": "Leave blank if you don’t need a specific day. We will not promise a date before production finishes.",
    "zones": [
      {"id":"nairobi-cbd","label":"Nairobi CBD","detail":"CBD, UON, Globe, Koja, River Road","price":200,"nairobi":true},
      {"id":"greater-nairobi","label":"Greater Nairobi","detail":"Westlands, Kilimani, Langata, South B/C, Eastlands, Ruaka, Spring Valley, Kileleshwa, Lavington, Ngong Road, Fedha","price":400,"nairobi":true},
      {"id":"satellite","label":"Satellite Towns","detail":"Kitengela, Karen, Rongai, Utawala, Kamulu, Kikuyu, Kiambu, Ngong, Thika","price":800,"nairobi":false},
      {"id":"major-towns","label":"Major Towns","detail":"Mombasa, Kisumu, Nakuru, Eldoret, Nyeri, Watamu, Diani, Malindi, Lamu, Nanyuki","price":1150,"nairobi":false},
      {"id":"other","label":"Other Areas","detail":"Rest of Kenya","price":1200,"nairobi":false}
    ],
    "turnaround": [
      {"id":"rush","label":"Rush","timeLabel":"24 hrs","days":1,"extra":1500,"nairobiOnly":true,"regions":"Nairobi only"},
      {"id":"express","label":"Express","timeLabel":"2 days","days":2,"extra":500,"nairobiOnly":false,"regions":"All regions"},
      {"id":"standard","label":"Standard","timeLabel":"3 days","days":3,"extra":0,"nairobiOnly":false,"regions":"All regions"}
    ]
  }'::jsonb
)
on conflict (key) do nothing;

create or replace function public.onurik_public_shop_delivery_config()
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
      where s.key = 'shop_delivery_config'
    ),
    '{}'::jsonb
  );
$$;

revoke all on function public.onurik_public_shop_delivery_config() from public;
grant execute on function public.onurik_public_shop_delivery_config() to anon, authenticated;

create or replace function public.onurik_dashboard_shop_delivery_set(p_secret text, p_config jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.onurik_dashboard_brands_secret_ok(p_secret) then
    raise exception 'invalid_dashboard_secret';
  end if;
  if p_config is null or jsonb_typeof(p_config) is distinct from 'object' then
    raise exception 'invalid_delivery_config';
  end if;
  insert into public.onurik_site_settings (key, value)
  values ('shop_delivery_config', p_config)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.onurik_dashboard_shop_delivery_set(text, jsonb) from public;
grant execute on function public.onurik_dashboard_shop_delivery_set(text, jsonb) to anon, authenticated;

commit;
