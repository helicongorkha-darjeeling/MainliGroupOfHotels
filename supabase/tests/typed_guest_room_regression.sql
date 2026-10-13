-- Run after both staff migrations. Typed registration and checkout stay atomic; no photos are needed.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
do $test$
declare manager uuid:=gen_random_uuid(); reception uuid:=gen_random_uuid(); housekeeper uuid:=gen_random_uuid(); guest uuid:=gen_random_uuid();
  today date:=(now() at time zone 'Asia/Kolkata')::date; request_key uuid:=gen_random_uuid(); invalid_key uuid:=gen_random_uuid(); input jsonb;
  result jsonb; retry jsonb; snapshot jsonb; original jsonb; b_id uuid; profile_id uuid; invoice_id uuid; invoice_sequence integer; second_profile uuid; counter_before bigint;
begin
  insert into auth.users(id,email,email_confirmed_at) values(manager,'typed-manager-'||manager||'@example.invalid',now()),(reception,'typed-reception-'||reception||'@example.invalid',now()),(housekeeper,'typed-housekeeper-'||housekeeper||'@example.invalid',now()),(guest,'typed-guest-'||guest||'@example.invalid',now());
  insert into public.hotel_staff(user_id,name,role) values(manager,'Typed Test Manager','manager'),(reception,'Typed Test Reception','reception'),(housekeeper,'Typed Test Housekeeper','housekeeping');
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',500,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic typed-only test policy.','paymentsEnabled',true,'legalName','Synthetic Mainali Hospitality','legalAddress','Synthetic hotel address','gstin',''));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','304','status','clean','housekeeperId',housekeeper));
  input:=jsonb_build_object('action','room_check_in','requestId',request_key,'roomNumber','304','checkIn',today,'checkOut',today+1,'guests',2,'fullName','Typed Guest','phone','+919999999999','email','typed@example.invalid',
    'address','Synthetic guest address','nationality','IN','adults',2,'children',0,'idType','aadhaar','idNumber','123456789012','source','walk_in','advancePaise',10000,'advanceMethod','cash','checkedInAt','2000-01-01T00:00:00Z');
  begin perform public.hotel_staff_change(housekeeper,input); raise exception 'Housekeeping room check-in allowed'; exception when sqlstate 'PT403' then null; end;
  result:=public.hotel_staff_change(reception,input); b_id:=(result->>'reservationId')::uuid; profile_id:=(result->>'guestProfileId')::uuid;
  if (result->'reservation'->>'status')<>'checked_in' or profile_id is null or (select guest_profile_id from public.hotel_stays where reservation_id=b_id)<>profile_id then raise exception 'Atomic room check-in did not save and link a profile'; end if;
  if (select checked_in_at from public.hotel_stays where reservation_id=b_id)<now()-interval '1 minute' or (select checked_in_by from public.hotel_stays where reservation_id=b_id)<>reception then raise exception 'Room check-in time was supplied by the client'; end if;
  if (select id_front_path is not null or id_back_path is not null from public.hotel_stays where reservation_id=b_id) then raise exception 'Typed check-in required/generated ID photos'; end if;
  if not exists(select 1 from public.hotel_guest_profiles p where p.id=profile_id and p.full_name='Typed Guest' and p.phone='+919999999999' and p.id_type='aadhaar' and p.id_number='123456789012') then raise exception 'Typed guest profile did not retain registration'; end if;
  retry:=public.hotel_staff_change(reception,input);
  if retry->>'reservationId'<>b_id::text or retry->>'guestProfileId'<>profile_id::text or (select count(*) from public.hotel_folio_payments where reservation_id=b_id)<>1 then raise exception 'Room check-in retry duplicated stay/profile/advance'; end if;
  if (select count(*) from public.hotel_guest_profiles where reservation_id=b_id)<>1 or (select count(*) from public.hotel_room_checkin_requests where reservation_id=b_id)<>1 or (select count(*) from public.hotel_booking_audit where reservation_id=b_id and action='check_in')<>1 then raise exception 'Room check-in retry duplicated profile, request or check-in audit'; end if;
  begin perform public.hotel_staff_change(reception,jsonb_set(input,'{requestId}',to_jsonb(gen_random_uuid()::text))); raise exception 'A second guest checked into the same occupied room'; exception when sqlstate 'PT409' then null; end;
  begin perform public.hotel_staff_change(reception,jsonb_set(input,'{idNumber}','"000000009999"')); raise exception 'Different typed ID retry accepted'; exception when sqlstate 'PT409' then null; end;
  begin perform public.hotel_staff_change(manager,input); raise exception 'Another staff actor reused the check-in request'; exception when sqlstate 'PT409' then null; end;
  snapshot:=public.hotel_staff_snapshot(reception);
  if not exists(select 1 from jsonb_array_elements(snapshot->'guestProfiles') p where p->>'id'=profile_id::text and p->>'id_number'<>'123456789012' and right(p->>'id_number',4)='9012') then raise exception 'Profile snapshot failed to mask Aadhaar'; end if;
  if not exists(select 1 from jsonb_array_elements(snapshot->'rooms') r where r->>'number'='304' and r->>'guest_name'='Typed Guest' and r->>'guest_profile_id'=profile_id::text and r->>'source'='walk_in' and r->>'expected_check_out'=(today+1)::text and r->>'checked_in_at' is not null) then raise exception 'Room snapshot lacks guest/source/server arrival/departure details'; end if;
  snapshot:=public.hotel_staff_snapshot(housekeeper);
  if snapshot?'guestProfiles' or exists(select 1 from jsonb_array_elements(snapshot->'rooms') r where r?'guest_name' or r?'guest_profile_id') then raise exception 'Housekeeping sees guest profiles'; end if;
  if jsonb_array_length(snapshot->'rooms')<>25 then raise exception 'Room registration changed the 25-room inventory'; end if;
  begin perform public.hotel_staff_snapshot(guest); raise exception 'Non-staff guest can read registration profiles'; exception when sqlstate 'PT403' then null; end;
  if has_table_privilege('authenticated','public.hotel_guest_profiles','select,insert,update,delete') or has_table_privilege('anon','public.hotel_guest_profiles','select,insert,update,delete')
    or has_table_privilege('authenticated','public.hotel_room_checkin_requests','select,insert,update,delete') or has_table_privilege('anon','public.hotel_room_checkin_requests','select,insert,update,delete') then raise exception 'Private profile/request tables exposed'; end if;
  if exists(select 1 from pg_class where oid in ('public.hotel_guest_profiles'::regclass,'public.hotel_room_checkin_requests'::regclass) and not relrowsecurity)
    or has_function_privilege('authenticated','public.hotel_capture_guest_profile(uuid,uuid)','execute') or has_function_privilege('anon','public.hotel_staff_change(uuid,jsonb)','execute') then raise exception 'Profile security boundary is incomplete'; end if;
  -- Invalid typed registration rolls back the reservation, physical assignment and advance as one transaction.
  update public.hotel_inventory_rooms set housekeeping='clean' where number='305';
  original:=jsonb_set(jsonb_set(input,'{requestId}',to_jsonb(invalid_key::text)),'{roomNumber}','"305"');
  begin perform public.hotel_staff_change(reception,jsonb_set(original,'{idNumber}','""')); raise exception 'Invalid typed registration checked in'; exception when sqlstate 'PT400' then null; end;
  if exists(select 1 from public.hotel_reservations where request_id=invalid_key) or exists(select 1 from public.hotel_folio_payments where request_id=invalid_key) or exists(select 1 from public.hotel_room_checkin_requests where request_id=invalid_key) then raise exception 'Failed room check-in retained partial booking or money'; end if;
  update public.hotel_inventory_rooms set housekeeping='dirty' where number='305';
  begin perform public.hotel_staff_change(reception,original); raise exception 'Dirty room check-in allowed'; exception when sqlstate 'PT409' then null; end;
  if exists(select 1 from public.hotel_reservations where request_id=invalid_key) then raise exception 'Dirty-room failure retained reservation'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','305','status','clean','housekeeperId',housekeeper));
  retry:=public.hotel_staff_change(reception,original); second_profile:=(retry->>'guestProfileId')::uuid;
  if second_profile=profile_id then raise exception 'Different stays with the same phone/ID were automatically merged'; end if;
  -- Existing online confirmed bookings can check in with typed details and no photo, using their assigned rooms.
  result:=public.hotel_reserve(gen_random_uuid(),guest,'double-room',today,today+1,1,'Typed Online','typed-online@example.invalid','+918888888888','tentative');
  perform public.hotel_staff_change(manager,jsonb_build_object('action','confirm','reservationId',result->>'id'));
  update public.hotel_inventory_rooms set housekeeping='clean' where number='310';
  perform public.hotel_staff_change(reception,jsonb_build_object('action','assign','reservationId',result->>'id','rooms',jsonb_build_array('310')));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','check_in','reservationId',result->>'id','fullName','Typed Online','phone','+918888888888','email','typed-online@example.invalid','address','Synthetic online guest address','nationality','Indian','adults',1,'children',0,'idType','passport','idNumber','TEST1234','source','direct_website','expectedCheckOut',today+1));
  if (select guest_profile_id from public.hotel_stays where reservation_id=(result->>'id')::uuid) is null then raise exception 'Existing booking typed check-in omitted guest profile'; end if;
  -- Food/extras become part of the Mainali invoice created during checkout; failures leave the guest in house.
  perform public.hotel_staff_change(reception,jsonb_build_object('action','charge','reservationId',b_id,'requestId',gen_random_uuid(),'description','Food and laundry','amountPaise',30000));
  select coalesce(sum(last_number),0) into counter_before from public.hotel_invoice_counters;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',b_id)); raise exception 'Unpaid checkout completed'; exception when sqlstate 'PT409' then null; end;
  if (select status from public.hotel_reservations where id=b_id)<>'checked_in' or exists(select 1 from public.hotel_invoices where reservation_id=b_id) then raise exception 'Unpaid checkout left an invoice or changed stay'; end if;
  if (select coalesce(sum(last_number),0) from public.hotel_invoice_counters)<>counter_before or exists(select 1 from public.hotel_booking_audit where reservation_id=b_id and action='check_out') then raise exception 'Failed checkout consumed invoice numbering or added an audit'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','manual_payment','reservationId',b_id,'requestId',gen_random_uuid(),'amountPaise',(public.hotel_staff_folio(b_id)->>'balance_paise')::bigint,'method','cash'));
  update public.hotel_booking_settings set legal_name=null where slug='hotel-teesta';
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',b_id)); raise exception 'Checkout completed without invoice legal setup'; exception when sqlstate 'PT409' then null; end;
  if (select status from public.hotel_reservations where id=b_id)<>'checked_in' or (select housekeeping from public.hotel_inventory_rooms where number='304')<>'clean' then raise exception 'Invoice failure changed occupied room/status'; end if;
  update public.hotel_booking_settings set legal_name='Synthetic Mainali Hospitality' where slug='hotel-teesta';
  result:=public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',b_id)); invoice_id:=(result->>'invoiceId')::uuid; invoice_sequence:=(result->'invoice'->>'sequence')::integer;
  if invoice_id is null or (result->'invoice'->'snapshot'->>'legal_name')<>'Synthetic Mainali Hospitality' or not exists(select 1 from jsonb_array_elements(result->'invoice'->'snapshot'->'items') item where item->>'description'='Food and laundry' and (item->>'amount_paise')::bigint=30000) then raise exception 'Checkout invoice omitted hotel/food charges'; end if;
  if result->'invoice'->'snapshot'?'id_number' or result->'invoice'->'snapshot'?'guest_profile_id' or result->'invoice'->'snapshot'?'passport_number' then raise exception 'Invoice exposed private registration'; end if;
  if (select status from public.hotel_reservations where id=b_id)<>'checked_out' or (select housekeeping from public.hotel_inventory_rooms where number='304')<>'dirty' then raise exception 'Checkout did not finish stay/dirty room'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','304','status','clean','housekeeperId',housekeeper));
  retry:=public.hotel_staff_change(manager,jsonb_build_object('action','check_out','reservationId',b_id));
  if retry->>'invoiceId'<>invoice_id::text or (retry->'invoice'->>'sequence')::integer<>invoice_sequence or (select housekeeping from public.hotel_inventory_rooms where number='304')<>'clean' then raise exception 'Checkout retry duplicated invoice or dirtied a returned room'; end if;
end $test$;
select 'PASS: typed-only room check-in, durable private guest profiles, capacity/cleanliness/atomic retries and checkout-generated invoices including extras' as result;
rollback;
