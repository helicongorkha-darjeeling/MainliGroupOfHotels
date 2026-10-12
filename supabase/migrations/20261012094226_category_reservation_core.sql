-- Standalone category-reservation core. Does not depend on the unshipped physical-room hold migrations.
create table public.hotel_booking_settings (
  slug text primary key,
  online_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  tax_rate_bps integer check (tax_rate_bps between 0 and 10000),
  solo_paise integer not null default 200000 check (solo_paise > 0),
  couple_paise integer not null default 250000 check (couple_paise > 0),
  group_per_guest_paise integer not null default 120000 check (group_per_guest_paise > 0),
  cancellation_terms text,
  check_in_time time,
  check_out_time time
);
create table public.hotel_inventory_categories (
  code text primary key,
  name text not null,
  capacity integer not null check (capacity between 1 and 6),
  online_enabled boolean not null default false
);
create table public.hotel_inventory_rooms (
  number text primary key,
  category text not null references public.hotel_inventory_categories(code),
  active boolean not null default true,
  housekeeping text not null default 'unknown' check (housekeeping in ('unknown','clean','dirty','out_of_service'))
);
create table public.hotel_staff (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('manager','reception')),
  active boolean not null default true
);
create table public.hotel_seasonal_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  solo_paise integer not null check (solo_paise > 0),
  couple_paise integer not null check (couple_paise > 0),
  group_per_guest_paise integer not null check (group_per_guest_paise > 0),
  active boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
-- Seasonal changes are serialized under the settings row; overlapping active seasons are refused by staff RPC.
create table public.hotel_reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('MH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id),
  category text not null references public.hotel_inventory_categories(code),
  check_in date not null,
  check_out date not null check (check_out > check_in and check_out - check_in <= 30),
  guests integer not null check (guests between 1 and 12),
  rooms integer not null check (rooms between 1 and 12),
  full_name text not null check (length(full_name) between 2 and 120),
  email text not null check (length(email) <= 254),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null check (status in ('tentative','payment_pending','confirmed','checked_in','checked_out','cancelled','expired','payment_review')),
  hold_until timestamptz,
  subtotal_paise bigint not null check (subtotal_paise > 0),
  tax_paise bigint,
  total_paise bigint not null check (total_paise > 0),
  nightly_prices jsonb not null,
  order_id text unique,
  payment_id text unique,
  paid_paise bigint not null default 0,
  payment_review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hotel_reservations_capacity on public.hotel_reservations(category, check_in, check_out) where status in ('tentative','payment_pending','confirmed','checked_in');
create index hotel_reservations_guest on public.hotel_reservations(user_id, created_at desc);
create index hotel_reservations_expiry on public.hotel_reservations(hold_until) where status in ('tentative','payment_pending');
create table public.hotel_inventory_blocks (
  id uuid primary key default gen_random_uuid(),
  room_number text not null references public.hotel_inventory_rooms(number),
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on),
  reason text not null,
  active boolean not null default true
);
create index hotel_blocks_dates on public.hotel_inventory_blocks(room_number, starts_on, ends_on) where active;
create table public.hotel_room_assignments (
  reservation_id uuid not null references public.hotel_reservations(id),
  room_number text not null references public.hotel_inventory_rooms(number),
  primary key(reservation_id,room_number)
);
create table public.hotel_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.hotel_reservations(id),
  kind text not null check (kind in ('tentative_receipt','confirmation','hold_reminder','arrival_reminder','payment_review')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  locked_until timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique(reservation_id,kind)
);
create table public.hotel_booking_audit (
  id bigint generated always as identity primary key,
  reservation_id uuid references public.hotel_reservations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  created_at timestamptz not null default now()
);

