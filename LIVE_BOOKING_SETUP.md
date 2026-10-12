# Mainali Hospitality booking operations

The hosted database publishes 25 rooms: 14 Double, 4 Triple, 6 Four-person and 1 Six-person. The website searches actual nightly capacity. Verified signed-in guests can reserve a category, see their bookings and cancel unpaid holds. Tentative holds expire after 24 hours; expired holds stop consuming availability immediately, with stored statuses swept every five minutes.

Nightly party prices are ₹2,000 for one guest, ₹2,500 for two and ₹1,200 per guest for parties of three or more. Capacity determines the number of rooms required. Manager-created seasonal rates apply per night; a lower seasonal quote can show the actual standard price as its reference. No seasonal discounts have been invented.

Taxes are unapproved, rather than assumed to be zero. Tentative quotes clearly disclose this. Online payment remains disabled until approved tax and policies are saved and payment credentials are configured. This setup does not determine GST registration or legal tax liability.

## Front desk access

Sign in through `/members` using Google, then open `/staff/operations`. The owner-authorized existing verified account `helicongorkha@gmail.com` has manager access. Additional staff accounts must be explicitly added to `hotel_staff` with their Supabase Auth user ID, an approved role and `active = true`. Guest accounts receive no staff access.

The operations screen provides upcoming guest call contacts, tentative confirmation, unpaid cancellation, physical room assignment, check-in/out and housekeeping. Managers can set seasonal prices and approved tax, check-in/out times and cancellation terms. Confirmation through the front desk records a confirmed reservation without inventing a captured online payment. Paid cancellation/refunds require manual provider handling; late captured payments are flagged for review instead of reclaiming sold inventory.

## Secure provider configuration

Configure these in the **Supabase project `yefndxkljepxhoeclknl` → Edge Functions → Secrets**, never in Git or chat:

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — start with test credentials. `RAZORPAY_MODE` defaults to test; use `live` only after a real test checkout and launch approval.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — use the verified sender you approve.
- `HOTEL_CRON_SECRET` — a random secret of at least 32 characters.

Store the same scheduler secret in Supabase Vault under the name `hotel_cron_secret`. The existing five-minute reminder schedule makes no outbound request until that Vault secret exists. Both the Edge secret and Vault secret are required. Reminders use Resend and stable idempotency keys; the front-desk call list is available independently. No automated phone calls are configured.

Configure Razorpay captured-payment webhook events (`payment.captured` and `order.paid`) to `https://mainli-group-of-hotels.vercel.app/api/payments/webhook`, with the matching webhook secret. Orders and captured amounts are checked server-side. A payment attempt receives a 15-minute hold. Confirmation requires a verified captured payment; callbacks alone never confirm a booking.

Next.js needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the appropriate `NEXT_PUBLIC_SITE_URL` in local/Vercel configuration. Booking mutations use the authenticated Edge gateway; its service-role credential remains inside Supabase. Legacy `BOOKING_MODE`, local Razorpay credentials and the old expiry route do not control the new category reservation system.

## Verification before enabling paid bookings

1. Test Google sign-in on localhost and production with the correct Supabase redirect allowlist.
2. Create a tentative reservation; check its booking history, front-desk entry, inventory reduction and cancellation/release.
3. Approve taxes and policies, then enable payments in manager settings with test keys configured. Complete a captured payment and replay its webhook; confirm a single booking/payment result.
4. Test an expired or cancelled hold followed by a late capture; check the payment-review workflow.
5. Configure Resend and both scheduler secrets. Verify an actual receipt and reminder, including job retry state.
6. Switch to live provider credentials only after these checks and final hotel policy approval.

The production build and 63 unit/API tests pass. The rollback-only hosted SQL regression in `supabase/tests/category_core_regression.sql` checks prices, seasonal nights, capacity, expiry, ownership isolation, staff operations and payment-state races. Two simultaneous database requests for the only Six-person room were also checked: exactly one hold succeeded and the other received a capacity conflict; all synthetic accounts and bookings were removed afterward. These checks do not substitute for real OAuth, provider capture or email-delivery tests, which still require account configuration.

The September foundation migrations and seed are historical prototypes. The hosted project already contains booking drafts and the October category migrations; do not blindly replay historical seeds or `db reset` against production.
