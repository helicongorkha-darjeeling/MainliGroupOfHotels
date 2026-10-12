# Mainali Hospitality booking operations

The hosted database publishes 25 rooms: 14 Double, 4 Triple, 6 Four-person and 1 Six-person. The website searches actual nightly capacity. Verified signed-in guests can reserve a category, see their bookings and cancel unpaid holds. Tentative holds expire after 24 hours; expired holds stop consuming availability immediately, with stored statuses swept every five minutes.

The public checkout starts with the room and price review. Pay now starts Google sign-in for signed-out guests and returns them to their selected stay. Google supplies name and email, not a contact phone. Guests enter their phone and explicitly continue to save `booking_contact_phone` in their Supabase Auth user metadata; it is not OTP verification and is never used for authorization. The authenticated `/api/guest-contact` endpoint works without payment secrets and only updates the caller's own contact metadata. Payment reservations then store these details in `hotel_reservations`, and secure Razorpay checkout receives the server-owned reservation contact prefill. Existing tentative bookings remain supported; new public bookings use payment confirmation. Counts above three are displayed as “Rooms available”; exact low counts and sold-out status always come from inventory, never repeat visits.

Nightly party prices are ₹2,000 for one guest, ₹2,500 for two and ₹1,200 per guest for parties of three or more. Capacity determines the number of rooms required. Manager-created seasonal rates apply per night; a lower seasonal quote can show the actual standard price as its reference. No seasonal discounts have been invented.

Taxes are unapproved, rather than assumed to be zero. Tentative quotes clearly disclose this. Online payment remains disabled until approved tax and policies are saved and payment credentials are configured. This setup does not determine GST registration or legal tax liability.

## Front desk access

Open `/admin/login` to sign in with a password or an approved staff Google account; `/admin` and `/staff/operations` show the same protected dashboard. The username `Admin` maps to the owner-authorized existing verified account `helicongorkha@gmail.com`, which already has manager access. It does not assign a role or create a shared password. To enable password sign-in, the owner first signs in with Google, opens `/admin/security`, and personally sets the password using Supabase Auth. Passwords are never stored in this repository or in user metadata. Additional staff accounts must be explicitly added to `hotel_staff` with their Supabase Auth user ID, an approved role and `active = true`. Guest accounts receive no staff access, even if they set a role in their own metadata.

The dashboard reads the latest 500 reservations, including past stays, and all 25 physical rooms directly from the authenticated Supabase Edge gateway. It refreshes every 30 seconds when visible, pauses during saves, and provides manual refresh, guest/reference/contact search and status filters. Changes refresh immediately after Supabase confirms the save. Setting housekeeping to `out_of_service` removes that room from bookable capacity; the database rejects changes that would conflict with existing bookings.

The operations screen provides upcoming guest call contacts, tentative confirmation, unpaid cancellation, physical room assignment, check-in/out and housekeeping. Managers can set seasonal prices and approved tax, check-in/out times and cancellation terms. Confirmation through the front desk records a confirmed reservation without inventing a captured online payment. Paid cancellation/refunds require manual provider handling; late captured payments are flagged for review instead of reclaiming sold inventory.

## Secure provider configuration

Configure these in the **Supabase project `yefndxkljepxhoeclknl` → Edge Functions → Secrets**, never in Git or chat:

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — start with test credentials. `RAZORPAY_MODE` defaults to test; use `live` only after a real test checkout and launch approval.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — use the verified sender you approve.
- `HOTEL_CRON_SECRET` — a random secret of at least 32 characters.

Store the same scheduler secret in Supabase Vault under the name `hotel_cron_secret`. The existing five-minute reminder schedule makes no outbound request until that Vault secret exists. Both the Edge secret and Vault secret are required. Reminders use Resend and stable idempotency keys; the front-desk call list is available independently. No automated phone calls are configured.

Configure Razorpay captured-payment webhook events (`payment.captured` and `order.paid`) to `https://mainli-group-of-hotels.vercel.app/api/payments/webhook`, with the matching webhook secret. Orders and captured amounts are checked server-side. A payment attempt receives a 15-minute hold. Confirmation requires a verified captured payment; callbacks alone never confirm a booking.