-- Browser roles may only read their own bookings and their own staff membership.
alter table public.hotel_booking_settings enable row level security;
alter table public.hotel_inventory_categories enable row level security;
alter table public.hotel_inventory_rooms enable row level security;
alter table public.hotel_staff enable row level security;
alter table public.hotel_seasonal_rates enable row level security;
alter table public.hotel_reservations enable row level security;
alter table public.hotel_inventory_blocks enable row level security;
alter table public.hotel_room_assignments enable row level security;
alter table public.hotel_notification_jobs enable row level security;
alter table public.hotel_booking_audit enable row level security;
revoke all on public.hotel_booking_settings, public.hotel_inventory_categories, public.hotel_inventory_rooms, public.hotel_staff, public.hotel_seasonal_rates, public.hotel_reservations, public.hotel_inventory_blocks, public.hotel_room_assignments, public.hotel_notification_jobs, public.hotel_booking_audit from anon, authenticated;
grant all on public.hotel_booking_settings, public.hotel_inventory_categories, public.hotel_inventory_rooms, public.hotel_staff, public.hotel_seasonal_rates, public.hotel_reservations, public.hotel_inventory_blocks, public.hotel_room_assignments, public.hotel_notification_jobs, public.hotel_booking_audit to service_role;
grant usage, select on sequence public.hotel_booking_audit_id_seq to service_role;
grant select on public.hotel_reservations, public.hotel_staff to authenticated;
create policy hotel_guest_read on public.hotel_reservations for select to authenticated using (user_id = (select auth.uid()));
create policy hotel_staff_self on public.hotel_staff for select to authenticated using (user_id = (select auth.uid()));

insert into public.hotel_booking_settings(slug) values ('hotel-teesta');
insert into public.hotel_inventory_categories(code,name,capacity) values
 ('double-room','Double Room',2),('triple-room','Triple Room',3),('four-person-room','Four-person Room',4),('six-person-room','Six-person Room',6);

