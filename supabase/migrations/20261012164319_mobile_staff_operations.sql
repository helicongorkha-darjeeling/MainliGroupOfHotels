-- Additive staff operations. Apply only after the October category core; never replay old seeds.
alter table public.hotel_staff drop constraint hotel_staff_role_check;
alter table public.hotel_staff add constraint hotel_staff_role_check check (role in ('manager','reception','housekeeping'));
alter table public.hotel_staff add column name text not null default 'Staff';
alter table public.hotel_staff add column username text;
alter table public.hotel_staff add column auth_email text;
alter table public.hotel_staff add constraint hotel_staff_name_check check (length(btrim(name)) between 2 and 120);
alter table public.hotel_staff add constraint hotel_staff_username_check check (username is null or username ~ '^[A-Za-z][A-Za-z0-9_.-]{2,39}$');
create unique index hotel_staff_username_unique on public.hotel_staff(lower(username)) where username is not null;
update public.hotel_staff s set auth_email=u.email,name=case when length(btrim(u.raw_user_meta_data->>'full_name')) between 2 and 120 then btrim(u.raw_user_meta_data->>'full_name') else 'Staff' end from auth.users u where u.id=s.user_id;
-- Walk-in guests do not need an Auth account and never become the staff member's personal bookings.
alter table public.hotel_reservations alter column user_id drop not null;
alter table public.hotel_reservations add column tax_rate_bps integer check (tax_rate_bps between 0 and 10000);
alter table public.hotel_reservations add column paid_at timestamptz;
create index hotel_reservations_recent_idx on public.hotel_reservations(created_at desc);
-- Preserve the original quote's tax basis even if the manager later changes settings.
update public.hotel_reservations b set tax_rate_bps=case when b.tax_paise is null then null
  when b.tax_paise=round(b.subtotal_paise*s.tax_rate_bps/10000.0) then s.tax_rate_bps
  else round(b.tax_paise*10000.0/b.subtotal_paise)::integer end from public.hotel_booking_settings s where s.slug='hotel-teesta';
create function public.hotel_capture_reservation_tax() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.tax_paise is not null and new.tax_rate_bps is null and (tg_op='INSERT' or old.tax_paise is null) then
    select tax_rate_bps into new.tax_rate_bps from public.hotel_booking_settings where slug='hotel-teesta';
  end if;
  return new;
end $$;
create trigger hotel_reservation_tax_basis before insert or update of tax_paise on public.hotel_reservations for each row execute function public.hotel_capture_reservation_tax();
alter table public.hotel_booking_settings add column legal_name text;
alter table public.hotel_booking_settings add column legal_address text;
alter table public.hotel_booking_settings add column gstin text;

