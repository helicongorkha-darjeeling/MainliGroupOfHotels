-- Mainali Group of Hotels: production booking foundation.
-- All Teesta inventory is seeded separately as inactive draft data.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create type public.property_status as enum ('draft', 'active', 'archived');
create type public.room_status as enum ('draft', 'active', 'maintenance', 'retired');
create type public.staff_role as enum ('group_admin', 'property_manager', 'reception');
create type public.booking_source as enum ('online', 'phone', 'whatsapp', 'walk_in');
create type public.booking_status as enum (
  'hold',
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'expired',
  'payment_review'
);
create type public.allocation_type as enum ('hold', 'confirmed', 'block');
create type public.allocation_status as enum ('active', 'released', 'expired');
create type public.payment_status as enum ('pending', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded');
create type public.refund_status as enum ('pending', 'processed', 'failed');
create type public.payment_policy as enum ('full', 'deposit');
create type public.housekeeping_status as enum ('unknown', 'clean', 'dirty', 'inspecting', 'out_of_service');

create table public.properties (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  group_name text not null,
  name text not null,
  city text not null,
  state text not null,
  country_code char(2) not null default 'IN',
  timezone text not null default 'Asia/Kolkata',
  status public.property_status not null default 'draft',
  exact_address text,
  map_url text,
  phone_e164 text,
  whatsapp_e164 text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_settings (
  property_id uuid primary key references public.properties(id) on delete cascade,
  live_bookings_enabled boolean not null default false,
  policy public.payment_policy,
  deposit_percent numeric(5,2),
  hold_minutes integer not null default 15 check (hold_minutes between 5 and 60),
  max_nights integer not null default 30 check (max_nights between 1 and 90),
  owner_approved_at timestamptz,
  cancellation_terms text,
  refund_terms text,
  check_in_time time,
  check_out_time time,
  updated_at timestamptz not null default now(),
  constraint approved_payment_configuration check (
    (owner_approved_at is null and live_bookings_enabled = false)
    or (
      owner_approved_at is not null
      and policy is not null
      and (
        (policy = 'full' and deposit_percent is null)
        or (policy = 'deposit' and deposit_percent > 0 and deposit_percent < 100)
      )
    )
  )
);

create table public.room_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  bed_summary text,
  max_occupancy integer check (max_occupancy between 1 and 20),
  included_guests integer check (included_guests between 1 and 20),
  amenities jsonb not null default '[]'::jsonb check (jsonb_typeof(amenities) = 'array'),
  representative_image_path text,
  is_active boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, code),
  constraint active_category_is_complete check (
    is_active = false
    or (
      confirmed_at is not null
      and description is not null
      and bed_summary is not null
      and max_occupancy is not null
      and included_guests is not null
      and representative_image_path is not null
    )
  )
);

create table public.rooms (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid not null references public.room_categories(id) on delete restrict,
  room_number text not null,
  source_label text,
  floor text,
  status public.room_status not null default 'draft',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, room_number),
  constraint active_room_is_confirmed check (status <> 'active' or confirmed_at is not null)
);

create table public.room_housekeeping (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  status public.housekeeping_status not null default 'unknown',
  notes text,
  last_cleaned_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rates (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid not null references public.room_categories(id) on delete cascade,
  name text not null,
  valid_from date not null,
  valid_to date not null,
  validity daterange generated always as (daterange(valid_from, valid_to, '[)')) stored,
  nightly_rate_paise integer not null check (nightly_rate_paise >= 0),
  extra_guest_paise integer not null default 0 check (extra_guest_paise >= 0),
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  is_active boolean not null default false,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to > valid_from),
  constraint active_rate_is_approved check (is_active = false or approved_at is not null)
);

alter table public.rates
  add constraint rates_no_overlapping_active_periods
  exclude using gist (category_id with =, validity with &&)
  where (is_active);

