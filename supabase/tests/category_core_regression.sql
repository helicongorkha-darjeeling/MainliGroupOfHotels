-- Run through the connected SQL tool. All fixtures, permissions and settings are rolled back.
begin;
do $test$
declare guest uuid:=gen_random_uuid(); other_guest uuid:=gen_random_uuid(); today date:=(now() at time zone 'Asia/Kolkata')::date;
  request_key uuid:=gen_random_uuid(); booking jsonb; retry jsonb; quote jsonb; visible integer;
begin
  insert into auth.users(id,email,email_confirmed_at) values(guest,'category-test-'||guest||'@example.invalid',now()),(other_guest,'category-test-'||other_guest||'@example.invalid',now());
  insert into public.hotel_staff(user_id,role) values(guest,'manager');
  perform public.hotel_staff_change(guest,jsonb_build_object('action','settings','taxRateBps',0,'checkInTime','14:00','checkOutTime','11:00','cancellationTerms','Synthetic policy for rolled-back verification only.','paymentsEnabled',true));
  if (public.hotel_quote(today,today+2,1)->>'totalPaise')::bigint<>400000 then raise exception 'Solo quote mismatch'; end if;
  if (public.hotel_quote(today,today+2,2)->>'totalPaise')::bigint<>500000 then raise exception 'Couple quote mismatch'; end if;
  if (public.hotel_quote(today,today+2,3)->>'totalPaise')::bigint<>720000 then raise exception 'Group quote mismatch'; end if;
  booking:=public.hotel_reserve(request_key,guest,'six-person-room',today,today+2,6,'Synthetic Guest','synthetic@example.invalid','+919999999999','tentative');
  retry:=public.hotel_reserve(request_key,guest,'six-person-room',today,today+2,6,'Synthetic Guest','synthetic@example.invalid','+919999999999','tentative');
  if booking->>'id'<>retry->>'id' then raise exception 'Duplicate reservation on retry'; end if;
  if public.hotel_capacity('six-person-room',today,today+2)<>0 then raise exception 'Hold did not consume category capacity'; end if;
  if public.hotel_capacity('six-person-room',today+2,today+3)<>1 then raise exception 'Checkout-night boundary is wrong'; end if;
  begin
    perform public.hotel_reserve(gen_random_uuid(),other_guest,'six-person-room',today,today+2,6,'Synthetic Guest','synthetic@example.invalid','+919999999999','tentative');
    raise exception 'Oversell allowed';
  exception when sqlstate 'PT409' then null; end;
  if has_function_privilege('anon','public.hotel_reserve(uuid,uuid,text,date,date,integer,text,text,text,text)','execute') or has_function_privilege('authenticated','public.hotel_record_payment(text,text,bigint)','execute') then raise exception 'Privileged booking functions are exposed'; end if;
  perform set_config('request.jwt.claim.sub',guest::text,true);
  execute 'set local role authenticated';
  select count(*) into visible from public.hotel_reservations where id=(booking->>'id')::uuid;
  if visible<>1 then raise exception 'Guest cannot read own booking'; end if;
  perform set_config('request.jwt.claim.sub',other_guest::text,true);
  select count(*) into visible from public.hotel_reservations where id=(booking->>'id')::uuid;
  if visible<>0 then raise exception 'Cross-guest booking data is exposed'; end if;
  execute 'reset role';
  perform public.hotel_staff_change(guest,jsonb_build_object('action','confirm','reservationId',booking->>'id'));
  perform public.hotel_staff_change(guest,jsonb_build_object('action','assign','reservationId',booking->>'id','rooms',jsonb_build_array('324')));
  begin
    perform public.hotel_staff_change(other_guest,jsonb_build_object('action','housekeeping','roomNumber','324','status','out_of_service'));
    raise exception 'Non-staff inventory change allowed';
  exception when sqlstate 'PT403' then null; end;
  begin
    perform public.hotel_staff_change(guest,jsonb_build_object('action','housekeeping','roomNumber','324','status','out_of_service'));
    raise exception 'Booked room was removed from inventory';
  exception when sqlstate 'PT409' then null; end;
  perform public.hotel_staff_change(guest,jsonb_build_object('action','check_in','reservationId',booking->>'id'));
  update public.hotel_reservations set order_id='order_TestRace' where id=(booking->>'id')::uuid;
  retry:=public.hotel_record_payment('order_TestRace','pay_TestRace',(booking->>'total_paise')::bigint);
  if retry->>'status'<>'checked_in' then raise exception 'Capture demoted a checked-in or front-desk-confirmed stay'; end if;
  retry:=public.hotel_record_payment('order_TestRace','pay_TestRace',(booking->>'total_paise')::bigint);
  if retry->>'id'<>booking->>'id' then raise exception 'Payment replay is not idempotent'; end if;
  perform public.hotel_staff_change(guest,jsonb_build_object('action','check_out','reservationId',booking->>'id'));
  if (select housekeeping from public.hotel_inventory_rooms where number='324')<>'dirty' then raise exception 'Checkout did not mark room dirty'; end if;
  perform public.hotel_staff_change(guest,jsonb_build_object('action','housekeeping','roomNumber','324','status','out_of_service'));
  if public.hotel_capacity('six-person-room',today,today+2)<>0 then raise exception 'Out-of-service room remained bookable'; end if;
  perform public.hotel_staff_change(guest,jsonb_build_object('action','housekeeping','roomNumber','324','status','clean'));
  if public.hotel_capacity('six-person-room',today,today+2)<>1 then raise exception 'Returned room did not restore capacity'; end if;
  booking:=public.hotel_reserve(gen_random_uuid(),guest,'six-person-room',today+3,today+4,6,'Synthetic Guest','synthetic@example.invalid','+919999999999','tentative');
  update public.hotel_reservations set hold_until=now()-interval '1 second',order_id='order_TestLate' where id=(booking->>'id')::uuid;
  perform public.hotel_expire_holds();
  if public.hotel_capacity('six-person-room',today+3,today+4)<>1 then raise exception 'Expired hold did not release rooms'; end if;
  retry:=public.hotel_record_payment('order_TestLate','pay_TestLate',(booking->>'total_paise')::bigint);
  if retry->>'status'<>'payment_review' then raise exception 'Late capture incorrectly confirmed inventory'; end if;
  if public.hotel_capacity('six-person-room',today+3,today+4)<>1 then raise exception 'Late capture consumed released capacity'; end if;
  perform public.hotel_staff_change(guest,jsonb_build_object('action','season','name','Synthetic season','startsOn',today+9,'endsOn',today+10,'soloPaise',180000,'couplePaise',240000,'perGuestPaise',100000));
  quote:=public.hotel_quote(today+9,today+11,3);
  if (quote->>'subtotalPaise')::bigint<>660000 or (quote->>'standardSubtotalPaise')::bigint<>720000 then raise exception 'Nightly season boundary or standard-price anchor mismatch'; end if;
  begin
    perform public.hotel_staff_change(guest,jsonb_build_object('action','season','name','Overlapping synthetic season','startsOn',today+9,'endsOn',today+11,'soloPaise',180000,'couplePaise',240000,'perGuestPaise',100000));
    raise exception 'Overlapping seasonal rates allowed';
  exception when sqlstate 'PT409' then null; end;
  booking:=public.hotel_reserve(gen_random_uuid(),guest,'double-room',today+12,today+13,1,'Synthetic Guest','synthetic@example.invalid','+919999999999','tentative');
  perform public.hotel_cancel_tentative(guest,(booking->>'id')::uuid);
  if (select status from public.hotel_reservations where id=(booking->>'id')::uuid)<>'cancelled' then raise exception 'Guest cancellation did not release hold'; end if;
end $test$;
select 'PASS: pricing, per-night seasons, idempotency, capacity, RLS, staff assignment, checkout, capture races, expiry and cancellation' as result;
rollback;
