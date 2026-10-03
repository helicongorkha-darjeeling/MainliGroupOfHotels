# Mobile booking flow — provider-ready foundation

## What is implemented

Guest details are saved as a private Supabase draft before review. Review has one **Book now** action instead of the guest email-link button. The next step requests an SMS OTP through Supabase Auth when the integration is enabled and a real CAPTCHA token is available. Supabase validates the code; the application also checks the current Auth user's canonical, confirmed mobile matches the draft contact. A matching previously verified session can continue without requesting another SMS. Email remains a contact field, not a verified identity.

The payment section opens only after that mobile verification. It remains non-payable: no payment order, room reservation, receipt or confirmation is invented. The old guest-side physical-room hold call has been removed. Staff email authentication is unchanged.

Verified on 3 October: the actual local guest form saves to hosted `booking_drafts` before review. Frontend and hosted draft pricing now use the same ₹2,500 starting Double Room price for one or two guests. The narrow price migration preserves service-role-only writing; synthetic pricing regression rows were rolled back.

The member login at `/members` reuses the real Supabase phone-auth helpers and CAPTCHA gate. Completed stay counts query the signed-in guest's `checked_out` reservations under RLS; drafts never count. Phone delivery and the hosted reservation schema remain inactive, so no live member-login or stay-count test is claimed.

## Configure later — keep disabled until tested

1. Configure Supabase Phone Auth and the chosen SMS provider in Supabase's secure settings. Keep SMS provider credentials there, not in `NEXT_PUBLIC_*` or browser code. Ensure phone confirmation is required; do not auto-confirm phones. Configure a six-digit OTP, delivery restrictions, rate limits and an approved test number. Creating a new phone account does not merge it with an existing email account; any later identity-linking work must verify ownership of both identities.
2. Create a Cloudflare Turnstile widget for the intended domains. Set its public site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` locally and in Vercel. Configure its matching secret and enforce CAPTCHA in Supabase Auth. The component sends each fresh token to Supabase for validation; browser checks are not sufficient protection by themselves. The CSP permits only the required Cloudflare origin in addition to existing providers.
3. Set `PHONE_OTP_ENABLED=true` only after the above provider settings are verified. Restart development / rebuild the deployment when environment variables change. Request/resend needs a fresh security token. The 60-second UI cooldown is a convenience, not a replacement for server-enforced quotas. Do not log OTPs, CAPTCHA responses or Auth sessions.

These settings do not turn on inventory or payments. `BOOKING_MODE=preview` remains unchanged. Mobile verification cannot mark a draft's email as verified or confirm a booking. A future payment endpoint must recheck identity server-side; client UI state is not payment authorization.

## Inventory: category booking, reception assignment

The owner's corrected inventory is recorded in `supabase/data/teesta-inventory.json`: 14 Double, 4 Triple, 6 Four-person and 1 Six-person room (25 rooms / maximum 70 guests). It has not been imported or activated in hosted inventory. The existing public photo choices are display content, not an availability calculation. Do not equate the Family-with-sofa photo to the Six-person room without confirmation.

The website is the first channel. `/staff/channels` is a read-only setup view of that inventory and its remaining launch gates, not a live channel manager. Local development can use `?preview=1`; production ignores the preview flag and requires an active Teesta reception/property-manager membership or group administrator. OTA onboarding comes after the direct inventory pool is proven safe.

Before taking any payment, import approved categories and private physical room mappings. Availability must be calculated for **each night** in the selected category, subtracting confirmed reservations, unexpired holds and operational blocks. Create a short-lived, category-level hold atomically so concurrent checkouts cannot oversell. Let reception assign a compatible physical room later, with staff authorization and an audit trail; guests never choose a room number. Expired/failed checkouts must release held capacity.

Do not blindly apply the older foundation migrations: the original hold function chooses physical rooms, which is not the new reception-assignment workflow. Rates, taxes and policies remain separate owner approvals.

## Payment integration contract — implement after inventory is safe

- Authenticate the current guest on the server and verify the Auth mobile matches the privately owned draft. Never trust a browser `verified` flag, amount, category UUID or guest identifier.
- Validate dates and occupancy, calculate the approved final INR price on the server, and obtain a real category hold. Reject unsupported categories or absent rates; never silently substitute Double inventory.
- Create and persist a real Razorpay **test-mode** order bound to that guest, hold, final amount and currency, using idempotency. No order or payable amount is implemented yet.
- Open checkout using the returned provider order and public key only. Provider callbacks are not booking confirmation: verify signatures and payment capture on the server, reconcile signed webhooks idempotently, and handle capture/hold-expiry races.
- Confirm only once after verified payment and retained inventory; show a genuine booking reference. Handle failure, cancellation, late capture/refund, repeated callbacks, and notification delivery without double booking or double confirmation.

The first requested payment policy is full payment in Razorpay test mode; live policy is still unapproved. Keep production charging off until an actual end-to-end test and hotel approvals are complete.

Primary references: [Supabase phone OTP](https://supabase.com/docs/guides/auth/phone-login), [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [Turnstile rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).