create table public.guests (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone_last_four text check (phone_last_four is null or phone_last_four ~ '^[0-9]{4}$'),
  arrival_details jsonb not null default '{}'::jsonb check (jsonb_typeof(arrival_details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id, role),
  constraint group_admin_has_group_scope check (
    (role = 'group_admin' and property_id is null)
    or (role <> 'group_admin' and property_id is not null)
  )
);

create table public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique,
  property_id uuid not null references public.properties(id) on delete restrict,
  category_id uuid not null references public.room_categories(id) on delete restrict,
  guest_id uuid references public.guests(id) on delete restrict,
  source public.booking_source not null default 'online',
  status public.booking_status not null default 'hold',
  check_in date not null,
  check_out date not null,
  adults integer not null default 1 check (adults between 1 and 20),
  children integer not null default 0 check (children between 0 and 20),
  guest_name text,
  guest_email text,
  guest_phone_e164 text,
  currency char(3) not null default 'INR' check (currency = 'INR'),
  subtotal_paise integer not null check (subtotal_paise >= 0),
  tax_paise integer not null check (tax_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  amount_payable_now_paise integer not null check (amount_payable_now_paise >= 0),
  balance_paise integer not null check (balance_paise >= 0),
  price_breakdown jsonb not null check (jsonb_typeof(price_breakdown) = 'object'),
  cancellation_terms_snapshot text not null,
  hold_expires_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (total_paise = subtotal_paise + tax_paise),
  check (amount_payable_now_paise + balance_paise = total_paise),
  constraint online_booking_has_guest check (source <> 'online' or guest_id is not null)
);

create table public.inventory_allocations (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete cascade,
  allocation_type public.allocation_type not null,
  status public.allocation_status not null default 'active',
  check_in date not null,
  check_out date not null,
  stay daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  expires_at timestamptz,
  block_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  constraint allocation_shape check (
    (allocation_type = 'hold' and booking_id is not null and expires_at is not null and block_reason is null)
    or (allocation_type = 'confirmed' and booking_id is not null and expires_at is null and block_reason is null)
    or (allocation_type = 'block' and booking_id is null and expires_at is null and block_reason is not null)
  )
);

alter table public.inventory_allocations
  add constraint inventory_no_double_booking
  exclude using gist (room_id with =, stay with &&)
  where (status = 'active');

create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_order_id text unique,
  provider_payment_id text unique,
  status public.payment_status not null default 'pending',
  amount_paise integer not null check (amount_paise > 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  failure_code text,
  failure_description text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_one_pending_attempt_per_booking
  on public.payments (booking_id)
  where status in ('pending', 'authorized');

create table public.refunds (
  id uuid primary key default extensions.gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider_refund_id text unique,
  status public.refund_status not null default 'pending',
  amount_paise integer not null check (amount_paise > 0),
  reason text not null,
  requested_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_event_id text not null unique,
  event_type text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  property_id uuid references public.properties(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index bookings_property_dates_idx on public.bookings (property_id, check_in, check_out);
create index bookings_guest_idx on public.bookings (guest_id, created_at desc);
create index bookings_reference_idx on public.bookings (reference);
create index bookings_guest_phone_idx on public.bookings (guest_phone_e164) where guest_phone_e164 is not null;
create index allocations_room_stay_idx on public.inventory_allocations using gist (room_id, stay);
create index allocations_booking_idx on public.inventory_allocations (booking_id);
create index payments_booking_idx on public.payments (booking_id, created_at desc);
create index audit_property_created_idx on public.audit_log (property_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger booking_settings_set_updated_at before update on public.booking_settings for each row execute function public.set_updated_at();
create trigger room_categories_set_updated_at before update on public.room_categories for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger room_housekeeping_set_updated_at before update on public.room_housekeeping for each row execute function public.set_updated_at();
create trigger rates_set_updated_at before update on public.rates for each row execute function public.set_updated_at();
create trigger guests_set_updated_at before update on public.guests for each row execute function public.set_updated_at();
create trigger staff_memberships_set_updated_at before update on public.staff_memberships for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger allocations_set_updated_at before update on public.inventory_allocations for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger refunds_set_updated_at before update on public.refunds for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.guests (id, email, full_name, phone_last_four)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.phone is null then null else right(regexp_replace(new.phone, '[^0-9]', '', 'g'), 4) end
  )
  on conflict (id) do update
  set email = excluded.email,
      phone_last_four = excluded.phone_last_four,
      updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email, phone on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_group_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'group_admin'
      and membership.is_active
  );
$$;

create or replace function public.is_staff_for_property(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.is_active
      and (
        membership.role = 'group_admin'
        or membership.property_id = target_property_id
      )
  );
$$;

create or replace function public.expire_inventory_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  with expired as (
    update public.inventory_allocations allocation
    set status = 'expired', updated_at = now()
    where allocation.allocation_type = 'hold'
      and allocation.status = 'active'
      and allocation.expires_at <= now()
    returning allocation.booking_id
  )
  update public.bookings booking
  set status = 'expired', updated_at = now()
  where booking.id in (select booking_id from expired)
    and booking.status in ('hold', 'pending_payment');

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.make_booking_reference()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'MT-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 8));
$$;

create or replace function public.search_public_availability(
  property_slug text,
  requested_check_in date,
  requested_check_out date,
  requested_guests integer
)
returns table (
  category_id uuid,
  category_name text,
  bed_summary text,
  max_occupancy integer,
  representative_image_path text,
  available_rooms bigint,
  subtotal_paise bigint,
  tax_paise bigint,
  total_paise bigint,
  currency text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid;
  configured_max_nights integer;
begin
  if requested_check_in < (now() at time zone 'Asia/Kolkata')::date
    or requested_check_out <= requested_check_in
    or requested_guests < 1 then
    raise exception 'Invalid stay search';
  end if;

  select property.id, settings.max_nights
  into target_property_id, configured_max_nights
  from public.properties property
  join public.booking_settings settings on settings.property_id = property.id
  where property.slug = property_slug
    and property.status = 'active'
    and settings.live_bookings_enabled
    and settings.owner_approved_at is not null;

  if target_property_id is null then
    return;
  end if;

  if requested_check_out - requested_check_in > configured_max_nights then
    raise exception 'Stay exceeds maximum nights';
  end if;

  perform public.expire_inventory_holds();

  return query
  with category_prices as (
    select
      category.id,
      sum(rate.nightly_rate_paise + greatest(requested_guests - category.included_guests, 0) * rate.extra_guest_paise)::bigint as subtotal,
      sum(round((rate.nightly_rate_paise + greatest(requested_guests - category.included_guests, 0) * rate.extra_guest_paise) * rate.tax_rate_bps / 10000.0))::bigint as tax,
      min(rate.currency)::text as rate_currency,
      count(*) as priced_nights
    from public.room_categories category
    cross join generate_series(requested_check_in, requested_check_out - 1, interval '1 day') night
    join public.rates rate
      on rate.category_id = category.id
      and rate.property_id = target_property_id
      and rate.is_active
      and rate.validity @> night::date
    where category.property_id = target_property_id
      and category.is_active
      and category.max_occupancy >= requested_guests
    group by category.id
  ), available as (
    select room.category_id, count(*)::bigint as room_count
    from public.rooms room
    where room.property_id = target_property_id
      and room.status = 'active'
      and not exists (
        select 1
        from public.inventory_allocations allocation
        where allocation.room_id = room.id
          and allocation.status = 'active'
          and allocation.stay && daterange(requested_check_in, requested_check_out, '[)')
      )
    group by room.category_id
  )
  select
    category.id,
    category.name,
    category.bed_summary,
    category.max_occupancy,
    category.representative_image_path,
    available.room_count,
    prices.subtotal,
    prices.tax,
    prices.subtotal + prices.tax,
    prices.rate_currency
  from public.room_categories category
  join category_prices prices on prices.id = category.id
  join available on available.category_id = category.id and available.room_count > 0
  where prices.priced_nights = requested_check_out - requested_check_in
  order by prices.subtotal, category.name;
end;
$$;

create or replace function public.create_online_inventory_hold(
  property_slug text,
  requested_category_id uuid,
  requested_check_in date,
  requested_check_out date,
  requested_adults integer,
  requested_children integer default 0
)
returns table (
  booking_id uuid,
  booking_reference text,
  hold_expires_at timestamptz,
  total_paise integer,
  amount_payable_now_paise integer,
  balance_paise integer,
  currency text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_property public.properties%rowtype;
  target_settings public.booking_settings%rowtype;
  target_category public.room_categories%rowtype;
  target_room_id uuid;
  calculated_subtotal bigint;
  calculated_tax bigint;
  calculated_total bigint;
  payable_now bigint;
  remaining_balance bigint;
  priced_nights integer;
  new_booking_id uuid := extensions.gen_random_uuid();
  new_reference text;
  new_expiry timestamptz;
  breakdown jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if requested_check_in < (now() at time zone 'Asia/Kolkata')::date
    or requested_check_out <= requested_check_in
    or requested_adults < 1
    or requested_children < 0 then
    raise exception 'Invalid stay request';
  end if;

  select property.* into target_property
  from public.properties property
  where property.slug = property_slug
    and property.status = 'active';

  if target_property.id is null then
    raise exception 'Property is not available for booking';
  end if;

  select settings.* into target_settings
  from public.booking_settings settings
  where settings.property_id = target_property.id
    and settings.live_bookings_enabled
    and settings.owner_approved_at is not null
    and settings.cancellation_terms is not null;

  if target_settings.property_id is null then
    raise exception 'Live booking is not approved';
  end if;

  if requested_check_out - requested_check_in > target_settings.max_nights then
    raise exception 'Stay exceeds maximum nights';
  end if;

  select category.* into target_category
  from public.room_categories category
  where category.id = requested_category_id
    and category.property_id = target_property.id
    and category.is_active
    and category.max_occupancy >= requested_adults + requested_children;

  if target_category.id is null then
    raise exception 'Room category is not available for this party';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_property.id::text || requested_check_in::text || requested_check_out::text, 0));
  perform public.expire_inventory_holds();

  select
    sum(rate.nightly_rate_paise + greatest(requested_adults + requested_children - target_category.included_guests, 0) * rate.extra_guest_paise),
    sum(round((rate.nightly_rate_paise + greatest(requested_adults + requested_children - target_category.included_guests, 0) * rate.extra_guest_paise) * rate.tax_rate_bps / 10000.0)),
    count(*)
  into calculated_subtotal, calculated_tax, priced_nights
  from generate_series(requested_check_in, requested_check_out - 1, interval '1 day') night
  join public.rates rate
    on rate.category_id = target_category.id
    and rate.property_id = target_property.id
    and rate.is_active
    and rate.validity @> night::date;

  if priced_nights <> requested_check_out - requested_check_in then
    raise exception 'A confirmed rate is missing for one or more nights';
  end if;

  select room.id into target_room_id
  from public.rooms room
  where room.property_id = target_property.id
    and room.category_id = target_category.id
    and room.status = 'active'
    and not exists (
      select 1
      from public.inventory_allocations allocation
      where allocation.room_id = room.id
        and allocation.status = 'active'
        and allocation.stay && daterange(requested_check_in, requested_check_out, '[)')
    )
  order by room.room_number
  for update of room skip locked
  limit 1;

  if target_room_id is null then
    raise exception 'No room remains available';
  end if;

  calculated_total := calculated_subtotal + calculated_tax;
  payable_now := case
    when target_settings.policy = 'full' then calculated_total
    else ceil(calculated_total * target_settings.deposit_percent / 100.0)
  end;
  remaining_balance := calculated_total - payable_now;
  new_reference := public.make_booking_reference();
  new_expiry := now() + make_interval(mins => target_settings.hold_minutes);
  breakdown := jsonb_build_object(
    'nights', requested_check_out - requested_check_in,
    'guests', requested_adults + requested_children,
    'subtotal_paise', calculated_subtotal,
    'tax_paise', calculated_tax,
    'total_paise', calculated_total,
    'payment_policy', target_settings.policy,
    'deposit_percent', target_settings.deposit_percent,
    'calculated_at', now()
  );

  insert into public.bookings (
    id, reference, property_id, category_id, guest_id, source, status,
    check_in, check_out, adults, children, currency,
    subtotal_paise, tax_paise, total_paise, amount_payable_now_paise, balance_paise,
    price_breakdown, cancellation_terms_snapshot, hold_expires_at, created_by
  ) values (
    new_booking_id, new_reference, target_property.id, target_category.id, current_user_id, 'online', 'hold',
    requested_check_in, requested_check_out, requested_adults, requested_children, 'INR',
    calculated_subtotal, calculated_tax, calculated_total, payable_now, remaining_balance,
    breakdown, target_settings.cancellation_terms, new_expiry, current_user_id
  );

  insert into public.inventory_allocations (
    property_id, room_id, booking_id, allocation_type, status,
    check_in, check_out, expires_at, created_by
  ) values (
    target_property.id, target_room_id, new_booking_id, 'hold', 'active',
    requested_check_in, requested_check_out, new_expiry, current_user_id
  );

  return query select new_booking_id, new_reference, new_expiry, calculated_total::integer, payable_now::integer, remaining_balance::integer, 'INR'::text;
end;
$$;

create or replace function public.create_room_block(
  target_room_id uuid,
  blocked_check_in date,
  blocked_check_out date,
  reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid;
  block_id uuid;
begin
  select room.property_id into target_property_id from public.rooms room where room.id = target_room_id;
  if target_property_id is null or not public.is_staff_for_property(target_property_id) then
    raise exception 'Forbidden';
  end if;
  if blocked_check_out <= blocked_check_in or nullif(trim(reason), '') is null then
    raise exception 'Invalid room block';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_room_id::text, 0));
  perform public.expire_inventory_holds();

  insert into public.inventory_allocations (
    property_id, room_id, allocation_type, status, check_in, check_out, block_reason, created_by
  ) values (
    target_property_id, target_room_id, 'block', 'active', blocked_check_in, blocked_check_out, reason, (select auth.uid())
  ) returning id into block_id;

  return block_id;
end;
$$;

create or replace function public.set_room_housekeeping_status(
  target_room_id uuid,
  next_status public.housekeeping_status
)
returns public.housekeeping_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid;
begin
  select room.property_id into target_property_id
  from public.rooms room
  where room.id = target_room_id;

  if target_property_id is null or not public.is_staff_for_property(target_property_id) then
    raise exception 'Forbidden';
  end if;

  insert into public.room_housekeeping (room_id, property_id, status, last_cleaned_at, updated_by)
  values (
    target_room_id,
    target_property_id,
    next_status,
    case when next_status = 'clean' then now() else null end,
    (select auth.uid())
  )
  on conflict (room_id) do update
  set status = excluded.status,
      last_cleaned_at = case
        when excluded.status = 'clean' then now()
        else public.room_housekeeping.last_cleaned_at
      end,
      updated_by = (select auth.uid()),
      updated_at = now();

  return next_status;
end;
$$;

create or replace function public.prepare_payment_attempt(target_booking_id uuid)
returns table (payment_id uuid, receipt text, amount_paise integer, currency text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_booking public.bookings%rowtype;
  new_payment_id uuid;
begin
  select booking.* into target_booking
  from public.bookings booking
  where booking.id = target_booking_id
    and booking.guest_id = (select auth.uid())
  for update;

  if target_booking.id is null then raise exception 'Booking not found'; end if;
  if target_booking.status not in ('hold', 'pending_payment') or target_booking.hold_expires_at <= now() then
    raise exception 'Booking hold has expired';
  end if;

  select payment.id into new_payment_id
  from public.payments payment
  where payment.booking_id = target_booking.id and payment.status in ('pending', 'authorized')
  limit 1;

  if new_payment_id is null then
    insert into public.payments (booking_id, amount_paise, currency)
    values (target_booking.id, target_booking.amount_payable_now_paise, target_booking.currency)
    returning id into new_payment_id;
  end if;

  update public.bookings set status = 'pending_payment' where id = target_booking.id;
  return query select new_payment_id, target_booking.reference, target_booking.amount_payable_now_paise, target_booking.currency::text;
end;
$$;

create or replace function public.attach_provider_order(target_payment_id uuid, razorpay_order_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments payment
  set provider_order_id = razorpay_order_id, updated_at = now()
  from public.bookings booking
  where payment.id = target_payment_id
    and booking.id = payment.booking_id
    and booking.guest_id = (select auth.uid())
    and payment.status = 'pending'
    and payment.provider_order_id is null;
  if not found then raise exception 'Payment attempt is not attachable'; end if;
end;
$$;

create or replace function public.record_verified_payment(
  razorpay_order_id text,
  razorpay_payment_id text,
  verified_amount_paise integer,
  verified_currency text
)
returns table (booking_id uuid, booking_status public.booking_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.payments%rowtype;
  target_booking public.bookings%rowtype;
  resulting_status public.booking_status;
begin
  select payment.* into target_payment
  from public.payments payment
  where payment.provider_order_id = razorpay_order_id
  for update;

  if target_payment.id is null then raise exception 'Unknown provider order'; end if;

  if target_payment.provider_payment_id is not null then
    if target_payment.provider_payment_id <> razorpay_payment_id then raise exception 'Provider payment mismatch'; end if;
    select booking.* into target_booking from public.bookings booking where booking.id = target_payment.booking_id;
    return query select target_booking.id, target_booking.status;
    return;
  end if;

  if target_payment.amount_paise <> verified_amount_paise or target_payment.currency <> verified_currency then
    raise exception 'Verified payment amount mismatch';
  end if;

  select booking.* into target_booking
  from public.bookings booking
  where booking.id = target_payment.booking_id
  for update;

  update public.payments
  set provider_payment_id = razorpay_payment_id,
      status = 'captured',
      verified_at = now(),
      updated_at = now()
  where id = target_payment.id;

  if target_booking.status in ('hold', 'pending_payment') and target_booking.hold_expires_at > now() then
    update public.bookings set status = 'confirmed', updated_at = now() where id = target_booking.id;
    update public.inventory_allocations
      set allocation_type = 'confirmed', expires_at = null, updated_at = now()
      where booking_id = target_booking.id and status = 'active';
    resulting_status := 'confirmed';
  else
    update public.bookings set status = 'payment_review', updated_at = now() where id = target_booking.id;
    update public.inventory_allocations
      set status = 'released', updated_at = now()
      where booking_id = target_booking.id and status = 'active' and allocation_type = 'hold';
    resulting_status := 'payment_review';
  end if;

  return query select target_booking.id, resulting_status;
end;
$$;

create or replace function public.audit_changed_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  target_property_id uuid;
  target_row_id uuid;
begin
  old_data := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_data := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  target_property_id := coalesce((new_data ->> 'property_id')::uuid, (old_data ->> 'property_id')::uuid);
  target_row_id := coalesce((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);

  if target_property_id is null and tg_table_name = 'payments' then
    select booking.property_id into target_property_id
    from public.bookings booking
    where booking.id = coalesce((new_data ->> 'booking_id')::uuid, (old_data ->> 'booking_id')::uuid);
  end if;

  insert into public.audit_log (property_id, actor_user_id, table_name, row_id, action, old_values, new_values)
  values (target_property_id, (select auth.uid()), tg_table_name, target_row_id, tg_op, old_data, new_data);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger audit_room_changes after insert or update or delete on public.rooms for each row execute function public.audit_changed_row();
create trigger audit_housekeeping_changes after insert or update or delete on public.room_housekeeping for each row execute function public.audit_changed_row();
create trigger audit_rate_changes after insert or update or delete on public.rates for each row execute function public.audit_changed_row();
create trigger audit_booking_changes after insert or update or delete on public.bookings for each row execute function public.audit_changed_row();
create trigger audit_allocation_changes after insert or update or delete on public.inventory_allocations for each row execute function public.audit_changed_row();
create trigger audit_payment_changes after insert or update or delete on public.payments for each row execute function public.audit_changed_row();
create trigger audit_membership_changes after insert or update or delete on public.staff_memberships for each row execute function public.audit_changed_row();

alter table public.properties enable row level security;
alter table public.booking_settings enable row level security;
alter table public.room_categories enable row level security;
alter table public.rooms enable row level security;
alter table public.room_housekeeping enable row level security;
alter table public.rates enable row level security;
alter table public.guests enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.bookings enable row level security;
alter table public.inventory_allocations enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.properties, public.booking_settings, public.room_categories, public.rooms,
  public.room_housekeeping, public.rates, public.guests, public.staff_memberships, public.bookings,
  public.inventory_allocations, public.payments, public.refunds,
  public.payment_webhook_events, public.audit_log from anon, authenticated;

grant select on public.properties, public.room_categories to anon, authenticated;
grant select, update on public.guests to authenticated;
grant select on public.staff_memberships, public.booking_settings, public.rooms, public.rates,
  public.room_housekeeping, public.bookings, public.inventory_allocations, public.payments, public.refunds, public.audit_log to authenticated;

create policy properties_public_read on public.properties for select to anon, authenticated
  using (status = 'active');
create policy properties_staff_read on public.properties for select to authenticated
  using (public.is_staff_for_property(id));
create policy categories_public_read on public.room_categories for select to anon, authenticated
  using (is_active);
create policy categories_staff_read on public.room_categories for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy guests_read_own on public.guests for select to authenticated using (id = (select auth.uid()));
create policy guests_update_own on public.guests for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy memberships_read_scope on public.staff_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_group_admin());
create policy settings_staff_read on public.booking_settings for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy rooms_staff_read on public.rooms for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy housekeeping_staff_read on public.room_housekeeping for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy rates_staff_read on public.rates for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy bookings_guest_or_staff_read on public.bookings for select to authenticated
  using (guest_id = (select auth.uid()) or public.is_staff_for_property(property_id));
create policy allocations_staff_read on public.inventory_allocations for select to authenticated
  using (public.is_staff_for_property(property_id));
create policy payments_guest_or_staff_read on public.payments for select to authenticated
  using (exists (
    select 1 from public.bookings booking
    where booking.id = payments.booking_id
      and (booking.guest_id = (select auth.uid()) or public.is_staff_for_property(booking.property_id))
  ));
create policy refunds_guest_or_staff_read on public.refunds for select to authenticated
  using (exists (
    select 1 from public.bookings booking
    where booking.id = refunds.booking_id
      and (booking.guest_id = (select auth.uid()) or public.is_staff_for_property(booking.property_id))
  ));
create policy audit_staff_read on public.audit_log for select to authenticated
  using (property_id is not null and public.is_staff_for_property(property_id));

revoke all on function public.is_group_admin() from public;
revoke all on function public.is_staff_for_property(uuid) from public;
revoke all on function public.expire_inventory_holds() from public;
revoke all on function public.search_public_availability(text, date, date, integer) from public;
revoke all on function public.create_online_inventory_hold(text, uuid, date, date, integer, integer) from public;
revoke all on function public.create_room_block(uuid, date, date, text) from public;
revoke all on function public.set_room_housekeeping_status(uuid, public.housekeeping_status) from public;
revoke all on function public.prepare_payment_attempt(uuid) from public;
revoke all on function public.attach_provider_order(uuid, text) from public;
revoke all on function public.record_verified_payment(text, text, integer, text) from public;

grant execute on function public.is_group_admin() to authenticated;
grant execute on function public.is_staff_for_property(uuid) to authenticated;
grant execute on function public.search_public_availability(text, date, date, integer) to anon, authenticated;
grant execute on function public.create_online_inventory_hold(text, uuid, date, date, integer, integer) to authenticated;
grant execute on function public.create_room_block(uuid, date, date, text) to authenticated;
grant execute on function public.set_room_housekeeping_status(uuid, public.housekeeping_status) to authenticated;
grant execute on function public.prepare_payment_attempt(uuid) to authenticated;
grant execute on function public.attach_provider_order(uuid, text) to authenticated;
grant execute on function public.record_verified_payment(text, text, integer, text) to service_role;
grant execute on function public.expire_inventory_holds() to service_role;