create table public.hotel_stays (
  reservation_id uuid primary key references public.hotel_reservations(id),
  source text not null default 'direct_website' check (source in ('direct_website','walk_in','phone','makemytrip','goibibo','booking_com','agoda','airbnb','expedia','other')),
  source_other text, ota_reference text, address text, nationality text,
  adults integer check (adults between 1 and 12), children integer check (children between 0 and 11),
  id_type text check (id_type in ('aadhaar','passport','voter_id','driving_licence','pan','other')), id_number text,
  passport_number text, visa_number text, visa_expiry date,
  checked_in_at timestamptz, checked_in_by uuid references auth.users(id),
  expected_check_out date not null, checked_out_at timestamptz, checked_out_by uuid references auth.users(id),
  allow_balance_due boolean not null default false, allow_balance_by uuid references auth.users(id),
  id_front_path text, id_back_path text, tax_rate_bps integer check (tax_rate_bps between 0 and 10000)
);
insert into public.hotel_stays(reservation_id,expected_check_out,tax_rate_bps)
select b.id,b.check_out,b.tax_rate_bps from public.hotel_reservations b;
create table public.hotel_room_status_audit (
  id bigint generated always as identity primary key, room_number text not null references public.hotel_inventory_rooms(number),
  previous_status text not null, new_status text not null, actor_id uuid not null references auth.users(id),
  housekeeper_id uuid references public.hotel_staff(user_id), housekeeper_name text, reservation_id uuid references public.hotel_reservations(id),
  created_at timestamptz not null default clock_timestamp()
);
create table public.hotel_stay_audit (
  id bigint generated always as identity primary key,reservation_id uuid not null references public.hotel_reservations(id),actor_id uuid not null references auth.users(id),
  action text not null,previous_value jsonb,new_value jsonb,reason text,created_at timestamptz not null default clock_timestamp()
);
create index hotel_room_status_audit_room_idx on public.hotel_room_status_audit(room_number,created_at desc);
create index hotel_stay_audit_reservation_idx on public.hotel_stay_audit(reservation_id,created_at desc);
create table public.hotel_folio_items (
  id uuid primary key default gen_random_uuid(),request_id uuid not null unique,reservation_id uuid not null references public.hotel_reservations(id),
  kind text not null check (kind in ('charge','discount')),description text not null check (length(btrim(description)) between 2 and 200),
  amount_paise bigint not null check (amount_paise between 1 and 100000000),tax_rate_bps integer check (tax_rate_bps between 0 and 10000),
  created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp()
);
create index hotel_folio_items_reservation on public.hotel_folio_items(reservation_id);
create table public.hotel_folio_payments (
  id uuid primary key default gen_random_uuid(),request_id uuid not null unique,reservation_id uuid not null references public.hotel_reservations(id),
  method text not null check (method in ('cash','card_terminal','upi_manual','razorpay')),
  amount_paise bigint not null check (amount_paise between 1 and 100000000),reference text,provider_payment_id text unique,
  received_by uuid references auth.users(id),received_at timestamptz not null default clock_timestamp()
);
create index hotel_folio_payments_reservation on public.hotel_folio_payments(reservation_id);
create table public.hotel_invoice_counters (financial_year text primary key, last_number integer not null default 0 check (last_number>=0));
create table public.hotel_invoices (
  id uuid primary key default gen_random_uuid(),reservation_id uuid not null unique references public.hotel_reservations(id),
  number text not null unique,financial_year text not null,sequence integer not null check (sequence>0),snapshot jsonb not null,
  issued_at timestamptz not null default clock_timestamp(),issued_by uuid not null references auth.users(id),
  share_token_hash text unique,share_expires_at timestamptz, unique(financial_year,sequence)
);
create table public.hotel_balance_requests (
  id uuid primary key default gen_random_uuid(),request_id uuid not null unique,reservation_id uuid not null references public.hotel_reservations(id),
  kind text not null check (kind in ('payment_link','upi_qr')),amount_paise bigint not null check (amount_paise>0),
  provider_id text unique,details jsonb,created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp()+interval '30 minutes'),paid_at timestamptz,provider_payment_id text unique,
  review_reason text
);
create index hotel_balance_requests_reservation on public.hotel_balance_requests(reservation_id);
create table public.hotel_staff_auth_limits (key text primary key,window_start timestamptz not null default clock_timestamp(),attempts integer not null default 0);
create table public.hotel_staff_account_audit (
  id bigint generated always as identity primary key,actor_id uuid not null references auth.users(id),target_id uuid not null references auth.users(id),
  action text not null,details jsonb,created_at timestamptz not null default clock_timestamp()
);
-- Retain the original normalized walk-in request for lost-response retries. It is never a staff snapshot field.
create table public.hotel_staff_reservation_requests (
  request_id uuid primary key references public.hotel_reservations(request_id),
  reservation_id uuid not null unique references public.hotel_reservations(id),
  actor_id uuid not null references auth.users(id),payload jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
do $permissions$
declare t text;
begin
  foreach t in array array['hotel_stays','hotel_room_status_audit','hotel_stay_audit','hotel_folio_items','hotel_folio_payments','hotel_invoice_counters','hotel_invoices','hotel_balance_requests','hotel_staff_auth_limits','hotel_staff_account_audit','hotel_staff_reservation_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $permissions$;
grant usage,select on sequence public.hotel_room_status_audit_id_seq,public.hotel_stay_audit_id_seq,public.hotel_staff_account_audit_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hotel-guest-id','hotel-guest-id',false,5242880,array['image/jpeg','image/png','image/webp']);
-- No authenticated Storage policy: all ID upload/download authorizations go through the verified staff gateway.

create function public.hotel_staff_role(actor uuid) returns text language plpgsql volatile security invoker set search_path='' as $$
declare result text;
begin
  select role into result from public.hotel_staff where user_id=actor and active;
  if result is null then raise exception using errcode='PT403',message='Active hotel staff access required'; end if;
  return result;
end $$;

create function public.hotel_staff_folio(reservation_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b public.hotel_reservations; rate integer; extras bigint; discount bigint; taxable bigint; tax bigint; paid bigint;
begin
  select * into strict b from public.hotel_reservations where id=reservation_id;
  select coalesce(s.tax_rate_bps,b.tax_rate_bps,c.tax_rate_bps) into rate from public.hotel_booking_settings c left join public.hotel_stays s on s.reservation_id=b.id where c.slug='hotel-teesta';
  select coalesce(sum(amount_paise) filter(where kind='charge'),0),coalesce(sum(amount_paise) filter(where kind='discount'),0) into extras,discount from public.hotel_folio_items i where i.reservation_id=b.id;
  taxable:=b.subtotal_paise+extras-discount;
  tax:=case when rate is null then null else round(taxable*rate/10000.0)::bigint end;
  paid:=b.paid_paise+coalesce((select sum(amount_paise) from public.hotel_folio_payments p where p.reservation_id=b.id),0);
  return jsonb_build_object('reservation_id',b.id,'room_subtotal_paise',b.subtotal_paise,'extras_paise',extras,'discount_paise',discount,
    'taxable_paise',taxable,'tax_rate_bps',rate,'tax_paise',tax,'total_paise',taxable+coalesce(tax,0),'paid_paise',paid,
    'balance_paise',greatest(0,taxable+coalesce(tax,0)-paid),'credit_paise',greatest(0,paid-taxable-coalesce(tax,0)),'tax_confirmed',rate is not null);
end $$;

create function public.hotel_invoice_safe_payments(reservation_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('method',p.method,'amount_paise',p.amount_paise,'received_at',p.received_at) order by p.received_at) from public.hotel_folio_payments p where p.reservation_id=hotel_invoice_safe_payments.reservation_id),'[]')
    ||coalesce((select jsonb_build_array(jsonb_build_object('method','razorpay','amount_paise',b.paid_paise,'received_at',b.paid_at)) from public.hotel_reservations b where b.id=hotel_invoice_safe_payments.reservation_id and b.paid_paise>0),'[]');
$$;
create function public.hotel_invoice_payment_snapshot(reservation_id uuid) returns void language sql security invoker set search_path='' as $$
  -- Legal charges and tax remain the issued values; only payment receipt/balance values refresh.
  update public.hotel_invoices i set snapshot=jsonb_set(i.snapshot,'{folio}',(i.snapshot->'folio')||jsonb_build_object(
    'paid_paise',(public.hotel_staff_folio(hotel_invoice_payment_snapshot.reservation_id)->>'paid_paise')::bigint,
    'balance_paise',greatest(0,(i.snapshot->'folio'->>'total_paise')::bigint-(public.hotel_staff_folio(hotel_invoice_payment_snapshot.reservation_id)->>'paid_paise')::bigint),
    'credit_paise',greatest(0,(public.hotel_staff_folio(hotel_invoice_payment_snapshot.reservation_id)->>'paid_paise')::bigint-(i.snapshot->'folio'->>'total_paise')::bigint)))
    ||jsonb_build_object('payments',public.hotel_invoice_safe_payments(hotel_invoice_payment_snapshot.reservation_id)) where i.reservation_id=hotel_invoice_payment_snapshot.reservation_id;
$$;

create function public.hotel_capture_booking_payment_time() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.paid_paise>old.paid_paise then new.paid_at:=clock_timestamp(); end if;
  return new;
end $$;
create function public.hotel_refresh_invoice_booking_payment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (public.hotel_staff_folio(new.id)->>'credit_paise')::bigint>0 then
    update public.hotel_reservations set payment_review_reason='Captured booking payment exceeds the remaining folio balance; manager must reconcile or refund' where id=new.id;
  end if;
  perform public.hotel_invoice_payment_snapshot(new.id); return new;
end $$;
create trigger hotel_booking_payment_time before update of paid_paise on public.hotel_reservations for each row execute function public.hotel_capture_booking_payment_time();
create trigger hotel_booking_invoice_payment after update of paid_paise on public.hotel_reservations for each row when (old.paid_paise is distinct from new.paid_paise) execute function public.hotel_refresh_invoice_booking_payment();

create function public.hotel_staff_freeze_tax(reservation_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare rate integer; b public.hotel_reservations;
begin
  select * into strict b from public.hotel_reservations where id=reservation_id for update;
  select coalesce(s.tax_rate_bps,b.tax_rate_bps,c.tax_rate_bps) into rate from public.hotel_booking_settings c left join public.hotel_stays s on s.reservation_id=b.id where c.slug='hotel-teesta';
  if rate is not null then
    insert into public.hotel_stays(reservation_id,expected_check_out,tax_rate_bps) values(b.id,b.check_out,rate) on conflict on constraint hotel_stays_pkey do update set tax_rate_bps=coalesce(public.hotel_stays.tax_rate_bps,excluded.tax_rate_bps);
    update public.hotel_reservations set tax_rate_bps=rate,tax_paise=round(subtotal_paise*rate/10000.0),total_paise=subtotal_paise+round(subtotal_paise*rate/10000.0) where id=b.id and tax_rate_bps is null;
  end if;
end $$;

create function public.hotel_staff_capacity(category_code text,stay_in date,stay_out date,exclude_reservation uuid default null)
returns integer language sql stable security invoker set search_path='' as $$
  select coalesce(min(available),0)::integer from (
    select (select count(*) from public.hotel_inventory_rooms r where r.category=category_code and r.active and r.housekeeping<>'out_of_service'
      and not exists(select 1 from public.hotel_inventory_blocks x where x.room_number=r.number and x.active and x.starts_on<=d::date and x.ends_on>d::date))
      -coalesce((select sum(b.rooms) from public.hotel_reservations b where b.category=category_code and b.id is distinct from exclude_reservation and b.check_in<=d::date and b.check_out>d::date
        and (b.status in ('confirmed','checked_in') or (b.status in ('tentative','payment_pending') and b.hold_until>now()))),0) as available
    from generate_series(stay_in::timestamp,(stay_out-1)::timestamp,interval '1 day') d
  ) nights;
$$;

create function public.hotel_staff_availability(actor uuid,stay_in date,stay_out date,party_guests integer,reservation_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; choices jsonb; physical jsonb; q jsonb; b public.hotel_reservations;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  q:=public.hotel_quote(stay_in,stay_out,party_guests);
  if reservation_id is not null then select * into strict b from public.hotel_reservations where id=reservation_id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('code',c.code,'name',c.name,'capacity',c.capacity,'rooms',ceil(party_guests::numeric/c.capacity)::integer,
    'availableRooms',greatest(0,public.hotel_staff_capacity(c.code,stay_in,stay_out,b.id)),'quote',q) order by c.capacity),'[]') into choices from public.hotel_inventory_categories c;
  select coalesce(jsonb_agg(jsonb_build_object('number',r.number,'category',r.category,'housekeeping',r.housekeeping) order by r.number),'[]') into physical from public.hotel_inventory_rooms r
    where r.active and r.housekeeping<>'out_of_service' and not exists(select 1 from public.hotel_inventory_blocks x where x.room_number=r.number and x.active and x.starts_on<stay_out and x.ends_on>stay_in)
    and not exists(select 1 from public.hotel_room_assignments a join public.hotel_reservations x on x.id=a.reservation_id where a.room_number=r.number and x.id is distinct from reservation_id and x.status in ('confirmed','checked_in') and x.check_in<stay_out and x.check_out>stay_in);
  return jsonb_build_object('choices',choices,'rooms',physical);
end $$;

create function public.hotel_staff_snapshot(actor uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare role_name text; today date:=(now() at time zone 'Asia/Kolkata')::date; room_data jsonb; result jsonb; selected_ids uuid[];
begin
  role_name:=public.hotel_staff_role(actor);
  select coalesce(jsonb_agg(case when role_name='housekeeping' then jsonb_build_object('number',r.number,'category',r.category,'name',c.name,'active',r.active,'housekeeping',r.housekeeping,'occupancy',
      case when b.status='checked_in' and b.check_out<=today then 'departing_today' when b.status='checked_in' then 'occupied' when b.status='confirmed' and b.check_in=today then 'arriving_today' else 'vacant' end)
    else to_jsonb(r)||jsonb_build_object('name',c.name,'occupancy',case when b.status='checked_in' and b.check_out<=today then 'departing_today' when b.status='checked_in' then 'occupied' when b.status='confirmed' and b.check_in=today then 'arriving_today' else 'vacant' end,
      'reservation_id',b.id,'checked_in_at',s.checked_in_at,'expected_check_out',coalesce(s.expected_check_out,b.check_out),'source',s.source) end order by r.number),'[]') into room_data
    from public.hotel_inventory_rooms r join public.hotel_inventory_categories c on c.code=r.category
    left join lateral (select x.* from public.hotel_room_assignments a join public.hotel_reservations x on x.id=a.reservation_id where a.room_number=r.number and (x.status='checked_in' or (x.status='confirmed' and x.check_in=today)) order by (x.status='checked_in') desc,x.check_in limit 1) b on true
    left join public.hotel_stays s on s.reservation_id=b.id;
  result:=jsonb_build_object('role',role_name,'rooms',room_data,'staffCoreReady',true);
  if role_name='housekeeping' then return result; end if;
  selected_ids:=array(select id from (select id from public.hotel_reservations order by created_at desc limit 500) recent
    union select id from public.hotel_reservations where status='checked_in' or (status='confirmed' and check_out>=today)
      or (status in ('tentative','payment_pending') and hold_until>now()) or status='payment_review');
  return result||jsonb_build_object(
    'reservations',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.hotel_reservations b where b.id=any(selected_ids)),'[]'),
    'categories',coalesce((select jsonb_agg(to_jsonb(c) order by capacity) from public.hotel_inventory_categories c),'[]'),
    'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from public.hotel_room_assignments a where a.reservation_id=any(selected_ids)),'[]'),
    'seasons',coalesce((select jsonb_agg(to_jsonb(s) order by starts_on) from public.hotel_seasonal_rates s),'[]'),
    'settings',(select to_jsonb(s) from public.hotel_booking_settings s where slug='hotel-teesta'),
    'stays',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('id_number',case when s.id_type='aadhaar' and s.id_number is not null then '•••• •••• '||right(regexp_replace(s.id_number,'[^0-9]','','g'),4) else s.id_number end)) from public.hotel_stays s where s.reservation_id=any(selected_ids)),'[]'),
    'folioItems',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from public.hotel_folio_items i where i.reservation_id=any(selected_ids)),'[]'),
    'folioPayments',coalesce((select jsonb_agg(to_jsonb(p) order by p.received_at) from public.hotel_folio_payments p where p.reservation_id=any(selected_ids)),'[]'),
    'folios',coalesce((select jsonb_agg(public.hotel_staff_folio(b.id)) from public.hotel_reservations b where b.id=any(selected_ids)),'[]'),
    'invoices',coalesce((select jsonb_agg((to_jsonb(i)-'share_token_hash'-'share_expires_at')||jsonb_build_object('share_enabled',i.share_token_hash is not null and i.share_expires_at>now())) from public.hotel_invoices i where i.reservation_id=any(selected_ids)),'[]'),
    'balanceRequests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'reservation_id',r.reservation_id,'kind',r.kind,'amount_paise',r.amount_paise,'provider_id',r.provider_id,'details',r.details,'expires_at',r.expires_at,'paid_at',r.paid_at,'review_reason',r.review_reason) order by r.created_at desc) from public.hotel_balance_requests r where r.reservation_id=any(selected_ids)),'[]'),
    'staffMembers',coalesce((select jsonb_agg(jsonb_build_object('user_id',s.user_id,'name',s.name,'username',s.username,'role',s.role,'active',s.active) order by s.name) from public.hotel_staff s where (role_name='manager' or (s.role='housekeeping' and s.active))),'[]'));