create function public.hotel_quote(stay_in date, stay_out date, party_guests integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare settings public.hotel_booking_settings; day date; season public.hotel_seasonal_rates; amount bigint; subtotal bigint := 0; tax bigint; breakdown jsonb := '[]';
begin
  if stay_in is null or stay_out is null or party_guests is null or party_guests not between 1 and 12 or stay_in < (now() at time zone 'Asia/Kolkata')::date or stay_out <= stay_in or stay_out-stay_in > 30 then
    raise exception using errcode='PT400', message='Choose a valid stay of up to 30 nights';
  end if;
  select * into strict settings from public.hotel_booking_settings where slug='hotel-teesta';
  for day in select d::date from generate_series(stay_in::timestamp,(stay_out-1)::timestamp,interval '1 day') d loop
    select * into season from public.hotel_seasonal_rates where active and starts_on <= day and ends_on > day order by starts_on desc limit 1;
    amount := case when party_guests=1 then coalesce(season.solo_paise,settings.solo_paise)
      when party_guests=2 then coalesce(season.couple_paise,settings.couple_paise)
      else party_guests::bigint*coalesce(season.group_per_guest_paise,settings.group_per_guest_paise) end;
    subtotal := subtotal+amount;
    breakdown := breakdown || jsonb_build_array(jsonb_build_object('date',day,'amountPaise',amount,'rateName',coalesce(season.name,'Standard rate')));
  end loop;
  tax := case when settings.tax_rate_bps is null then null else round(subtotal*settings.tax_rate_bps/10000.0)::bigint end;
  return jsonb_build_object('subtotalPaise',subtotal,'taxPaise',tax,'totalPaise',subtotal+coalesce(tax,0),'taxConfirmed',tax is not null,'nights',stay_out-stay_in,'nightlyPrices',breakdown);
end $$;

create function public.hotel_capacity(category_code text, stay_in date, stay_out date)
returns integer language sql stable security invoker set search_path = '' as $$
  select coalesce(min(available),0)::integer from (
    select (select count(*) from public.hotel_inventory_rooms r where r.category=category_code and r.active and r.housekeeping <> 'out_of_service'
      and not exists (select 1 from public.hotel_inventory_blocks b where b.room_number=r.number and b.active and b.starts_on<=d::date and b.ends_on>d::date))
      - coalesce((select sum(b.rooms) from public.hotel_reservations b where b.category=category_code and b.check_in<=d::date and b.check_out>d::date
        and (b.status in ('confirmed','checked_in') or (b.status in ('tentative','payment_pending') and b.hold_until>now()))),0) as available
    from generate_series(stay_in::timestamp,(stay_out-1)::timestamp,interval '1 day') d
  ) nights;
$$;

create function public.hotel_search(stay_in date, stay_out date, party_guests integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare quote jsonb; choices jsonb; settings public.hotel_booking_settings;
begin
  quote := public.hotel_quote(stay_in,stay_out,party_guests);
  select * into strict settings from public.hotel_booking_settings where slug='hotel-teesta';
  select coalesce(jsonb_agg(jsonb_build_object('code',code,'name',name,'capacity',capacity,'rooms',ceil(party_guests::numeric/capacity)::integer,
    'availableRooms',greatest(0,public.hotel_capacity(code,stay_in,stay_out)),'bookable',online_enabled and settings.online_enabled,
    'quote',quote) order by (ceil(party_guests::numeric/capacity)*capacity-party_guests),ceil(party_guests::numeric/capacity),capacity),'[]') into choices
    from public.hotel_inventory_categories;
  return jsonb_build_object('onlineEnabled',settings.online_enabled,'paymentsEnabled',settings.payments_enabled,'choices',choices);
end $$;

create function public.hotel_reserve(request_key uuid, guest_user uuid, category_code text, stay_in date, stay_out date, party_guests integer,
  guest_name text, guest_email text, guest_phone text, reservation_kind text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare settings public.hotel_booking_settings; category_row public.hotel_inventory_categories; booking public.hotel_reservations; needed integer; quote jsonb;
begin
  -- One row serializes every capacity mutation for this 25-room property. No provider calls occur under this lock.
  select * into strict settings from public.hotel_booking_settings where slug='hotel-teesta' for update;
  if not settings.online_enabled then raise exception using errcode='PT503',message='Online reservations are not enabled'; end if;
  if reservation_kind not in ('tentative','payment_pending') or request_key is null or guest_user is null or length(btrim(guest_name)) not between 2 and 120 or guest_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or guest_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception using errcode='PT400',message='Invalid reservation'; end if;
  -- Only service_role can execute; the gateway validates getUser() and verified contact ownership.
  select * into booking from public.hotel_reservations where request_id=request_key;
  if found then
    if booking.user_id<>guest_user or booking.category<>category_code or booking.check_in<>stay_in or booking.check_out<>stay_out or booking.guests<>party_guests then raise exception using errcode='PT409',message='Reservation request already used'; end if;
    return to_jsonb(booking);
  end if;
  if (select count(*) from public.hotel_reservations where user_id=guest_user and status in ('tentative','payment_pending') and hold_until>now())>=3 then raise exception using errcode='PT429',message='Complete an existing reservation before holding more rooms'; end if;
  select * into strict category_row from public.hotel_inventory_categories where code=category_code;
  if not category_row.online_enabled then raise exception using errcode='PT409',message='This category is not available online'; end if;
  quote:=public.hotel_quote(stay_in,stay_out,party_guests);
  if reservation_kind='payment_pending' and (not settings.payments_enabled or settings.tax_rate_bps is null) then raise exception using errcode='PT503',message='Payment configuration is incomplete'; end if;
  needed:=ceil(party_guests::numeric/category_row.capacity)::integer;
  if public.hotel_capacity(category_code,stay_in,stay_out)<needed then raise exception using errcode='PT409',message='These rooms were just taken. Choose another stay'; end if;
  insert into public.hotel_reservations(request_id,user_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,hold_until,subtotal_paise,tax_paise,total_paise,nightly_prices)
  values(request_key,guest_user,category_code,stay_in,stay_out,party_guests,needed,btrim(guest_name),lower(btrim(guest_email)),guest_phone,reservation_kind,
    now()+case when reservation_kind='tentative' then interval '24 hours' else interval '15 minutes' end,
    (quote->>'subtotalPaise')::bigint,(quote->>'taxPaise')::bigint,(quote->>'totalPaise')::bigint,quote->'nightlyPrices') returning * into booking;
  insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(booking.id,guest_user,'reservation_created');
  if reservation_kind='tentative' then
    insert into public.hotel_notification_jobs(reservation_id,kind,scheduled_at) values(booking.id,'tentative_receipt',now()),(booking.id,'hold_reminder',booking.hold_until-interval '2 hours');
  end if;
  return to_jsonb(booking);
end $$;

create function public.hotel_record_payment(provider_order text, provider_payment text, paid_amount bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare booking public.hotel_reservations; retained boolean;
begin
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  select * into strict booking from public.hotel_reservations where order_id=provider_order for update;
  if booking.payment_id=provider_payment then return to_jsonb(booking); end if;
  if booking.payment_id is not null or paid_amount<>booking.total_paise then raise exception using errcode='PT409',message='Payment mismatch'; end if;
  retained:=booking.status in ('tentative','payment_pending') and booking.hold_until>now();
  update public.hotel_reservations set payment_id=provider_payment,paid_paise=paid_amount,
    status=case when retained then 'confirmed' else 'payment_review' end,hold_until=null,
    payment_review_reason=case when retained then null else 'Payment captured after inventory hold ended; refund or manual resolution required' end,updated_at=now()
    where id=booking.id returning * into booking;
  insert into public.hotel_notification_jobs(reservation_id,kind,scheduled_at) values(booking.id,case when retained then 'confirmation' else 'payment_review' end,now()) on conflict do nothing;
  if retained then insert into public.hotel_notification_jobs(reservation_id,kind,scheduled_at) values(booking.id,'arrival_reminder',greatest(now(),booking.check_in::timestamp at time zone 'Asia/Kolkata'-interval '2 days')) on conflict do nothing; end if;
  insert into public.hotel_booking_audit(reservation_id,action) values(booking.id,case when retained then 'payment_confirmed' else 'late_payment_review' end);
  return to_jsonb(booking);
end $$;

create function public.hotel_expire_holds() returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  update public.hotel_reservations set status='expired',updated_at=now() where status in ('tentative','payment_pending') and hold_until<=now();
  get diagnostics affected=row_count; return affected;
end $$;

revoke execute on function public.hotel_quote(date,date,integer), public.hotel_capacity(text,date,date), public.hotel_search(date,date,integer), public.hotel_reserve(uuid,uuid,text,date,date,integer,text,text,text,text), public.hotel_record_payment(text,text,bigint), public.hotel_expire_holds() from public,anon,authenticated;
grant execute on function public.hotel_quote(date,date,integer), public.hotel_capacity(text,date,date), public.hotel_search(date,date,integer), public.hotel_reserve(uuid,uuid,text,date,date,integer,text,text,text,text), public.hotel_record_payment(text,text,bigint), public.hotel_expire_holds() to service_role;
notify pgrst,'reload schema';

-- Owner authorised publishing the supplied 25-room inventory on 13 October 2026.
insert into public.hotel_inventory_rooms(number,category) values
('301','double-room'),
('302','double-room'),
('303','double-room'),
('304','double-room'),
('305','double-room'),
('306','triple-room'),
('307','four-person-room'),
('308','four-person-room'),
('309','four-person-room'),
('310','double-room'),
('311','double-room'),
('312','double-room'),
('313','double-room'),
('314','double-room'),
('315','four-person-room'),
('316','four-person-room'),
('317','four-person-room'),
('318','triple-room'),
('319','double-room'),
('320','double-room'),
('321','double-room'),
('322','double-room'),
('323','triple-room'),
('324','six-person-room'),
('325','triple-room');
update public.hotel_inventory_categories set online_enabled=true;
update public.hotel_booking_settings set online_enabled=true where slug='hotel-teesta';

do $pricing$
declare definition text;
begin
  definition:=pg_get_functiondef('public.save_checkout_draft(uuid,text,text,text,text,text,text,date,date,integer)'::regprocedure);
  if strpos(definition,'room_count * 250000::bigint')=0 then raise exception 'Unexpected draft pricing definition'; end if;
  execute replace(definition,'room_count * 250000::bigint','(case when party_guests=1 then 200000::bigint when party_guests=2 then 250000::bigint else party_guests*120000::bigint end)');
end $pricing$;

create function public.hotel_staff_change(actor uuid, change jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare staff_role text; booking public.hotel_reservations; room_row public.hotel_inventory_rooms; action text:=change->>'action'; assigned integer;
begin
  select role into staff_role from public.hotel_staff where user_id=actor and active;
  if staff_role is null then raise exception using errcode='PT403',message='Staff access required'; end if;
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  if action in ('confirm','cancel','check_in','check_out','assign') then
    select * into strict booking from public.hotel_reservations where id=(change->>'reservationId')::uuid for update;
    if action='confirm' then
      if booking.status<>'tentative' or booking.hold_until<=now() then raise exception using errcode='PT409',message='Tentative hold has ended'; end if;
      update public.hotel_reservations set status='confirmed',hold_until=null,updated_at=now() where id=booking.id;
      insert into public.hotel_notification_jobs(reservation_id,kind,scheduled_at) values(booking.id,'confirmation',now()),(booking.id,'arrival_reminder',greatest(now(),booking.check_in::timestamp at time zone 'Asia/Kolkata'-interval '2 days')) on conflict do nothing;
    elsif action='cancel' then
      if booking.paid_paise>0 then raise exception using errcode='PT409',message='Paid bookings require a refund review before cancellation'; end if;
      if booking.status not in ('tentative','payment_pending','confirmed') then raise exception using errcode='PT409',message='Booking cannot be cancelled in its current state'; end if;
      update public.hotel_reservations set status='cancelled',hold_until=null,updated_at=now() where id=booking.id;
    elsif action='check_in' then
      select count(*) into assigned from public.hotel_room_assignments where reservation_id=booking.id;
      if booking.status<>'confirmed' or assigned<>booking.rooms or booking.check_in>(now() at time zone 'Asia/Kolkata')::date then raise exception using errcode='PT409',message='Confirm and assign every room before check-in'; end if;
      update public.hotel_reservations set status='checked_in',updated_at=now() where id=booking.id;
    elsif action='check_out' then
      if booking.status<>'checked_in' then raise exception using errcode='PT409',message='Guest is not checked in'; end if;
      update public.hotel_reservations set status='checked_out',updated_at=now() where id=booking.id;
      update public.hotel_inventory_rooms set housekeeping='dirty' where number in (select room_number from public.hotel_room_assignments where reservation_id=booking.id);
    elsif action='assign' then
      if booking.status<>'confirmed' or jsonb_typeof(change->'rooms')<>'array' or jsonb_array_length(change->'rooms')<>booking.rooms then raise exception using errcode='PT409',message='Choose the exact number of rooms for a confirmed booking'; end if;
      if (select count(distinct v) from jsonb_array_elements_text(change->'rooms') v)<>booking.rooms then raise exception using errcode='PT400',message='Duplicate room assignment'; end if;
      if exists(select 1 from jsonb_array_elements_text(change->'rooms') v where not exists(select 1 from public.hotel_inventory_rooms r where r.number=v and r.category=booking.category and r.active and r.housekeeping<>'out_of_service')
        or exists(select 1 from public.hotel_room_assignments a join public.hotel_reservations other on other.id=a.reservation_id where a.room_number=v and other.id<>booking.id and other.status in ('confirmed','checked_in') and other.check_in<booking.check_out and other.check_out>booking.check_in)
        or exists(select 1 from public.hotel_inventory_blocks b where b.room_number=v and b.active and b.starts_on<booking.check_out and b.ends_on>booking.check_in)) then raise exception using errcode='PT409',message='A selected room is unavailable or in a different category'; end if;
      delete from public.hotel_room_assignments where reservation_id=booking.id;
      insert into public.hotel_room_assignments(reservation_id,room_number) select booking.id,v from jsonb_array_elements_text(change->'rooms') v;
    end if;
    insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(booking.id,actor,action);
  elsif action='housekeeping' then
    if change->>'status' not in ('unknown','clean','dirty','out_of_service') then raise exception using errcode='PT400',message='Invalid room status'; end if;
    select * into strict room_row from public.hotel_inventory_rooms where number=change->>'roomNumber';
    update public.hotel_inventory_rooms set housekeeping=change->>'status' where number=room_row.number;
    if change->>'status'='out_of_service' and exists(select 1 from public.hotel_reservations b where b.category=room_row.category and b.check_out>(now() at time zone 'Asia/Kolkata')::date and b.status in ('confirmed','checked_in','tentative','payment_pending') and public.hotel_capacity(room_row.category,greatest(b.check_in,(now() at time zone 'Asia/Kolkata')::date),b.check_out)<0) then raise exception using errcode='PT409',message='Move or resolve existing bookings before blocking this capacity'; end if;
    insert into public.hotel_booking_audit(actor_id,action) values(actor,'housekeeping:'||room_row.number||':'||(change->>'status'));
  elsif action='season' then
    if staff_role<>'manager' then raise exception using errcode='PT403',message='Manager access required'; end if;
    if exists(select 1 from public.hotel_seasonal_rates where active and starts_on<(change->>'endsOn')::date and ends_on>(change->>'startsOn')::date) then raise exception using errcode='PT409',message='This season overlaps an existing active season'; end if;
    insert into public.hotel_seasonal_rates(name,starts_on,ends_on,solo_paise,couple_paise,group_per_guest_paise,active,created_by)
    values(change->>'name',(change->>'startsOn')::date,(change->>'endsOn')::date,(change->>'soloPaise')::integer,(change->>'couplePaise')::integer,(change->>'perGuestPaise')::integer,true,actor);
    insert into public.hotel_booking_audit(actor_id,action) values(actor,'season_created');
  else raise exception using errcode='PT400',message='Unknown staff action'; end if;
  return jsonb_build_object('saved',true);
end $$;

create function public.hotel_claim_notifications() returns setof public.hotel_notification_jobs
language sql security invoker set search_path='' as $$
  update public.hotel_notification_jobs j set locked_until=now()+interval '2 minutes',attempts=j.attempts+1
  where j.id in (select n.id from public.hotel_notification_jobs n join public.hotel_reservations b on b.id=n.reservation_id
    where n.sent_at is null and n.scheduled_at<=now() and (n.locked_until is null or n.locked_until<now()) and n.attempts<5
      and ((n.kind in ('tentative_receipt','hold_reminder') and b.status='tentative' and b.hold_until>now())
        or (n.kind in ('confirmation','arrival_reminder') and b.status in ('confirmed','checked_in')) or (n.kind='payment_review' and b.status='payment_review'))
    order by n.scheduled_at limit 25 for update of n skip locked)
  returning j.*;
$$;
revoke execute on function public.hotel_staff_change(uuid,jsonb),public.hotel_claim_notifications() from public,anon,authenticated;
grant execute on function public.hotel_staff_change(uuid,jsonb),public.hotel_claim_notifications() to service_role;
