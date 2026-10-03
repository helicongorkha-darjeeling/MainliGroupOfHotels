-- Standalone pre-payment capture. This does not activate inventory or payments.
-- May also be run by the project owner in the hosted Supabase SQL Editor.
begin;

create schema if not exists checkout_private;

create table checkout_private.draft_rate_limits (
  rate_key text not null check (rate_key ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (rate_key, window_start)
);
alter table checkout_private.draft_rate_limits enable row level security;
revoke all on table checkout_private.draft_rate_limits from public, anon, authenticated, service_role;

create table public.booking_drafts (
  id uuid primary key,
  browser_session_hash text not null check (browser_session_hash ~ '^[a-f0-9]{64}$'),
  property_slug text not null default 'hotel-teesta' check (property_slug = 'hotel-teesta'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  room_type text not null check (room_type in ('double-room', 'triple-room', 'four-person-room', 'family-room-sofa')),
  check_in date not null,
  check_out date not null check (check_out > check_in and check_out - check_in <= 366),
  guests integer not null check (guests between 1 and 12),
  rooms integer not null check (rooms between 1 and 6),
  starting_total_paise bigint check (starting_total_paise is null or starting_total_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'draft' check (status = 'draft'),
  email_verified boolean not null default false check (email_verified = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
comment on table public.booking_drafts is 'Unverified checkout details only: no room hold, confirmed booking, payment, or marketing consent.';
comment on column public.booking_drafts.starting_total_paise is 'Indicative room-only starting price, not a payable or tax-inclusive final quote. Null for unapproved layouts.';
create index booking_drafts_expires_at_idx on public.booking_drafts (expires_at);
alter table public.booking_drafts enable row level security;
revoke all on table public.booking_drafts from public, anon, authenticated, service_role;
grant select on table public.booking_drafts to service_role;

create function public.save_checkout_draft(
  requested_draft_id uuid,
  browser_session_hash text,
  request_rate_key text,
  guest_full_name text,
  guest_email text,
  guest_phone text,
  selected_room_type text,
  stay_check_in date,
  stay_check_out date,
  party_guests integer
)
returns table (draft_id uuid, saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  attempt_count integer;
  room_capacity integer;
  room_count integer;
  starting_price bigint;
  written_id uuid;
  written_at timestamptz;
begin
  if requested_draft_id is null or browser_session_hash is null or browser_session_hash !~ '^[a-f0-9]{64}$'
    or request_rate_key is null or request_rate_key !~ '^[a-f0-9]{64}$'
    or guest_full_name is null or char_length(btrim(guest_full_name)) not between 2 and 120
    or guest_email is null or char_length(guest_email) > 254 or guest_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or guest_phone is null or guest_phone !~ '^\+[1-9][0-9]{7,14}$'
    or selected_room_type is null or selected_room_type not in ('double-room', 'triple-room', 'four-person-room', 'family-room-sofa')
    or party_guests is null or party_guests not between 1 and 12
    or stay_check_in is null or stay_check_out is null
    or stay_check_in < (now() at time zone 'Asia/Kolkata')::date
    or stay_check_out <= stay_check_in or stay_check_out - stay_check_in > 366 then
    raise exception using errcode = 'PT400', message = 'Invalid checkout details';
  end if;

  -- Atomic database quota works across Vercel instances; no raw IP is persisted.
  insert into checkout_private.draft_rate_limits as limits (rate_key, window_start, attempts)
  values (request_rate_key, current_window, 1)
  on conflict (rate_key, window_start) do update set attempts = limits.attempts + 1
  returning attempts into attempt_count;
  if attempt_count > 20 then
    raise exception using errcode = 'PT429', message = 'Too many checkout attempts';
  end if;

  room_capacity := case selected_room_type
    when 'double-room' then 2 when 'triple-room' then 3
    when 'four-person-room' then 4 when 'family-room-sofa' then 6 end;
  room_count := ceil(party_guests::numeric / room_capacity)::integer;
  starting_price := case when selected_room_type = 'double-room'
    then ((party_guests / 2) * 250000::bigint + (party_guests % 2) * 150000::bigint) * (stay_check_out - stay_check_in)
    else null end;

  insert into public.booking_drafts as drafts (
    id, browser_session_hash, full_name, email, phone, room_type,
    check_in, check_out, guests, rooms, starting_total_paise
  ) values (
    requested_draft_id, browser_session_hash, btrim(guest_full_name), lower(btrim(guest_email)), guest_phone,
    selected_room_type, stay_check_in, stay_check_out, party_guests, room_count, starting_price
  )
  on conflict (id) do update set
    full_name = excluded.full_name, email = excluded.email, phone = excluded.phone,
    room_type = excluded.room_type, check_in = excluded.check_in, check_out = excluded.check_out,
    guests = excluded.guests, rooms = excluded.rooms, starting_total_paise = excluded.starting_total_paise,
    updated_at = now(), expires_at = now() + interval '7 days'
  where drafts.browser_session_hash = excluded.browser_session_hash and drafts.expires_at > now()
  returning id, updated_at into written_id, written_at;
  if written_id is null then
    raise exception using errcode = 'PT409', message = 'Checkout draft unavailable';
  end if;
  return query select written_id, written_at;
end;
$$;

revoke execute on function public.save_checkout_draft(uuid, text, text, text, text, text, text, date, date, integer) from public, anon, authenticated;
grant execute on function public.save_checkout_draft(uuid, text, text, text, text, text, text, date, date, integer) to service_role;

notify pgrst, 'reload schema';
commit;