end $$;

-- Preserve the proven category capacity mutations; protect its role check before extending roles.
alter function public.hotel_staff_change(uuid,jsonb) rename to hotel_staff_change_core;
do $guard$
declare definition text;
begin
  definition:=pg_get_functiondef('public.hotel_staff_change_core(uuid,jsonb)'::regprocedure);
  if strpos(definition,'if staff_role is null then')=0 then raise exception 'Unexpected staff core role guard'; end if;
  execute replace(definition,'if staff_role is null then','if staff_role is null or staff_role not in (''manager'',''reception'') then');
  definition:=pg_get_functiondef('public.hotel_staff_change_core(uuid,jsonb)'::regprocedure);
  execute replace(definition,'perform 1 from public.hotel_booking_settings where slug=''hotel-teesta'' for update;',
    'perform 1 from public.hotel_booking_settings where slug=''hotel-teesta'' for update; select role into staff_role from public.hotel_staff where user_id=actor and active; if staff_role is null or staff_role not in (''manager'',''reception'') then raise exception using errcode=''PT403'',message=''Staff access required''; end if;');
end $guard$;

create function public.hotel_staff_change(actor uuid,change jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; action text:=change->>'action'; b public.hotel_reservations; s public.hotel_stays; settings public.hotel_booking_settings;
  room_row public.hotel_inventory_rooms; quote jsonb; folio jsonb; result jsonb; amount bigint; prior text; housekeeper public.hotel_staff;
  checkout_date date; needed integer; subtotal bigint; tax bigint; prices jsonb; fy_start integer; fy text; seq integer; invoice public.hotel_invoices;
  payment public.hotel_folio_payments; item public.hotel_folio_items; source_name text; correction text; now_at timestamptz:=clock_timestamp();
  request_payload jsonb; request_record public.hotel_staff_reservation_requests;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  select * into strict settings from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  now_at:=clock_timestamp();
  if action='walk_in' then
    if change->>'requestId' is null then raise exception using errcode='PT400',message='Reservation request ID required'; end if;
    request_payload:=jsonb_build_object('roomNumber',btrim(change->>'roomNumber'),'checkIn',(change->>'checkIn')::date,'checkOut',(change->>'checkOut')::date,
      'guests',(change->>'guests')::integer,'fullName',btrim(change->>'fullName'),'phone',change->>'phone','email',lower(btrim(coalesce(change->>'email',''))),
      'source',coalesce(change->>'source','walk_in'),'sourceOther',nullif(btrim(change->>'sourceOther'),''),'otaReference',nullif(btrim(change->>'otaReference'),''),
      'address',nullif(btrim(change->>'address'),''),'nationality',nullif(btrim(change->>'nationality'),''),'adults',(change->>'adults')::integer,'children',(change->>'children')::integer,
      'advancePaise',coalesce((change->>'advancePaise')::bigint,0),
      'advanceMethod',case when coalesce((change->>'advancePaise')::bigint,0)>0 then coalesce(change->>'advanceMethod',change->>'paymentMethod') else null end,
      'advanceReference',case when coalesce((change->>'advancePaise')::bigint,0)>0 then nullif(btrim(coalesce(change->>'advanceReference',change->>'paymentReference')),'') else null end);
    select * into b from public.hotel_reservations where request_id=(change->>'requestId')::uuid;
    if found then
      select * into request_record from public.hotel_staff_reservation_requests r where r.request_id=(change->>'requestId')::uuid;
      if request_record.reservation_id is distinct from b.id or request_record.actor_id is distinct from actor or request_record.payload is distinct from request_payload then
        raise exception using errcode='PT409',message='Request ID already used for different walk-in details'; end if;
      return jsonb_build_object('saved',true,'reservation',to_jsonb(b),'reservationId',b.id);
    end if;
    if length(coalesce(btrim(change->>'fullName'),'')) not between 2 and 120 or coalesce(change->>'phone','') !~ '^\+[1-9][0-9]{7,14}$'
      or (coalesce(change->>'email','')<>'' and change->>'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception using errcode='PT400',message='Valid guest name, phone and optional email required'; end if;
    select * into room_row from public.hotel_inventory_rooms where number=change->>'roomNumber' and active and housekeeping<>'out_of_service';
    if not found then raise exception using errcode='PT409',message='Select an available room'; end if;
    quote:=public.hotel_quote((change->>'checkIn')::date,(change->>'checkOut')::date,(change->>'guests')::integer);
    select ceil((change->>'guests')::numeric/c.capacity)::integer into needed from public.hotel_inventory_categories c where c.code=room_row.category;
    if needed<>1 then raise exception using errcode='PT400',message='This walk-in room cannot accommodate the guest count'; end if;
    if public.hotel_capacity(room_row.category,(change->>'checkIn')::date,(change->>'checkOut')::date)<1
      or exists(select 1 from public.hotel_inventory_blocks x where x.room_number=room_row.number and x.active and x.starts_on<(change->>'checkOut')::date and x.ends_on>(change->>'checkIn')::date)
      or exists(select 1 from public.hotel_room_assignments a join public.hotel_reservations x on x.id=a.reservation_id where a.room_number=room_row.number and x.status in ('confirmed','checked_in') and x.check_in<(change->>'checkOut')::date and x.check_out>(change->>'checkIn')::date)
      then raise exception using errcode='PT409',message='Room is unavailable for these dates'; end if;
    source_name:=coalesce(change->>'source','walk_in');
    if source_name not in ('direct_website','walk_in','phone','makemytrip','goibibo','booking_com','agoda','airbnb','expedia','other') then raise exception using errcode='PT400',message='Choose a booking source'; end if;
    insert into public.hotel_reservations(request_id,user_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices)
    values((change->>'requestId')::uuid,null,room_row.category,(change->>'checkIn')::date,(change->>'checkOut')::date,(change->>'guests')::integer,1,btrim(change->>'fullName'),lower(btrim(coalesce(change->>'email',''))),change->>'phone','confirmed',
      (quote->>'subtotalPaise')::bigint,(quote->>'taxPaise')::bigint,(quote->>'totalPaise')::bigint,quote->'nightlyPrices') returning * into b;
    insert into public.hotel_staff_reservation_requests(request_id,reservation_id,actor_id,payload) values((change->>'requestId')::uuid,b.id,actor,request_payload);
    insert into public.hotel_room_assignments(reservation_id,room_number) values(b.id,room_row.number);
    insert into public.hotel_stays(reservation_id,source,source_other,ota_reference,expected_check_out,tax_rate_bps)
      values(b.id,source_name,nullif(btrim(change->>'sourceOther'),''),nullif(btrim(change->>'otaReference'),''),b.check_out,settings.tax_rate_bps);
    insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(b.id,actor,'walk_in');
    if coalesce((change->>'advancePaise')::bigint,0)>0 then
      perform public.hotel_staff_change(actor,jsonb_build_object('action','manual_payment','reservationId',b.id,'requestId',change->>'requestId','amountPaise',(change->>'advancePaise')::bigint,'method',coalesce(change->>'advanceMethod',change->>'paymentMethod'),'reference',coalesce(change->>'advanceReference',change->>'paymentReference')));
    end if;
    return jsonb_build_object('saved',true,'reservation',to_jsonb(b),'reservationId',b.id);
  elsif action in ('confirm','cancel','assign','season') then
    if action='cancel' and (public.hotel_staff_folio((change->>'reservationId')::uuid)->>'paid_paise')::bigint>0 then raise exception using errcode='PT409',message='Payments received require a refund review before cancellation'; end if;
    return public.hotel_staff_change_core(actor,change);
  elsif action='settings' then
    if change->>'taxRateBps' is null then raise exception using errcode='PT400',message='Confirm the approved tax rate explicitly'; end if;
    result:=public.hotel_staff_change_core(actor,change);
    update public.hotel_booking_settings set legal_name=case when change?'legalName' then nullif(btrim(change->>'legalName'),'') else legal_name end,
      legal_address=case when change?'legalAddress' then nullif(btrim(change->>'legalAddress'),'') else legal_address end,
      gstin=case when change?'gstin' then nullif(upper(btrim(change->>'gstin')),'') else gstin end where slug='hotel-teesta';
    return result;
  elsif action='housekeeping' then
    if change->>'status' is null or change->>'status' not in ('clean','dirty','out_of_service') then raise exception using errcode='PT400',message='Choose clean, dirty or out of service'; end if;
    select * into strict room_row from public.hotel_inventory_rooms where number=change->>'roomNumber' for update;
    if room_row.housekeeping='dirty' and change->>'status'='clean' and change->>'housekeeperId' is null then raise exception using errcode='PT400',message='Choose the housekeeper who returned this room key'; end if;
    if change->>'housekeeperId' is not null then
      select * into housekeeper from public.hotel_staff where user_id=(change->>'housekeeperId')::uuid and role='housekeeping' and active;
      if not found then raise exception using errcode='PT400',message='Choose an active housekeeper'; end if;
    end if;
    if change->>'status'='out_of_service' and exists(select 1 from public.hotel_room_assignments a join public.hotel_reservations x on x.id=a.reservation_id where a.room_number=room_row.number and (x.status='checked_in' or (x.status='confirmed' and x.check_out>(now() at time zone 'Asia/Kolkata')::date))) then
      raise exception using errcode='PT409',message='Move or resolve this room assignment before taking it out of service'; end if;
    result:=public.hotel_staff_change_core(actor,change);
    insert into public.hotel_room_status_audit(room_number,previous_status,new_status,actor_id,housekeeper_id,housekeeper_name)
      values(room_row.number,room_row.housekeeping,change->>'status',actor,housekeeper.user_id,housekeeper.name);
    return result;
  end if;
  select * into b from public.hotel_reservations where id=(change->>'reservationId')::uuid for update;
  if not found then raise exception using errcode='PT404',message='Stay not found'; end if;
  insert into public.hotel_stays(reservation_id,expected_check_out,tax_rate_bps) values(b.id,b.check_out,coalesce(b.tax_rate_bps,settings.tax_rate_bps)) on conflict do nothing;
  select * into strict s from public.hotel_stays where reservation_id=b.id for update;
  if action in ('charge','discount','manual_payment','invoice','check_out') then
    perform public.hotel_staff_freeze_tax(b.id);
    select * into strict s from public.hotel_stays where reservation_id=b.id;
  end if;
  if action='extend' then
    checkout_date:=(change->>'checkOut')::date;
    if b.status not in ('confirmed','checked_in') or checkout_date is null or checkout_date<=b.check_in or checkout_date-b.check_in>30 or checkout_date<(now() at time zone 'Asia/Kolkata')::date then raise exception using errcode='PT400',message='Choose a valid expected check-out date'; end if;
    if exists(select 1 from public.hotel_invoices i where i.reservation_id=b.id) then raise exception using errcode='PT409',message='An issued invoice locks stay dates'; end if;
    if checkout_date=b.check_out then return jsonb_build_object('saved',true); end if;
    -- Temporarily remove this stay from category consumption inside the property lock; changes roll back on any conflict.
    update public.hotel_reservations set status='cancelled' where id=b.id;
    if (checkout_date>(now() at time zone 'Asia/Kolkata')::date and public.hotel_capacity(b.category,greatest(b.check_in,(now() at time zone 'Asia/Kolkata')::date),checkout_date)<b.rooms)
      or exists(select 1 from public.hotel_room_assignments own join public.hotel_room_assignments other on other.room_number=own.room_number join public.hotel_reservations x on x.id=other.reservation_id
        where own.reservation_id=b.id and x.id<>b.id and x.status in ('confirmed','checked_in') and x.check_in<checkout_date and x.check_out>b.check_in)
      or exists(select 1 from public.hotel_room_assignments a join public.hotel_inventory_blocks x on x.room_number=a.room_number where a.reservation_id=b.id and x.active and x.starts_on<checkout_date and x.ends_on>b.check_in)
      then raise exception using errcode='PT409',message='Room is unavailable for this extension'; end if;
    select coalesce(jsonb_agg(n order by n->>'date'),'[]') into prices from jsonb_array_elements(b.nightly_prices) n where (n->>'date')::date<checkout_date;
    if checkout_date>b.check_out then quote:=public.hotel_quote(b.check_out,checkout_date,b.guests); prices:=prices||(quote->'nightlyPrices'); end if;
    select sum((n->>'amountPaise')::bigint) into subtotal from jsonb_array_elements(prices) n;
    tax:=case when coalesce(s.tax_rate_bps,settings.tax_rate_bps) is null then null else round(subtotal*coalesce(s.tax_rate_bps,settings.tax_rate_bps)/10000.0)::bigint end;
    update public.hotel_reservations set status=b.status,check_out=checkout_date,subtotal_paise=subtotal,tax_paise=tax,total_paise=subtotal+coalesce(tax,0),nightly_prices=prices,updated_at=now_at where id=b.id;
    if (public.hotel_staff_folio(b.id)->>'total_paise')::bigint<(public.hotel_staff_folio(b.id)->>'paid_paise')::bigint then raise exception using errcode='PT409',message='Early departure requires a refund review before reducing paid charges'; end if;
    update public.hotel_stays set expected_check_out=checkout_date where reservation_id=b.id;
    insert into public.hotel_stay_audit(reservation_id,actor_id,action,previous_value,new_value) values(b.id,actor,'expected_check_out_changed',to_jsonb(b.check_out),to_jsonb(checkout_date));
  elsif action='check_in' then
    if b.status<>'confirmed' or b.check_in>(now() at time zone 'Asia/Kolkata')::date or b.check_out<=(now() at time zone 'Asia/Kolkata')::date then raise exception using errcode='PT409',message='Confirm a current stay before check-in'; end if;
    if (select count(*) from public.hotel_room_assignments where reservation_id=b.id)<>b.rooms then raise exception using errcode='PT409',message='Assign every room before check-in'; end if;
    if exists(select 1 from public.hotel_room_assignments a join public.hotel_inventory_rooms r on r.number=a.room_number where a.reservation_id=b.id and (not r.active or r.housekeeping<>'clean')) then raise exception using errcode='PT409',message='Every assigned room must be clean before check-in'; end if;
    if exists(select 1 from public.hotel_room_assignments a join public.hotel_room_assignments other on other.room_number=a.room_number join public.hotel_reservations x on x.id=other.reservation_id where a.reservation_id=b.id and x.id<>b.id and x.status='checked_in') then raise exception using errcode='PT409',message='A guest is still checked in to this physical room'; end if;
    if s.id_front_path is null or s.id_back_path is null then raise exception using errcode='PT400',message='Upload the front and back of the guest ID before check-in'; end if;
    if length(coalesce(btrim(change->>'fullName'),'')) not between 2 and 120 or coalesce(change->>'phone','') !~ '^\+[1-9][0-9]{7,14}$' or (coalesce(change->>'email','')<>'' and change->>'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') or length(coalesce(btrim(change->>'address'),'')) not between 3 and 1000
      or length(coalesce(btrim(change->>'nationality'),'')) not between 2 and 80 or coalesce((change->>'adults')::integer,0)<1 or coalesce((change->>'children')::integer,-1)<0
      or (change->>'adults')::integer+(change->>'children')::integer<>b.guests or coalesce(change->>'idType','') not in ('aadhaar','passport','voter_id','driving_licence','pan','other')
      or length(coalesce(btrim(change->>'idNumber'),'')) not between 4 and 100 then raise exception using errcode='PT400',message='Complete guest, address, nationality and ID details'; end if;
    if lower(btrim(change->>'nationality')) not in ('indian','india') and (length(coalesce(btrim(change->>'passportNumber'),''))<4 or length(coalesce(btrim(change->>'visaNumber'),''))<2 or change->>'visaExpiry' is null) then raise exception using errcode='PT400',message='Passport and visa details required for foreign guests'; end if;
    if change->>'expectedCheckOut' is not null and (change->>'expectedCheckOut')::date<>b.check_out then
      perform public.hotel_staff_change(actor,jsonb_build_object('action','extend','reservationId',b.id,'checkOut',change->>'expectedCheckOut'));
      select * into strict b from public.hotel_reservations where id=b.id;
    end if;
    source_name:=coalesce(change->>'source',s.source);
    if source_name='other' and length(coalesce(btrim(change->>'sourceOther'),''))<2 then raise exception using errcode='PT400',message='Describe the booking source'; end if;
    update public.hotel_stays set source=source_name,source_other=nullif(btrim(change->>'sourceOther'),''),ota_reference=nullif(btrim(change->>'otaReference'),''),address=btrim(change->>'address'),nationality=btrim(change->>'nationality'),
      adults=(change->>'adults')::integer,children=(change->>'children')::integer,id_type=change->>'idType',id_number=btrim(change->>'idNumber'),passport_number=nullif(btrim(change->>'passportNumber'),''),
      visa_number=nullif(btrim(change->>'visaNumber'),''),visa_expiry=nullif(change->>'visaExpiry','')::date,checked_in_at=now_at,checked_in_by=actor,expected_check_out=b.check_out,tax_rate_bps=coalesce(tax_rate_bps,settings.tax_rate_bps) where reservation_id=b.id;
    update public.hotel_reservations set full_name=btrim(change->>'fullName'),phone=change->>'phone',email=lower(btrim(coalesce(change->>'email',email))),status='checked_in',updated_at=now_at where id=b.id;
    insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(b.id,actor,'check_in');
  elsif action='checkin_correction' then
    if role_name<>'manager' then raise exception using errcode='PT403',message='Manager access required'; end if;
    correction:=coalesce(change->>'checkedInAt',change->>'checkInAt');
    if s.checked_in_at is null or correction is null or length(coalesce(btrim(change->>'reason'),'')) not between 5 and 500 or correction::timestamptz>now_at then raise exception using errcode='PT400',message='Valid check-in time and correction reason required'; end if;
    insert into public.hotel_stay_audit(reservation_id,actor_id,action,previous_value,new_value,reason) values(b.id,actor,'check_in_time_corrected',to_jsonb(s.checked_in_at),to_jsonb(correction::timestamptz),btrim(change->>'reason'));
    update public.hotel_stays set checked_in_at=correction::timestamptz where reservation_id=b.id;
  elsif action='allow_balance_due' then
    if role_name<>'manager' then raise exception using errcode='PT403',message='Manager approval required'; end if;
    if b.status<>'checked_in' or length(coalesce(btrim(change->>'reason'),'')) not between 5 and 500 then raise exception using errcode='PT400',message='Supply a reason for the balance approval'; end if;
    update public.hotel_stays set allow_balance_due=true,allow_balance_by=actor where reservation_id=b.id;
    insert into public.hotel_stay_audit(reservation_id,actor_id,action,reason) values(b.id,actor,'balance_due_approved',btrim(change->>'reason'));
  elsif action='check_out' then
    if b.status<>'checked_in' then raise exception using errcode='PT409',message='Guest is not checked in'; end if;
    if coalesce((change->>'allowBalanceDue')::boolean,false) then
      perform public.hotel_staff_change(actor,jsonb_build_object('action','allow_balance_due','reservationId',b.id,'reason',change->>'reason'));
      s.allow_balance_due:=true;
    end if;
    folio:=public.hotel_staff_folio(b.id);
    if (not (folio->>'tax_confirmed')::boolean or (folio->>'balance_paise')::bigint>0) and not s.allow_balance_due then raise exception using errcode='PT409',message='Take the balance payment or ask a manager to allow balance due'; end if;
    update public.hotel_reservations set status='checked_out',updated_at=now_at where id=b.id;
    update public.hotel_stays set checked_out_at=now_at,checked_out_by=actor where reservation_id=b.id;
    insert into public.hotel_room_status_audit(room_number,previous_status,new_status,actor_id,reservation_id)
      select r.number,r.housekeeping,'dirty',actor,b.id from public.hotel_room_assignments a join public.hotel_inventory_rooms r on r.number=a.room_number where a.reservation_id=b.id;
    update public.hotel_inventory_rooms set housekeeping='dirty' where number in(select room_number from public.hotel_room_assignments where reservation_id=b.id);
    insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(b.id,actor,'check_out');
  elsif action in ('charge','discount') then
    if action='discount' and role_name<>'manager' then raise exception using errcode='PT403',message='Only a manager can add a discount'; end if;
    if change->>'requestId' is null then raise exception using errcode='PT400',message='Charge request ID required'; end if;
    select * into item from public.hotel_folio_items i where i.request_id=(change->>'requestId')::uuid;
    if found then
      if item.reservation_id<>b.id or item.kind<>action or item.amount_paise<>(change->>'amountPaise')::bigint or item.description<>btrim(change->>'description') or item.created_by<>actor then raise exception using errcode='PT409',message='Charge request already used'; end if;
      return jsonb_build_object('saved',true,'folio',public.hotel_staff_folio(b.id));
    end if;
    if b.status not in ('confirmed','checked_in') or exists(select 1 from public.hotel_invoices i where i.reservation_id=b.id) then raise exception using errcode='PT409',message='This folio is closed for changes'; end if;
    amount:=(change->>'amountPaise')::bigint;
    if amount is null or amount not between 1 and 100000000 or length(coalesce(btrim(change->>'description'),'')) not between 2 and 200 then raise exception using errcode='PT400',message='Valid description and amount required'; end if;
    folio:=public.hotel_staff_folio(b.id);
    if action='discount' and amount>(folio->>'taxable_paise')::bigint then raise exception using errcode='PT400',message='Discount exceeds the taxable value'; end if;
    insert into public.hotel_folio_items(request_id,reservation_id,kind,description,amount_paise,tax_rate_bps,created_by) values((change->>'requestId')::uuid,b.id,action,btrim(change->>'description'),amount,coalesce(s.tax_rate_bps,settings.tax_rate_bps),actor);
    if action='discount' and (public.hotel_staff_folio(b.id)->>'total_paise')::bigint<(public.hotel_staff_folio(b.id)->>'paid_paise')::bigint then raise exception using errcode='PT409',message='Discount requires a refund review before reducing paid charges'; end if;
  elsif action='manual_payment' then
    select * into payment from public.hotel_folio_payments where request_id=(change->>'requestId')::uuid;
    if found then
      if payment.reservation_id<>b.id or payment.amount_paise<>(change->>'amountPaise')::bigint or payment.method<>change->>'method' then raise exception using errcode='PT409',message='Payment request already used'; end if;
      return jsonb_build_object('saved',true,'folio',public.hotel_staff_folio(b.id));
    end if;
    if exists(select 1 from public.hotel_balance_requests r where r.request_id=(change->>'requestId')::uuid) then raise exception using errcode='PT409',message='This request ID belongs to an online payment'; end if;
    if b.status not in ('confirmed','checked_in','checked_out') then raise exception using errcode='PT409',message='This stay cannot accept payments'; end if;
    amount:=(change->>'amountPaise')::bigint; folio:=public.hotel_staff_folio(b.id);
    if not (folio->>'tax_confirmed')::boolean then raise exception using errcode='PT409',message='Manager must confirm taxes before taking payment'; end if;
    if change->>'requestId' is null or amount is null or amount<=0 or amount>(folio->>'balance_paise')::bigint or coalesce(change->>'method','') not in ('cash','card_terminal','upi_manual') then raise exception using errcode='PT400',message='Choose a valid payment method and amount within the balance'; end if;
    if change->>'method' in ('card_terminal','upi_manual') and length(coalesce(btrim(change->>'reference'),'')) not between 2 and 120 then raise exception using errcode='PT400',message='Payment reference required'; end if;
    insert into public.hotel_folio_payments(request_id,reservation_id,method,amount_paise,reference,received_by) values((change->>'requestId')::uuid,b.id,change->>'method',amount,nullif(btrim(change->>'reference'),''),actor);
    perform public.hotel_invoice_payment_snapshot(b.id);
  elsif action='id_photo' then
    if coalesce(change->>'side','') not in ('front','back') or change->>'path' is null or change->>'path' !~ ('^'||b.id::text||'/'||actor::text||'/[A-Za-z0-9_.-]+\.'||(change->>'side')||'\.(jpg|png|webp)$')
      or not exists(select 1 from storage.objects o where o.bucket_id='hotel-guest-id' and o.name=change->>'path') then raise exception using errcode='PT400',message='Upload a private ID photo for this stay first'; end if;
    update public.hotel_stays set id_front_path=case when change->>'side'='front' then change->>'path' else id_front_path end,id_back_path=case when change->>'side'='back' then change->>'path' else id_back_path end where reservation_id=b.id;
    insert into public.hotel_stay_audit(reservation_id,actor_id,action) values(b.id,actor,'id_photo_'||(change->>'side'));
  elsif action='invoice' then
    select * into invoice from public.hotel_invoices where reservation_id=b.id;
    if found then return jsonb_build_object('saved',true,'invoice',(to_jsonb(invoice)-'share_token_hash'-'share_expires_at')); end if;
    if b.status not in ('checked_in','checked_out') then raise exception using errcode='PT409',message='Check in the guest before issuing an invoice'; end if;
    folio:=public.hotel_staff_folio(b.id);
    if not (folio->>'tax_confirmed')::boolean or length(coalesce(settings.legal_name,''))<2 or length(coalesce(settings.legal_address,''))<3 then raise exception using errcode='PT409',message='Manager must confirm tax, legal hotel name and address before invoicing'; end if;
    fy_start:=extract(year from (now_at at time zone 'Asia/Kolkata'))::integer-case when extract(month from (now_at at time zone 'Asia/Kolkata'))<4 then 1 else 0 end;
    fy:=fy_start::text||'-'||right((fy_start+1)::text,2);
    insert into public.hotel_invoice_counters(financial_year,last_number) values(fy,1) on conflict(financial_year) do update set last_number=public.hotel_invoice_counters.last_number+1 returning last_number into seq;
    insert into public.hotel_invoices(reservation_id,number,financial_year,sequence,snapshot,issued_by)
    values(b.id,'MH/'||fy||'/'||lpad(seq::text,greatest(4,length(seq::text)),'0'),fy,seq,jsonb_build_object('legal_name',settings.legal_name,'legal_address',settings.legal_address,'gstin',settings.gstin,
      'guest_name',b.full_name,'address',s.address,'check_in',b.check_in,'check_out',b.check_out,'checked_in_at',s.checked_in_at,
      'rooms',coalesce((select jsonb_agg(room_number order by room_number) from public.hotel_room_assignments where reservation_id=b.id),'[]'),'folio',folio,
      'nightly_prices',b.nightly_prices,'payments',public.hotel_invoice_safe_payments(b.id),'items',coalesce((select jsonb_agg(jsonb_build_object('kind',i.kind,'description',i.description,'amount_paise',i.amount_paise)) from public.hotel_folio_items i where i.reservation_id=b.id),'[]')),actor) returning * into invoice;
    return jsonb_build_object('saved',true,'invoice',(to_jsonb(invoice)-'share_token_hash'-'share_expires_at'));
  elsif action='invoice_share' then
    if coalesce(change->>'tokenHash','') !~ '^[0-9a-f]{64}$' then raise exception using errcode='PT400',message='Invalid invoice share token'; end if;
    update public.hotel_invoices set share_token_hash=change->>'tokenHash',share_expires_at=now_at+interval '30 days' where reservation_id=b.id;
    if not found then raise exception using errcode='PT404',message='Issue an invoice before sharing'; end if;
  elsif action='invoice_revoke' then
    update public.hotel_invoices set share_token_hash=null,share_expires_at=null where reservation_id=b.id;
  else raise exception using errcode='PT400',message='Unknown staff action'; end if;
  return jsonb_build_object('saved',true,'folio',public.hotel_staff_folio(b.id));
end $$;

create function public.hotel_staff_account_change(actor uuid,change jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; target public.hotel_staff; target_id uuid:=(change->>'userId')::uuid; action text:=change->>'action'; email text;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name<>'manager' then raise exception using errcode='PT403',message='Manager access required'; end if;
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name<>'manager' then raise exception using errcode='PT403',message='Manager access required'; end if;
  select * into target from public.hotel_staff where user_id=target_id for update;
  if action='staff_save' then
    if target_id is null or length(coalesce(btrim(change->>'name'),'')) not between 2 and 120 or coalesce(change->>'username','') !~ '^[A-Za-z][A-Za-z0-9_.-]{2,39}$'
      or coalesce(change->>'role','') not in ('manager','reception','housekeeping') then raise exception using errcode='PT400',message='Valid staff name, username and role required'; end if;
    select u.email into email from auth.users u where u.id=target_id;
    if email is null then raise exception using errcode='PT404',message='Create the Auth account before adding staff access'; end if;
    if lower(change->>'username')='admin' and lower(email)<>'helicongorkha@gmail.com' then raise exception using errcode='PT409',message='Admin is reserved for the owner account'; end if;
    if exists(select 1 from public.hotel_staff where lower(username)=lower(change->>'username') and user_id<>target_id) then raise exception using errcode='PT409',message='This staff username is already in use'; end if;
    if target.user_id=actor and change->>'role'<>'manager' then raise exception using errcode='PT409',message='You cannot remove your own manager access'; end if;
    if target.active and target.role='manager' and change->>'role'<>'manager' and (select count(*) from public.hotel_staff where role='manager' and active)<=1 then raise exception using errcode='PT409',message='Keep at least one active manager'; end if;
    insert into public.hotel_staff(user_id,name,username,role,active,auth_email) values(target_id,btrim(change->>'name'),change->>'username',change->>'role',true,email)
      on conflict(user_id) do update set name=excluded.name,username=excluded.username,role=excluded.role,active=true,auth_email=excluded.auth_email;
  elsif action='staff_deactivate' then
    if target.user_id is null then raise exception using errcode='PT404',message='Staff account not found'; end if;
    if target_id=actor or (target.role='manager' and target.active and (select count(*) from public.hotel_staff where role='manager' and active)<=1) then raise exception using errcode='PT409',message='You cannot deactivate yourself or the last active manager'; end if;
    update public.hotel_staff set active=false where user_id=target_id;
  elsif action='staff_password_audit' then
    if target.user_id is null or not target.active then raise exception using errcode='PT404',message='Active staff account not found'; end if;
  else raise exception using errcode='PT400',message='Unknown staff account action'; end if;
  insert into public.hotel_staff_account_audit(actor_id,target_id,action,details) values(actor,target_id,action,
    jsonb_build_object('name',change->>'name','username',change->>'username','role',change->>'role'));
  return jsonb_build_object('saved',true);
end $$;

create function public.hotel_staff_login_attempt(identifier_hash text,network_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare key_value text; count_value integer; allowed boolean:=true; position integer:=0;
begin
  if coalesce(identifier_hash,'') !~ '^[0-9a-f]{64}$' or coalesce(network_hash,'') !~ '^[0-9a-f]{64}$' then raise exception using errcode='PT400',message='Invalid login limiter'; end if;
  -- Global, username and network buckets stop distributed username guessing. No password or raw IP is stored.
  foreach key_value in array array['global','identifier:'||identifier_hash,'network:'||network_hash] loop
    position:=position+1;
    insert into public.hotel_staff_auth_limits(key,attempts) values(key_value,1) on conflict(key) do update
      set attempts=case when public.hotel_staff_auth_limits.window_start<=clock_timestamp()-interval '15 minutes' then 1 else public.hotel_staff_auth_limits.attempts+1 end,
      window_start=case when public.hotel_staff_auth_limits.window_start<=clock_timestamp()-interval '15 minutes' then clock_timestamp() else public.hotel_staff_auth_limits.window_start end returning attempts into count_value;
    if count_value>(case position when 1 then 300 when 2 then 10 else 300 end) then allowed:=false; end if;
  end loop;
  delete from public.hotel_staff_auth_limits where window_start<clock_timestamp()-interval '1 day';
  return jsonb_build_object('allowed',allowed);
end $$;

create function public.hotel_id_photo_authorize(actor uuid,reservation_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare role_name text; s public.hotel_stays;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  if not exists(select 1 from public.hotel_reservations b where b.id=reservation_id) then raise exception using errcode='PT404',message='Stay not found'; end if;
  select * into s from public.hotel_stays where hotel_stays.reservation_id=hotel_id_photo_authorize.reservation_id;
  return jsonb_build_object('paths',to_jsonb(array_remove(array[s.id_front_path,s.id_back_path],null)));
end $$;

create function public.hotel_staff_balance_request(actor uuid,reservation_id uuid,payment_kind text,request_key uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; b public.hotel_reservations; folio jsonb; request public.hotel_balance_requests;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  select * into strict b from public.hotel_reservations where id=reservation_id for update;
  perform public.hotel_staff_freeze_tax(b.id);
  if payment_kind not in ('payment_link','upi_qr') or request_key is null or b.status not in ('confirmed','checked_in','checked_out') then raise exception using errcode='PT400',message='Choose a payment for an active stay'; end if;
  if not (select payments_enabled from public.hotel_booking_settings where slug='hotel-teesta') then raise exception using errcode='PT503',message='Payments are not enabled'; end if;
  select * into request from public.hotel_balance_requests where request_id=request_key;
  if found then
    if request.reservation_id<>b.id or request.kind<>payment_kind or request.created_by<>actor then raise exception using errcode='PT409',message='Payment request already used'; end if;
    if request.paid_at is not null or request.expires_at<=clock_timestamp() then raise exception using errcode='PT409',message='This payment request is settled or expired; start a new request'; end if;
    return to_jsonb(request)||jsonb_build_object('reference',b.reference,'existing',true);
  end if;
  if exists(select 1 from public.hotel_folio_payments p where p.request_id=request_key) then raise exception using errcode='PT409',message='This request ID belongs to a recorded payment'; end if;
  if exists(select 1 from public.hotel_balance_requests r where r.reservation_id=b.id and r.paid_at is null and r.expires_at>clock_timestamp()) then raise exception using errcode='PT409',message='An existing payment request is still active'; end if;
  folio:=public.hotel_staff_folio(b.id);
  if not (folio->>'tax_confirmed')::boolean or (folio->>'balance_paise')::bigint<=0 then raise exception using errcode='PT409',message='Confirm taxes and an outstanding balance first'; end if;
  insert into public.hotel_balance_requests(request_id,reservation_id,kind,amount_paise,created_by) values(request_key,b.id,payment_kind,(folio->>'balance_paise')::bigint,actor) returning * into request;
  return to_jsonb(request)||jsonb_build_object('reference',b.reference,'existing',false);
end $$;

create function public.hotel_staff_balance_attach(actor uuid,request_id uuid,provider_id text,details jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; request public.hotel_balance_requests;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  select * into strict request from public.hotel_balance_requests r where r.id=hotel_staff_balance_attach.request_id for update;
  if request.created_by<>actor or length(coalesce(provider_id,'')) not between 3 and 120 or (request.provider_id is not null and request.provider_id<>provider_id) then raise exception using errcode='PT409',message='Payment request cannot be attached'; end if;
  update public.hotel_balance_requests r set provider_id=hotel_staff_balance_attach.provider_id,details=hotel_staff_balance_attach.details where r.id=request.id;
  return jsonb_build_object('saved',true);
end $$;

-- This RPC is used only after the gateway verifies the Razorpay webhook signature and provider capture.
create function public.hotel_staff_record_balance_payment(provider_request text,payment_id text,amount bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare request public.hotel_balance_requests; folio jsonb;
begin
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  select * into request from public.hotel_balance_requests r where r.provider_id=provider_request for update;
  if not found then raise exception using errcode='PT404',message='Provider request not found'; end if;
  if request.paid_at is not null then
    if request.provider_payment_id<>payment_id or request.amount_paise<>amount then raise exception using errcode='PT409',message='Payment replay mismatch'; end if;
    return jsonb_build_object('saved',true,'duplicate',true);
  end if;
  if amount is null or amount<>request.amount_paise or length(coalesce(payment_id,'')) not between 3 and 120 then raise exception using errcode='PT409',message='Captured payment amount mismatch'; end if;
  folio:=public.hotel_staff_folio(request.reservation_id);
  if exists(select 1 from public.hotel_reservations b where b.payment_id=hotel_staff_record_balance_payment.payment_id) then raise exception using errcode='PT409',message='Provider payment already belongs to a booking order'; end if;
  insert into public.hotel_folio_payments(request_id,reservation_id,method,amount_paise,reference,provider_payment_id,received_by)
    values(request.request_id,request.reservation_id,'razorpay',amount,provider_request,payment_id,null);
  perform public.hotel_invoice_payment_snapshot(request.reservation_id);
  if (folio->>'balance_paise')::bigint<amount or not exists(select 1 from public.hotel_reservations b where b.id=request.reservation_id and b.status in ('confirmed','checked_in','checked_out')) then
    update public.hotel_balance_requests r set paid_at=clock_timestamp(),provider_payment_id=payment_id,review_reason='Payment captured after balance changed; manager must reconcile or refund' where r.id=request.id;
    update public.hotel_reservations set payment_review_reason='Captured balance payment requires manager reconciliation or refund' where id=request.reservation_id;
    return jsonb_build_object('saved',true,'review',true,'folio',public.hotel_staff_folio(request.reservation_id));
  end if;
  update public.hotel_balance_requests r set paid_at=clock_timestamp(),provider_payment_id=payment_id where r.id=request.id;
  return jsonb_build_object('saved',true,'folio',public.hotel_staff_folio(request.reservation_id));
end $$;

create function public.hotel_invoice_public(token_hash text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare invoice public.hotel_invoices;
begin
  if coalesce(token_hash,'') !~ '^[0-9a-f]{64}$' then raise exception using errcode='PT404',message='Invoice link not found'; end if;
  select * into invoice from public.hotel_invoices i where i.share_token_hash=token_hash and i.share_expires_at>now();
  if not found then raise exception using errcode='PT404',message='Invoice link not found or expired'; end if;
  return jsonb_build_object('number',invoice.number,'issued_at',invoice.issued_at,'snapshot',invoice.snapshot);
end $$;

revoke execute on function public.hotel_capture_reservation_tax(),public.hotel_capture_booking_payment_time(),public.hotel_refresh_invoice_booking_payment(),public.hotel_invoice_safe_payments(uuid),public.hotel_invoice_payment_snapshot(uuid),public.hotel_staff_freeze_tax(uuid),public.hotel_staff_role(uuid),public.hotel_staff_folio(uuid),public.hotel_staff_capacity(text,date,date,uuid),public.hotel_staff_availability(uuid,date,date,integer,uuid),public.hotel_staff_snapshot(uuid),public.hotel_staff_change(uuid,jsonb),public.hotel_staff_change_core(uuid,jsonb),
 public.hotel_staff_account_change(uuid,jsonb),public.hotel_staff_login_attempt(text,text),public.hotel_id_photo_authorize(uuid,uuid),public.hotel_staff_balance_request(uuid,uuid,text,uuid),public.hotel_staff_balance_attach(uuid,uuid,text,jsonb),public.hotel_staff_record_balance_payment(text,text,bigint),public.hotel_invoice_public(text) from public,anon,authenticated;
grant execute on function public.hotel_capture_reservation_tax(),public.hotel_capture_booking_payment_time(),public.hotel_refresh_invoice_booking_payment(),public.hotel_invoice_safe_payments(uuid),public.hotel_invoice_payment_snapshot(uuid),public.hotel_staff_freeze_tax(uuid),public.hotel_staff_role(uuid),public.hotel_staff_folio(uuid),public.hotel_staff_capacity(text,date,date,uuid),public.hotel_staff_availability(uuid,date,date,integer,uuid),public.hotel_staff_snapshot(uuid),public.hotel_staff_change(uuid,jsonb),public.hotel_staff_change_core(uuid,jsonb),
 public.hotel_staff_account_change(uuid,jsonb),public.hotel_staff_login_attempt(text,text),public.hotel_id_photo_authorize(uuid,uuid),public.hotel_staff_balance_request(uuid,uuid,text,uuid),public.hotel_staff_balance_attach(uuid,uuid,text,jsonb),public.hotel_staff_record_balance_payment(text,text,bigint),public.hotel_invoice_public(text) to service_role;
notify pgrst,'reload schema';