In Razorpay, start in Test mode and generate the Key ID and Key Secret under Account & Settings → API Keys. Add the webhook above with a separate secret and the two listed events. Confirm automatic payment capture and the desired payment methods. Store these three values in Supabase Edge Functions → Secrets as listed above, with `RAZORPAY_MODE=test`. These secrets belong to the Edge booking gateway; adding them only in Vercel does not configure it. Complete a test checkout and webhook replay before real payments. For Live mode, complete Razorpay account activation/KYC and settlement bank setup, submit the production website for verification, then generate Live keys and set `RAZORPAY_MODE=live`. Hotel-approved taxes and final booking/cancellation policies must also be saved in Front desk operations before payments are enabled.

Official setup references: [API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/), [webhooks](https://razorpay.com/docs/webhooks/setup-edit-payments/), [capture settings](https://razorpay.com/docs/payments/payments/capture-settings), [Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

Checkout lists UPI first and retains the other methods enabled on the Razorpay account. It hides UPI Collect and uses Razorpay's device-specific Intent/QR flow. On Android and iOS mobile web, guests choose a supported app such as GPay or PhonePe; the app opens with the payment details, and the guest approves with their UPI PIN. Desktop checkout displays a QR to scan with a phone. UPI Intent must be enabled on the merchant account (usually enabled by default; contact Razorpay support if missing). A separate personal GPay QR or UPI ID is not required for this gateway integration. Booking confirmation still requires the server-verified captured payment for the reservation order. Test app switching and return on real Android/iOS phones, and desktop QR payment, before enabling live bookings. Test-mode simulation alone does not verify real app switching. References: [UPI Intent and platform support](https://razorpay.com/docs/payments/payment-methods/upi/upi-intent), [Intent/QR checkout configuration](https://razorpay.com/docs/announcements/upi-collect-migration/standard-integration).

Next.js needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the appropriate `NEXT_PUBLIC_SITE_URL` in local/Vercel configuration. Booking mutations use the authenticated Edge gateway; its service-role credential remains inside Supabase. Legacy `BOOKING_MODE`, local Razorpay credentials and the old expiry route do not control the new category reservation system.

## Google sign-in URLs

In hosted Supabase **Authentication → URL Configuration**, the Site URL must be `https://mainli-group-of-hotels.vercel.app`. Add the exact allowed callback `https://mainli-group-of-hotels.vercel.app/auth/callback`. Optional development callbacks are `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`. The hosted Auth configuration is separate from `supabase/config.toml`, which configures a local Supabase stack.

Google's Authorized redirect URI remains `https://yefndxkljepxhoeclknl.supabase.co/auth/v1/callback`; Google returns to Supabase first. The website requests a fixed callback without booking query parameters, stores the validated stay destination in a ten-minute cookie and deletes it on return. Start sign-in from the production website in the same browser that will receive the callback. A localhost PKCE cookie cannot authenticate a different production host. After changing settings, restart sign-in instead of reusing an old Google or callback URL.

## Verification before enabling paid bookings

1. Test Google sign-in on localhost and production with the correct Supabase redirect allowlist.
2. Create a tentative reservation; check its booking history, front-desk entry, inventory reduction and cancellation/release.
3. Approve taxes and policies, then enable payments in manager settings with test keys configured. Complete a captured payment and replay its webhook; confirm a single booking/payment result.
4. Test an expired or cancelled hold followed by a late capture; check the payment-review workflow.
5. Configure Resend and both scheduler secrets. Verify an actual receipt and reminder, including job retry state.
6. Switch to live provider credentials only after these checks and final hotel policy approval.

The production build and 79 unit/API tests pass, including anonymous/guest denial and server-verified staff-role checks for the admin dashboard. The rollback-only hosted SQL regression in `supabase/tests/category_core_regression.sql` checks prices, seasonal nights, capacity, expiry, ownership isolation, staff operations and payment-state races. It also verifies non-staff inventory denial, booked-capacity protection, and capacity removal/restoration when housekeeping changes. Two simultaneous database requests for the only Six-person room were also checked: exactly one hold succeeded and the other received a capacity conflict; all synthetic accounts and bookings were removed afterward. These checks do not substitute for real OAuth, provider capture or email-delivery tests, which still require account configuration.

The September foundation migrations and seed are historical prototypes. The hosted project already contains booking drafts and the October category migrations; do not blindly replay historical seeds or `db reset` against production.
