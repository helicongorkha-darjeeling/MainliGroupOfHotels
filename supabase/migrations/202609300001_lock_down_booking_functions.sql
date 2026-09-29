-- Security fix for 202609290001_initial_booking_foundation.sql
--
-- 1. Supabase grants EXECUTE on every new public function to anon and
--    authenticated by default. "revoke ... from public" does not remove those
--    grants, so guests (and anonymous visitors) could call the payment
--    functions directly and confirm a booking without paying.
-- 2. record_verified_payment() always failed: its RETURNS TABLE column
--    "booking_id" made "where booking_id = ..." ambiguous, so a genuine paid
--    booking could never be confirmed.
-- 3. One guest account could hold every room at once. Holds are now capped.

-- Stop future functions in public from being callable by the API roles by default.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

-- Start from nothing, then grant only what each role needs.
revoke execute on all functions in schema public from anon, authenticated, public;

grant execute on function public.is_group_admin() to authenticated;
grant execute on function public.is_staff_for_property(uuid) to authenticated;
grant execute on function public.search_public_availability(text, date, date, integer) to anon, authenticated;
grant execute on function public.create_online_inventory_hold(text, uuid, date, date, integer, integer) to authenticated;
grant execute on function public.create_room_block(uuid, date, date, text) to authenticated;
grant execute on function public.set_room_housekeeping_status(uuid, public.housekeeping_status) to authenticated;
grant execute on function public.prepare_payment_attempt(uuid) to authenticated;

-- Server-only (called by trusted route handlers with the secret key).
grant execute on function public.expire_inventory_holds() to service_role;
grant execute on function public.record_verified_payment(text, text, integer, text) to service_role;

-- The Razorpay order id must come from the server's own Orders API call, never from the browser.
create or replace function public.attach_provider_order(target_payment_id uuid, razorpay_order_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments payment
  set provider_order_id = razorpay_order_id, updated_at = now()
  where payment.id = target_payment_id
    and payment.status = 'pending'
    and payment.provider_order_id is null;
  if not found then raise exception 'Payment attempt is not attachable'; end if;
end;
$$;
revoke execute on function public.attach_provider_order(uuid, text) from anon, authenticated, public;
grant execute on function public.attach_provider_order(uuid, text) to service_role;

-- Fix the ambiguous column references (table-qualified) so verified payments can confirm.
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

  update public.payments payment
  set provider_payment_id = razorpay_payment_id,
      status = 'captured',
      verified_at = now(),
      updated_at = now()
  where payment.id = target_payment.id;

  if target_booking.status in ('hold', 'pending_payment') and target_booking.hold_expires_at > now() then
    update public.bookings booking set status = 'confirmed', updated_at = now() where booking.id = target_booking.id;
    update public.inventory_allocations allocation
      set allocation_type = 'confirmed', expires_at = null, updated_at = now()
      where allocation.booking_id = target_booking.id and allocation.status = 'active';
    resulting_status := 'confirmed';
  else
    update public.bookings booking set status = 'payment_review', updated_at = now() where booking.id = target_booking.id;
    update public.inventory_allocations allocation
      set status = 'released', updated_at = now()
      where allocation.booking_id = target_booking.id and allocation.status = 'active' and allocation.allocation_type = 'hold';
    resulting_status := 'payment_review';
  end if;

  return query select target_booking.id, resulting_status;
end;
$$;
revoke execute on function public.record_verified_payment(text, text, integer, text) from anon, authenticated, public;
grant execute on function public.record_verified_payment(text, text, integer, text) to service_role;

-- Cap simultaneous holds per guest so one account cannot lock the whole hotel.
create or replace function public.guard_hold_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'online' and new.status = 'hold' and (
    select count(*) from public.bookings booking
    where booking.guest_id = new.guest_id
      and booking.status in ('hold', 'pending_payment')
      and booking.hold_expires_at > now()
  ) >= 2 then
    raise exception 'Too many unpaid holds. Complete or wait for an existing hold to expire.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_hold_limit() from anon, authenticated, public;

create trigger bookings_guard_hold_limit
before insert on public.bookings
for each row execute function public.guard_hold_limit();
