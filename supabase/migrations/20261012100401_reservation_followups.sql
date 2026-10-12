create function public.hotel_cancel_tentative(guest_user uuid, reservation_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare booking public.hotel_reservations;
begin
  perform 1 from public.hotel_booking_settings where slug='hotel-teesta' for update;
  select * into booking from public.hotel_reservations where id=reservation_id and user_id=guest_user for update;
  if not found then raise exception using errcode='PT404',message='Reservation not found'; end if;
  if booking.status='cancelled' then return to_jsonb(booking); end if;
  if booking.status not in ('tentative','payment_pending') or booking.paid_paise>0 then raise exception using errcode='PT409',message='Contact the hotel to change a confirmed or paid booking'; end if;
  update public.hotel_reservations set status='cancelled',hold_until=null,updated_at=now() where id=booking.id returning * into booking;
  insert into public.hotel_booking_audit(reservation_id,actor_id,action) values(booking.id,guest_user,'guest_cancelled_hold');
  return to_jsonb(booking);
end $$;
revoke execute on function public.hotel_cancel_tentative(uuid,uuid) from public,anon,authenticated;
grant execute on function public.hotel_cancel_tentative(uuid,uuid) to service_role;

-- Expiry is also enforced by the capacity query; cron keeps booking statuses current.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('mainali-expire-holds','*/5 * * * *','select public.hotel_expire_holds()');

-- No outbound request is made until the owner adds hotel_cron_secret in Vault.
-- The same secret must be configured as HOTEL_CRON_SECRET in Edge Function secrets.
select cron.schedule('mainali-booking-followups','*/5 * * * *',$job$
  select net.http_post(
    url:='https://yefndxkljepxhoeclknl.supabase.co/functions/v1/hotel-booking?action=jobs',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret.decrypted_secret),
    body:='{}'::jsonb,
    timeout_milliseconds:=30000
  ) from vault.decrypted_secrets secret where secret.name='hotel_cron_secret'
$job$);
notify pgrst,'reload schema';

-- Preserve the existing audited mutation implementation and add manager-only launch settings.
do $settings$
declare definition text; original text := 'else raise exception using errcode=''PT400'',message=''Unknown staff action''; end if;';
begin
  definition:=pg_get_functiondef('public.hotel_staff_change(uuid,jsonb)'::regprocedure);
  if strpos(definition,original)=0 then raise exception 'Unexpected staff change definition'; end if;
  execute replace(definition,original,$replacement$
  elsif action='settings' then
    if staff_role<>'manager' then raise exception using errcode='PT403',message='Manager access required'; end if;
    if (change->>'taxRateBps')::integer not between 0 and 10000 or length(btrim(change->>'cancellationTerms')) not between 20 and 5000
      or change->>'checkInTime' is null or change->>'checkOutTime' is null then raise exception using errcode='PT400',message='Supply approved tax, stay times and cancellation terms'; end if;
    update public.hotel_booking_settings set tax_rate_bps=(change->>'taxRateBps')::integer,check_in_time=(change->>'checkInTime')::time,
      check_out_time=(change->>'checkOutTime')::time,cancellation_terms=btrim(change->>'cancellationTerms'),payments_enabled=(change->>'paymentsEnabled')::boolean where slug='hotel-teesta';
    update public.hotel_reservations set tax_paise=round(subtotal_paise*(change->>'taxRateBps')::integer/10000.0),
      total_paise=subtotal_paise+round(subtotal_paise*(change->>'taxRateBps')::integer/10000.0),updated_at=now()
      where status='tentative' and hold_until>now() and tax_paise is null and order_id is null;
    insert into public.hotel_booking_audit(actor_id,action) values(actor,'launch_settings_updated');
  else raise exception using errcode='PT400',message='Unknown staff action'; end if;
  $replacement$);
end $settings$;

do $draft_price$
declare definition text;
begin
  definition:=pg_get_functiondef('public.save_checkout_draft(uuid,text,text,text,text,text,text,date,date,integer)'::regprocedure);
  if strpos(definition,'starting_price := case when selected_room_type = ''double-room''')=0 then raise exception 'Unexpected draft writer'; end if;
  execute replace(definition,'starting_price := case when selected_room_type = ''double-room''','starting_price := case when true');
end $draft_price$;

-- Reference the hotel's actual standard rate only when a configured season is cheaper.
do $anchor$
declare definition text;
begin
  definition:=pg_get_functiondef('public.hotel_quote(date,date,integer)'::regprocedure);
  execute replace(definition,'''subtotalPaise'',subtotal',
    '''standardSubtotalPaise'',(stay_out-stay_in)*(case when party_guests=1 then settings.solo_paise::bigint when party_guests=2 then settings.couple_paise::bigint else party_guests::bigint*settings.group_per_guest_paise end),''subtotalPaise'',subtotal');
end $anchor$;

do $capture_race$
declare definition text;
begin
  definition:=pg_get_functiondef('public.hotel_record_payment(text,text,bigint)'::regprocedure);
  execute replace(replace(definition,
    'retained:=booking.status in (''tentative'',''payment_pending'') and booking.hold_until>now();',
    'retained:=booking.status in (''confirmed'',''checked_in'',''checked_out'') or (booking.status in (''tentative'',''payment_pending'') and booking.hold_until>now());'),
    'status=case when retained then ''confirmed'' else ''payment_review'' end',
    'status=case when retained then case when booking.status in (''checked_in'',''checked_out'') then booking.status else ''confirmed'' end else ''payment_review'' end');
end $capture_race$;
