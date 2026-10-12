-- Run after the additive mobile staff migration. Everything here is synthetic and rolled back.
begin;
set local lock_timeout='3s';
set local statement_timeout='45s';
do $test$
declare manager uuid:=gen_random_uuid(); reception uuid:=gen_random_uuid(); housekeeper uuid:=gen_random_uuid(); guest uuid:=gen_random_uuid();
  today date:=(now() at time zone 'Asia/Kolkata')::date; action text; result jsonb; booking jsonb; second jsonb; folio jsonb; invoice jsonb;
  stay_id uuid; retry_id uuid:=gen_random_uuid(); path_front text; path_back text; visible integer; captured timestamptz; first_sequence integer;
  request jsonb; payment_key uuid:=gen_random_uuid(); charge_key uuid:=gen_random_uuid(); discount_key uuid:=gen_random_uuid(); id_value text; old_closed uuid;
begin
  insert into auth.users(id,email,email_confirmed_at) values(manager,'staff-manager-'||manager||'@example.invalid',now()),(reception,'staff-reception-'||reception||'@example.invalid',now()),(housekeeper,'staff-housekeeper-'||housekeeper||'@example.invalid',now()),(guest,'staff-guest-'||guest||'@example.invalid',now());
  insert into public.hotel_staff(user_id,name,role,username,auth_email) values(manager,'Synthetic Manager','manager','m_'||left(replace(manager::text,'-',''),20),'staff-manager-'||manager||'@example.invalid'),
    (reception,'Synthetic Reception','reception','r_'||left(replace(reception::text,'-',''),20),'staff-reception-'||reception||'@example.invalid'),
    (housekeeper,'Synthetic Housekeeper','housekeeping','h_'||left(replace(housekeeper::text,'-',''),20),'staff-housekeeper-'||housekeeper||'@example.invalid');
  result:=public.hotel_staff_snapshot(housekeeper);
  if (select count(*) from jsonb_object_keys(result))<>3 or result?'reservations' or result?'settings' or result?'staffMembers' or result?'folios' then raise exception 'Housekeeping snapshot leaked private collections'; end if;
  if jsonb_array_length(result->'rooms')<>25 then raise exception 'Housekeeping did not get all 25 rooms'; end if;
  if exists(select 1 from jsonb_array_elements(result->'rooms') room where (select count(*) from jsonb_object_keys(room))<>6 or room?'reservation_id' or room?'checked_in_at') then raise exception 'Housekeeping room payload leaked guest stay data'; end if;
  foreach action in array array['housekeeping','walk_in','confirm','cancel','assign','check_in','check_out','extend','charge','discount','manual_payment','invoice','invoice_share','invoice_revoke','id_photo','checkin_correction','allow_balance_due','settings','season','unknown'] loop
    begin
      perform public.hotel_staff_change(housekeeper,jsonb_build_object('action',action));
      raise exception 'Housekeeping write allowed: %',action;
    exception when sqlstate 'PT403' then null; end;
  end loop;
  begin perform public.hotel_staff_change_core(housekeeper,'{"action":"housekeeping","roomNumber":"324","status":"clean"}'); raise exception 'Housekeeping core bypass allowed'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_staff_account_change(housekeeper,jsonb_build_object('action','staff_deactivate','userId',reception)); raise exception 'Housekeeping account write allowed'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_staff_availability(housekeeper,today,today+1,1); raise exception 'Housekeeping price read allowed'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_id_photo_authorize(housekeeper,gen_random_uuid()); raise exception 'Housekeeping ID read allowed'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_staff_balance_request(housekeeper,gen_random_uuid(),'payment_link',gen_random_uuid()); raise exception 'Housekeeping payment request allowed'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_staff_balance_attach(housekeeper,gen_random_uuid(),'plink_test','{}'); raise exception 'Housekeeping payment attach allowed'; exception when sqlstate 'PT403' then null; end;
  if has_function_privilege('authenticated','public.hotel_staff_snapshot(uuid)','execute') or has_function_privilege('anon','public.hotel_staff_change(uuid,jsonb)','execute') or has_table_privilege('authenticated','public.hotel_stays','select') then raise exception 'Private staff APIs exposed directly'; end if;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',500,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic terms for transaction verification only.','paymentsEnabled',true,'legalName','Synthetic Hotel','legalAddress','Synthetic hotel address','gstin',''));
  second:=public.hotel_reserve(gen_random_uuid(),guest,'double-room',today+8,today+9,1,'Synthetic Tax Quote','synthetic@example.invalid','+919999999999','tentative');
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',0,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic terms for transaction verification only.','paymentsEnabled',true));
  if (public.hotel_staff_folio((second->>'id')::uuid)->>'tax_paise')::bigint<>10000 then raise exception 'Tax settings changed a saved guest quote'; end if;
  perform public.hotel_cancel_tentative(guest,(second->>'id')::uuid);
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',500,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic terms for transaction verification only.','paymentsEnabled',true));
  update public.hotel_inventory_rooms set housekeeping='unknown' where number='324';
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','324','status','clean'));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','324','status','dirty'));
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','324','status','clean')); raise exception 'Dirty room returned clean without a housekeeper'; exception when sqlstate 'PT400' then null; end;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','324','status','clean','housekeeperId',reception)); raise exception 'Dirty room returned clean with a non-housekeeper'; exception when sqlstate 'PT400' then null; end;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','housekeeping','roomNumber','324','status','clean','housekeeperId',housekeeper));
  if not exists(select 1 from public.hotel_room_status_audit where room_number='324' and previous_status='dirty' and new_status='clean' and actor_id=reception and housekeeper_id=housekeeper and housekeeper_name='Synthetic Housekeeper') then raise exception 'Key receipt audit missing'; end if;
  booking:=public.hotel_staff_change(reception,jsonb_build_object('action','walk_in','requestId',retry_id,'roomNumber','324','checkIn',today,'checkOut',today+1,'guests',6,'fullName','Synthetic Walk-in','phone','+919999999999','email','','source','walk_in','advancePaise',100000,'advanceMethod','cash'));
  stay_id:=(booking->>'reservationId')::uuid;
  if (select user_id from public.hotel_reservations where id=stay_id) is not null then raise exception 'Walk-in was attached to the staff personal account'; end if;
  second:=public.hotel_staff_change(reception,jsonb_build_object('action','walk_in','requestId',retry_id,'roomNumber','324','checkIn',today,'checkOut',today+1,'guests',6,'fullName','Synthetic Walk-in','phone','+919999999999','email','','source','walk_in','advancePaise',100000,'advanceMethod','cash'));
  if second->>'reservationId'<>stay_id::text or (select count(*) from public.hotel_folio_payments where reservation_id=stay_id)<>1 then raise exception 'Walk-in advance replay duplicated'; end if;
  foreach action in array array['roomNumber','checkOut','guests','fullName','phone','email','source','advancePaise'] loop
    result:=jsonb_build_object('action','walk_in','requestId',retry_id,'roomNumber','324','checkIn',today,'checkOut',today+1,'guests',6,'fullName','Synthetic Walk-in','phone','+919999999999','email','','source','walk_in','advancePaise',100000,'advanceMethod','cash');
    result:=jsonb_set(result,array[action],case action when 'roomNumber' then to_jsonb('325'::text) when 'checkOut' then to_jsonb(today+2) when 'guests' then to_jsonb(5)
      when 'fullName' then to_jsonb('Different Guest'::text) when 'phone' then to_jsonb('+918888888888'::text) when 'email' then to_jsonb('different@example.invalid'::text) when 'source' then to_jsonb('phone'::text) else to_jsonb(200000) end);
    begin perform public.hotel_staff_change(reception,result); raise exception 'Changed walk-in retry accepted: %',action; exception when sqlstate 'PT409' then null; end;
  end loop;
  -- Compare the original immutable request, rather than an editable guest record or later stay dates.
  update public.hotel_reservations set full_name='Edited after initial creation' where id=stay_id;
  second:=public.hotel_staff_change(reception,jsonb_build_object('action','walk_in','requestId',retry_id,'roomNumber','324','checkIn',today,'checkOut',today+1,'guests',6,'fullName','  Synthetic Walk-in  ','phone','+919999999999','email','','source','walk_in','advancePaise',100000,'advanceMethod','cash'));
  if second->>'reservationId'<>stay_id::text or (select count(*) from public.hotel_folio_payments where reservation_id=stay_id)<>1 then raise exception 'Original normalized retry failed after editable guest details changed'; end if;
  if has_table_privilege('authenticated','public.hotel_staff_reservation_requests','select') then raise exception 'Immutable walk-in request exposed to browser'; end if;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','cancel','reservationId',stay_id)); raise exception 'Walk-in with advance was cancelled as unpaid'; exception when sqlstate 'PT409' then null; end;
  begin perform public.hotel_staff_change(manager,jsonb_build_object('action','walk_in','requestId',gen_random_uuid(),'roomNumber','324','checkIn',today,'checkOut',today+1,'guests',6,'fullName','Synthetic Oversell','phone','+919999999999')); raise exception 'Walk-in oversell allowed'; exception when sqlstate 'PT409' then null; end;
  path_front:=stay_id||'/'||reception||'/synthetic.front.jpg'; path_back:=stay_id||'/'||reception||'/synthetic.back.jpg';
  insert into storage.objects(bucket_id,name) values('hotel-guest-id',path_front),('hotel-guest-id',path_back);
  perform public.hotel_staff_change(reception,jsonb_build_object('action','id_photo','reservationId',stay_id,'side','front','path',path_front));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','id_photo','reservationId',stay_id,'side','back','path',path_back));
  if (select public from storage.buckets where id='hotel-guest-id') then raise exception 'Guest ID bucket is public'; end if;
  perform set_config('request.jwt.claim.sub',housekeeper::text,true); execute 'set local role authenticated';
  select count(*) into visible from storage.objects where bucket_id='hotel-guest-id';
  if visible<>0 then raise exception 'Housekeeping can read private ID objects'; end if;
  perform set_config('request.jwt.claim.sub',guest::text,true);
  select count(*) into visible from storage.objects where bucket_id='hotel-guest-id';
  if visible<>0 then raise exception 'Guest can read private ID objects'; end if;
  execute 'reset role';
  perform public.hotel_staff_change(reception,jsonb_build_object('action','check_in','reservationId',stay_id,'fullName','Synthetic Walk-in','phone','+919999999999','address','Synthetic guest address','nationality','Indian','adults',4,'children',2,'idType','aadhaar','idNumber','123456789012','source','walk_in','checkedInAt','2000-01-01T00:00:00Z'));
  select checked_in_at into captured from public.hotel_stays where reservation_id=stay_id;
  if captured is null or captured<now()-interval '1 minute' or (select checked_in_by from public.hotel_stays where reservation_id=stay_id)<>reception then raise exception 'Check-in timestamp was not server controlled'; end if;
  select room->>'occupancy' into id_value from jsonb_array_elements(public.hotel_staff_snapshot(housekeeper)->'rooms') room where room->>'number'='324';
  if id_value<>'occupied' then raise exception 'Housekeeping occupancy incorrect'; end if;
  select row->>'id_number' into id_value from jsonb_array_elements(public.hotel_staff_snapshot(reception)->'stays') row where row->>'reservation_id'=stay_id::text;
  if id_value='123456789012' or right(id_value,4)<>'9012' then raise exception 'Aadhaar was not masked'; end if;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','checkin_correction','reservationId',stay_id,'checkInAt',now(),'reason','Synthetic correction')); raise exception 'Reception timestamp correction allowed'; exception when sqlstate 'PT403' then null; end;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','checkin_correction','reservationId',stay_id,'checkedInAt',now()-interval '1 second','reason','Synthetic correction'));
  if not exists(select 1 from public.hotel_stay_audit a where a.reservation_id=stay_id and a.action='check_in_time_corrected' and a.actor_id=manager) then raise exception 'Manager time correction audit missing'; end if;
  -- Online category inventory blocks a physical-room extension, even before that future guest receives an assignment.
  second:=public.hotel_reserve(gen_random_uuid(),guest,'six-person-room',today+1,today+2,6,'Synthetic Future','synthetic@example.invalid','+919999999999','tentative');
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','extend','reservationId',stay_id,'checkOut',today+2)); raise exception 'Extension overbooked online capacity'; exception when sqlstate 'PT409' then null; end;
  perform public.hotel_cancel_tentative(guest,(second->>'id')::uuid);
  perform public.hotel_staff_change(reception,jsonb_build_object('action','extend','reservationId',stay_id,'checkOut',today+2));
  if (select expected_check_out from public.hotel_stays where reservation_id=stay_id)<>today+2 or (select subtotal_paise from public.hotel_reservations where id=stay_id)<>1440000 then raise exception 'Extension did not preserve/add nightly prices'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','charge','reservationId',stay_id,'requestId',charge_key,'description','Synthetic laundry','amountPaise',10000));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','charge','reservationId',stay_id,'requestId',charge_key,'description','Synthetic laundry','amountPaise',10000));
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','discount','reservationId',stay_id,'description','Synthetic discount','amountPaise',5000)); raise exception 'Reception discount allowed'; exception when sqlstate 'PT403' then null; end;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','discount','reservationId',stay_id,'requestId',discount_key,'description','Synthetic discount','amountPaise',5000));
  perform public.hotel_staff_change(manager,jsonb_build_object('action','discount','reservationId',stay_id,'requestId',discount_key,'description','Synthetic discount','amountPaise',5000));
  if (select count(*) from public.hotel_folio_items where reservation_id=stay_id)<>2 then raise exception 'Charge or discount retry duplicated money'; end if;
  folio:=public.hotel_staff_folio(stay_id);
  if (folio->>'taxable_paise')::bigint<>1445000 or (folio->>'tax_paise')::bigint<>72250 or (folio->>'paid_paise')::bigint<>100000 or (folio->>'balance_paise')::bigint<>1417250 then raise exception 'Integer folio and tax math incorrect: %',folio; end if;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id)); raise exception 'Checkout with balance due allowed'; exception when sqlstate 'PT409' then null; end;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','allow_balance_due','reservationId',stay_id,'reason','Synthetic balance reason')); raise exception 'Reception allowed balance due'; exception when sqlstate 'PT403' then null; end;
  begin perform public.hotel_staff_balance_request(reception,stay_id,'payment_link',retry_id); raise exception 'Manual payment key reused for provider request'; exception when sqlstate 'PT409' then null; end;
  request:=public.hotel_staff_balance_request(reception,stay_id,'payment_link',payment_key);
  update public.hotel_balance_requests set expires_at=clock_timestamp()-interval '1 second' where id=(request->>'id')::uuid;
  begin perform public.hotel_staff_balance_request(reception,stay_id,'payment_link',payment_key); raise exception 'Expired unattached provider request reused'; exception when sqlstate 'PT409' then null; end;
  payment_key:=gen_random_uuid(); request:=public.hotel_staff_balance_request(reception,stay_id,'payment_link',payment_key);
  perform public.hotel_staff_balance_attach(reception,(request->>'id')::uuid,'plink_SyntheticMobile','{"url":"https://example.invalid/payment"}');
  begin perform public.hotel_staff_record_balance_payment('plink_SyntheticMobile','pay_SyntheticMobile',1); raise exception 'Provider mismatch accepted'; exception when sqlstate 'PT409' then null; end;
  perform public.hotel_staff_record_balance_payment('plink_SyntheticMobile','pay_SyntheticMobile',1417250);
  perform public.hotel_staff_record_balance_payment('plink_SyntheticMobile','pay_SyntheticMobile',1417250);
  if (select count(*) from public.hotel_folio_payments where provider_payment_id='pay_SyntheticMobile')<>1 or (public.hotel_staff_folio(stay_id)->>'balance_paise')::bigint<>0 then raise exception 'Verified payment/replay balance incorrect'; end if;
  result:=public.hotel_staff_change(reception,jsonb_build_object('action','invoice','reservationId',stay_id)); invoice:=result->'invoice'; first_sequence:=(invoice->>'sequence')::integer;
  if invoice->>'number' !~ '^MH/[0-9]{4}-[0-9]{2}/[0-9]{4,}$' or invoice->'snapshot'?'id_number' or invoice->'snapshot'?'phone' or invoice->'snapshot'?'email' then raise exception 'Invoice format or privacy incorrect'; end if;
  second:=public.hotel_staff_change(reception,jsonb_build_object('action','invoice','reservationId',stay_id));
  if second->'invoice'->>'number'<>invoice->>'number' then raise exception 'Invoice replay duplicated numbering'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','invoice_share','reservationId',stay_id,'tokenHash',repeat('a',64)));
  if public.hotel_invoice_public(repeat('a',64))->>'number'<>invoice->>'number' then raise exception 'Invoice share token did not resolve'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','invoice_revoke','reservationId',stay_id));
  begin perform public.hotel_invoice_public(repeat('a',64)); raise exception 'Revoked invoice was accessible'; exception when sqlstate 'PT404' then null; end;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id,'checkedOutAt','2000-01-01T00:00:00Z'));
  if (select housekeeping from public.hotel_inventory_rooms where number='324')<>'dirty' or (select checked_out_at from public.hotel_stays where reservation_id=stay_id)<now()-interval '1 minute'
     or not exists(select 1 from public.hotel_room_status_audit where reservation_id=stay_id and previous_status='clean' and new_status='dirty' and actor_id=reception) then raise exception 'Checkout room/status/time audit failed'; end if;
  -- Manager approval is explicit and auditable; no full-payment claim is fabricated.
  booking:=public.hotel_staff_change(manager,jsonb_build_object('action','walk_in','requestId',gen_random_uuid(),'roomNumber','301','checkIn',today,'checkOut',today+1,'guests',1,'fullName','Synthetic Balance','phone','+919999999999'));
  stay_id:=(booking->>'reservationId')::uuid;
  update public.hotel_inventory_rooms set housekeeping='clean' where number='301';
  insert into storage.objects(bucket_id,name) values('hotel-guest-id',stay_id||'/'||manager||'/synthetic.front.jpg'),('hotel-guest-id',stay_id||'/'||manager||'/synthetic.back.jpg');
  update public.hotel_stays set id_front_path=stay_id||'/'||manager||'/synthetic.front.jpg',id_back_path=stay_id||'/'||manager||'/synthetic.back.jpg' where reservation_id=stay_id;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','check_in','reservationId',stay_id,'fullName','Synthetic Balance','phone','+919999999999','address','Synthetic guest address','nationality','Indian','adults',1,'children',0,'idType','passport','idNumber','TEST1234'));
  result:=public.hotel_staff_change(manager,jsonb_build_object('action','invoice','reservationId',stay_id));
  if (result->'invoice'->>'sequence')::integer<>first_sequence+1 then raise exception 'Financial year invoice sequence is not sequential'; end if;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','manual_payment','reservationId',stay_id,'requestId',gen_random_uuid(),'amountPaise',10000,'method','cash'));
  if (select (snapshot->'folio'->>'paid_paise')::bigint from public.hotel_invoices where reservation_id=stay_id)<>10000 then raise exception 'Invoice did not show subsequent payments'; end if;
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id,'allowBalanceDue',true,'reason','Synthetic unauthorized approval')); raise exception 'Reception atomic balance override allowed'; exception when sqlstate 'PT403' then null; end;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','allow_balance_due','reservationId',stay_id,'reason','Synthetic manager approval'));
  perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id));
  if not exists(select 1 from public.hotel_stay_audit a where a.reservation_id=stay_id and a.action='balance_due_approved' and a.actor_id=manager) then raise exception 'Balance approval audit missing'; end if;
  -- Both kinds of verified late capture record actual money, preserve occupancy and surface the excess.
  insert into public.hotel_reservations(request_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices,order_id,created_at)
    values(gen_random_uuid(),'double-room',today,today+1,1,1,'Synthetic Overpayment','','+919999999999','checked_in',200000,0,200000,jsonb_build_array(jsonb_build_object('date',today,'amountPaise',200000,'rateName','Synthetic saved rate')),'order_SyntheticOverpayment',now()-interval '1 year') returning id into stay_id;
  insert into public.hotel_stays(reservation_id,expected_check_out,checked_in_at,checked_in_by,address,tax_rate_bps) values(stay_id,today+1,now(),reception,'Synthetic old guest address',0);
  insert into public.hotel_room_assignments(reservation_id,room_number) values(stay_id,'303');
  perform public.hotel_staff_change(manager,jsonb_build_object('action','invoice','reservationId',stay_id));
  request:=public.hotel_staff_balance_request(reception,stay_id,'payment_link',gen_random_uuid());
  perform public.hotel_staff_balance_attach(reception,(request->>'id')::uuid,'plink_SyntheticOverpayment','{}');
  perform public.hotel_staff_change(reception,jsonb_build_object('action','manual_payment','reservationId',stay_id,'requestId',gen_random_uuid(),'amountPaise',200000,'method','cash'));
  perform public.hotel_record_payment('order_SyntheticOverpayment','pay_SyntheticOverpayment',200000);
  if (select status from public.hotel_reservations where id=stay_id)<>'checked_in' or (select payment_review_reason from public.hotel_reservations where id=stay_id) is null
    or (public.hotel_staff_folio(stay_id)->>'credit_paise')::bigint<>200000 then raise exception 'Original order excess payment was hidden or demoted occupied stay'; end if;
  result:=public.hotel_staff_record_balance_payment('plink_SyntheticOverpayment','pay_SyntheticBalanceOverpayment',200000);
  if not (result->>'review')::boolean or (public.hotel_staff_folio(stay_id)->>'paid_paise')::bigint<>600000 or (public.hotel_staff_folio(stay_id)->>'credit_paise')::bigint<>400000
    or (select (snapshot->'folio'->>'credit_paise')::bigint from public.hotel_invoices where reservation_id=stay_id)<>400000 then raise exception 'Staff balance excess capture omitted actual received money'; end if;
  result:=public.hotel_staff_snapshot(manager);
  if not exists(select 1 from jsonb_array_elements(result->'balanceRequests') r where r->>'reservation_id'=stay_id::text and r->>'review_reason' is not null) then raise exception 'Captured balance review is invisible to manager'; end if;
  -- Active stays survive the 500-history window; related private rows outside the selected set are omitted.
  insert into public.hotel_reservations(request_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices,created_at)
    values(gen_random_uuid(),'double-room',today,today+1,1,1,'Synthetic Old Closed','','+919999999999','cancelled',200000,0,200000,jsonb_build_array(jsonb_build_object('date',today,'amountPaise',200000,'rateName','Synthetic saved rate')),now()-interval '2 years') returning id into old_closed;
  insert into public.hotel_stays(reservation_id,expected_check_out,tax_rate_bps) values(old_closed,today+1,0);
  insert into public.hotel_folio_items(request_id,reservation_id,kind,description,amount_paise,tax_rate_bps,created_by) values(gen_random_uuid(),old_closed,'charge','Excluded old charge',1,0,manager);
  insert into public.hotel_reservations(request_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices)
    select gen_random_uuid(),'double-room',today+9,today+10,1,1,'Synthetic Recent History','','+919999999999','cancelled',200000,0,200000,jsonb_build_array(jsonb_build_object('date',today+9,'amountPaise',200000,'rateName','Synthetic saved rate')) from generate_series(1,501);
  result:=public.hotel_staff_snapshot(reception);
  if not exists(select 1 from jsonb_array_elements(result->'reservations') b where b->>'id'=stay_id::text) or not exists(select 1 from jsonb_array_elements(result->'stays') s where s->>'reservation_id'=stay_id::text)
    or exists(select 1 from jsonb_array_elements(result->'stays') s where s->>'reservation_id'=old_closed::text) or exists(select 1 from jsonb_array_elements(result->'folioItems') i where i->>'reservation_id'=old_closed::text) then raise exception 'Snapshot active/history selection or related-row bounding failed'; end if;
  -- A past check-in can shorten to today without checking an empty future-capacity interval.
  insert into public.hotel_reservations(request_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices)
    values(gen_random_uuid(),'six-person-room',today-1,today+1,1,1,'Synthetic Early Departure','','+919999999999','checked_in',400000,20000,420000,
      jsonb_build_array(jsonb_build_object('date',today-1,'amountPaise',200000,'rateName','Synthetic saved rate'),jsonb_build_object('date',today,'amountPaise',200000,'rateName','Synthetic saved rate'))) returning id into stay_id;
  insert into public.hotel_stays(reservation_id,expected_check_out,checked_in_at,checked_in_by,tax_rate_bps) values(stay_id,today+1,now()-interval '1 day',reception,500);
  insert into public.hotel_room_assignments(reservation_id,room_number) values(stay_id,'324');
  perform public.hotel_staff_change(reception,jsonb_build_object('action','extend','reservationId',stay_id,'checkOut',today));
  if (select check_out from public.hotel_reservations where id=stay_id)<>today or (public.hotel_staff_folio(stay_id)->>'total_paise')::bigint<>210000 then raise exception 'Early departure today failed or rewrote saved nightly price'; end if;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','check_out','reservationId',stay_id,'allowBalanceDue',true,'reason','Synthetic early departure approval'));
  -- A legacy stay checked in before tax approval freezes its first approved invoice, even after settings change.
  update public.hotel_booking_settings set tax_rate_bps=null where slug='hotel-teesta';
  insert into public.hotel_reservations(request_id,category,check_in,check_out,guests,rooms,full_name,email,phone,status,subtotal_paise,tax_paise,total_paise,nightly_prices)
    values(gen_random_uuid(),'double-room',today,today+1,1,1,'Synthetic Unapproved Tax','','+919999999999','checked_in',200000,null,200000,jsonb_build_array(jsonb_build_object('date',today,'amountPaise',200000,'rateName','Synthetic saved rate'))) returning id into stay_id;
  insert into public.hotel_stays(reservation_id,expected_check_out,checked_in_at,checked_in_by,address) values(stay_id,today+1,now(),reception,'Synthetic old guest address');
  insert into public.hotel_room_assignments(reservation_id,room_number) values(stay_id,'302');
  begin perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id)); raise exception 'Unapproved tax checkout allowed'; exception when sqlstate 'PT409' then null; end;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',500,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic terms for transaction verification only.','paymentsEnabled',true));
  result:=public.hotel_staff_change(manager,jsonb_build_object('action','invoice','reservationId',stay_id)); invoice:=result->'invoice';
  if invoice->'snapshot'->'nightly_prices'->0->>'date'<>today::text or (invoice->'snapshot'->'folio'->>'tax_paise')::bigint<>10000 then raise exception 'Invoice nightly dates or initial tax approval incorrect'; end if;
  perform public.hotel_staff_change(manager,jsonb_build_object('action','settings','taxRateBps',0,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic terms for transaction verification only.','paymentsEnabled',true));
  update public.hotel_reservations set order_id='order_SyntheticInvoice' where id=stay_id;
  perform public.hotel_record_payment('order_SyntheticInvoice','pay_SyntheticInvoice',210000);
  if (public.hotel_staff_folio(stay_id)->>'tax_paise')::bigint<>10000 or (select snapshot->'folio'->>'total_paise' from public.hotel_invoices where reservation_id=stay_id)<>'210000'
    or (select snapshot->'folio'->>'paid_paise' from public.hotel_invoices where reservation_id=stay_id)<>'210000' or (select snapshot->'folio'->>'balance_paise' from public.hotel_invoices where reservation_id=stay_id)<>'0'
    or (select number from public.hotel_invoices where reservation_id=stay_id)<>invoice->>'number' then raise exception 'Original booking capture failed to refresh immutable invoice payment balance'; end if;
  perform public.hotel_staff_change(reception,jsonb_build_object('action','check_out','reservationId',stay_id));
  begin perform public.hotel_staff_account_change(manager,jsonb_build_object('action','staff_deactivate','userId',manager)); raise exception 'Manager self-deactivation allowed'; exception when sqlstate 'PT409' then null; end;
  perform public.hotel_staff_account_change(manager,jsonb_build_object('action','staff_deactivate','userId',housekeeper));
  begin perform public.hotel_staff_snapshot(housekeeper); raise exception 'Deactivated housekeeping still has access'; exception when sqlstate 'PT403' then null; end;
  for visible in 1..10 loop result:=public.hotel_staff_login_attempt(repeat('b',64),repeat('c',64)); if not (result->>'allowed')::boolean then raise exception 'Limiter rejected early'; end if; end loop;
  if (public.hotel_staff_login_attempt(repeat('b',64),repeat('c',64))->>'allowed')::boolean then raise exception 'Login limiter failed'; end if;
end $test$;
select 'PASS: staff roles, housekeeping privacy/writes, room audit, private ID, server timestamps, walk-in capacity/advance, extensions, folio/tax, verified payments, balance checkout, invoices and login limiter' as result;
rollback;
