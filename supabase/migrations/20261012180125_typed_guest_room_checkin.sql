-- Follow-up to the reviewed mobile staff core. Typed ID registration replaces mandatory ID photos.
create table public.hotel_guest_profiles (
  id uuid primary key default gen_random_uuid(),reservation_id uuid not null unique references public.hotel_reservations(id),
  full_name text not null,phone text not null,email text not null default '',address text not null,nationality text not null,
  adults integer not null,children integer not null,id_type text not null,id_number text not null,
  passport_number text,visa_number text,visa_expiry date,created_by uuid not null references auth.users(id),
  created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
alter table public.hotel_guest_profiles enable row level security;
revoke all on public.hotel_guest_profiles from public,anon,authenticated;
grant all on public.hotel_guest_profiles to service_role;
alter table public.hotel_stays add column guest_profile_id uuid references public.hotel_guest_profiles(id);
create table public.hotel_room_checkin_requests (
  request_id uuid primary key references public.hotel_reservations(request_id),reservation_id uuid not null unique references public.hotel_reservations(id),
  actor_id uuid not null references auth.users(id),payload jsonb not null,created_at timestamptz not null default clock_timestamp()
);
alter table public.hotel_room_checkin_requests enable row level security;
revoke all on public.hotel_room_checkin_requests from public,anon,authenticated;
grant all on public.hotel_room_checkin_requests to service_role;

create function public.hotel_room_checkin_payload(change jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
  select jsonb_build_object('roomNumber',btrim(change->>'roomNumber'),'checkIn',(change->>'checkIn')::date,'checkOut',(change->>'checkOut')::date,
    'guests',(change->>'guests')::integer,'fullName',btrim(change->>'fullName'),'phone',change->>'phone','email',lower(btrim(coalesce(change->>'email',''))),
    'address',btrim(change->>'address'),'nationality',btrim(change->>'nationality'),'adults',(change->>'adults')::integer,'children',(change->>'children')::integer,
    'idType',change->>'idType','idNumber',btrim(change->>'idNumber'),'passportNumber',nullif(btrim(change->>'passportNumber'),''),
    'visaNumber',nullif(btrim(change->>'visaNumber'),''),'visaExpiry',nullif(change->>'visaExpiry','')::date,
    'source',coalesce(change->>'source','walk_in'),'sourceOther',nullif(btrim(change->>'sourceOther'),''),'otaReference',nullif(btrim(change->>'otaReference'),''),
    'advancePaise',coalesce((change->>'advancePaise')::bigint,0),
    'advanceMethod',case when coalesce((change->>'advancePaise')::bigint,0)>0 then coalesce(change->>'advanceMethod',change->>'paymentMethod') else null end,
    'advanceReference',case when coalesce((change->>'advancePaise')::bigint,0)>0 then nullif(btrim(coalesce(change->>'advanceReference',change->>'paymentReference')),'') else null end);
$$;

create function public.hotel_capture_guest_profile(actor uuid,reservation_id uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare role_name text; b public.hotel_reservations; s public.hotel_stays; profile_id uuid;
begin
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  select * into strict b from public.hotel_reservations where id=reservation_id for update;
  select * into strict s from public.hotel_stays where hotel_stays.reservation_id=b.id;
  if b.status<>'checked_in' then raise exception using errcode='PT409',message='Check in the guest before saving a profile'; end if;
  insert into public.hotel_guest_profiles(reservation_id,full_name,phone,email,address,nationality,adults,children,id_type,id_number,passport_number,visa_number,visa_expiry,created_by)
    values(b.id,b.full_name,b.phone,b.email,s.address,s.nationality,s.adults,s.children,s.id_type,s.id_number,s.passport_number,s.visa_number,s.visa_expiry,actor)
    on conflict on constraint hotel_guest_profiles_reservation_id_key do update set full_name=excluded.full_name,phone=excluded.phone,email=excluded.email,address=excluded.address,
      nationality=excluded.nationality,adults=excluded.adults,children=excluded.children,id_type=excluded.id_type,id_number=excluded.id_number,passport_number=excluded.passport_number,
      visa_number=excluded.visa_number,visa_expiry=excluded.visa_expiry,updated_at=clock_timestamp() returning id into profile_id;
  update public.hotel_stays set guest_profile_id=profile_id where hotel_stays.reservation_id=b.id;
  return profile_id;
end $$;

alter function public.hotel_staff_change(uuid,jsonb) rename to hotel_staff_change_mobile_base;
do $typed_id$
declare definition text; prerequisite text:='if s.id_front_path is null or s.id_back_path is null then raise exception using errcode=''PT400'',message=''Upload the front and back of the guest ID before check-in''; end if;';
begin
  definition:=pg_get_functiondef('public.hotel_staff_change_mobile_base(uuid,jsonb)'::regprocedure);
  if strpos(definition,prerequisite)=0 then raise exception 'Unexpected check-in photo prerequisite'; end if;
  definition:=replace(definition,prerequisite,'-- Typed guest ID is sufficient; photographs are optional legacy records.');
  execute replace(definition,'not in (''indian'',''india'')','not in (''indian'',''india'',''in'')');
end $typed_id$;

create function public.hotel_staff_change(actor uuid,change jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare role_name text; action text:=change->>'action'; b public.hotel_reservations; result jsonb; invoice public.hotel_invoices;
  profile_id uuid; payload jsonb; request_record public.hotel_room_checkin_requests;
begin
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  role_name:=public.hotel_staff_role(actor);
  if role_name not in ('manager','reception') then raise exception using errcode='PT403',message='Front desk access required'; end if;
  if action='room_check_in' then
    if change->>'requestId' is null then raise exception using errcode='PT400',message='Check-in request ID required'; end if;
    payload:=public.hotel_room_checkin_payload(change);
    select * into request_record from public.hotel_room_checkin_requests r where r.request_id=(change->>'requestId')::uuid;
    if found then
      if request_record.actor_id is distinct from actor or request_record.payload is distinct from payload then raise exception using errcode='PT409',message='Request ID already used for different check-in details'; end if;
      select * into strict b from public.hotel_reservations where id=request_record.reservation_id;
      select guest_profile_id into profile_id from public.hotel_stays where reservation_id=b.id;
      return jsonb_build_object('saved',true,'reservationId',b.id,'reservation',to_jsonb(b),'guestProfileId',profile_id,'folio',public.hotel_staff_folio(b.id));
    end if;
    -- A room check-in owns its request key; it cannot attach to an earlier standalone walk-in or online reservation.
    if exists(select 1 from public.hotel_reservations where request_id=(change->>'requestId')::uuid) then raise exception using errcode='PT409',message='This request ID already belongs to a reservation'; end if;
    result:=public.hotel_staff_change_mobile_base(actor,change||jsonb_build_object('action','walk_in'));
    select * into strict b from public.hotel_reservations where id=(result->>'reservationId')::uuid;
    -- walk_in already assigns exactly the chosen physical room under the shared capacity lock.
    perform public.hotel_staff_change_mobile_base(actor,change||jsonb_build_object('action','check_in','reservationId',b.id,'expectedCheckOut',b.check_out));
    profile_id:=public.hotel_capture_guest_profile(actor,b.id);
    insert into public.hotel_room_checkin_requests(request_id,reservation_id,actor_id,payload) values((change->>'requestId')::uuid,b.id,actor,payload);
    select * into strict b from public.hotel_reservations where id=b.id;
    return jsonb_build_object('saved',true,'reservationId',b.id,'reservation',to_jsonb(b),'guestProfileId',profile_id,'folio',public.hotel_staff_folio(b.id));
  elsif action='check_in' then
    result:=public.hotel_staff_change_mobile_base(actor,change);
    profile_id:=public.hotel_capture_guest_profile(actor,(change->>'reservationId')::uuid);
    return result||jsonb_build_object('guestProfileId',profile_id);
  elsif action='check_out' then
    select * into b from public.hotel_reservations where id=(change->>'reservationId')::uuid for update;
    if not found then raise exception using errcode='PT404',message='Stay not found'; end if;
    if b.status not in ('checked_in','checked_out') then raise exception using errcode='PT409',message='Guest is not checked in'; end if;
    -- Invoice and checkout use one transaction/property lock: missing setup or unpaid balance rolls back both.
    perform public.hotel_staff_change_mobile_base(actor,jsonb_build_object('action','invoice','reservationId',b.id));
    if b.status='checked_in' then result:=public.hotel_staff_change_mobile_base(actor,change); else result:=jsonb_build_object('saved',true,'folio',public.hotel_staff_folio(b.id)); end if;
    select * into strict invoice from public.hotel_invoices where reservation_id=b.id;
    return result||jsonb_build_object('invoiceId',invoice.id,'invoice',(to_jsonb(invoice)-'share_token_hash'-'share_expires_at')||jsonb_build_object('share_enabled',invoice.share_token_hash is not null and invoice.share_expires_at>now()));
  else return public.hotel_staff_change_mobile_base(actor,change); end if;
end $$;

alter function public.hotel_staff_snapshot(uuid) rename to hotel_staff_snapshot_mobile_base;
create function public.hotel_staff_snapshot(actor uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; selected_ids uuid[]; profiles jsonb; rooms jsonb;
begin
  result:=public.hotel_staff_snapshot_mobile_base(actor);
  if result->>'role'='housekeeping' then return result; end if;
  selected_ids:=array(select (b->>'id')::uuid from jsonb_array_elements(result->'reservations') b);
  select coalesce(jsonb_agg((to_jsonb(p)-'created_by')||jsonb_build_object('id_number',case when p.id_type='aadhaar' then '•••• •••• '||right(regexp_replace(p.id_number,'[^0-9]','','g'),4) else p.id_number end)),'[]') into profiles
    from public.hotel_guest_profiles p where p.reservation_id=any(selected_ids);
  select coalesce(jsonb_agg(r.room||jsonb_build_object('guest_name',b.full_name,'guest_profile_id',s.guest_profile_id) order by r.position),'[]') into rooms
    from jsonb_array_elements(result->'rooms') with ordinality r(room,position)
    left join public.hotel_reservations b on b.id=nullif(r.room->>'reservation_id','')::uuid left join public.hotel_stays s on s.reservation_id=b.id;
  return result||jsonb_build_object('rooms',rooms,'guestProfiles',profiles);
end $$;
revoke execute on function public.hotel_room_checkin_payload(jsonb),public.hotel_capture_guest_profile(uuid,uuid),public.hotel_staff_change(uuid,jsonb),public.hotel_staff_change_mobile_base(uuid,jsonb),public.hotel_staff_snapshot(uuid),public.hotel_staff_snapshot_mobile_base(uuid) from public,anon,authenticated;
grant execute on function public.hotel_room_checkin_payload(jsonb),public.hotel_capture_guest_profile(uuid,uuid),public.hotel_staff_change(uuid,jsonb),public.hotel_staff_change_mobile_base(uuid,jsonb),public.hotel_staff_snapshot(uuid),public.hotel_staff_snapshot_mobile_base(uuid) to service_role;
notify pgrst,'reload schema';
