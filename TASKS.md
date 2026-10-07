# Mainali Group of Hotels build checklist

## Phase 1 — foundation and public Teesta pages

- [x] Verify the web-ready photo export and keep source photographs untouched.
- [x] Set up Next.js, TypeScript, Tailwind CSS and the multi-property content structure.
- [x] Build the Mainali homepage, Hotel Teesta page, room-search preview, My Bookings shell, contact and draft policies.
- [x] Replace internal room-label review content with one clean customer-facing Double Room offer.
- [x] Apply the latest owner-approved starting Double Room rate: ₹2,500 per room for one or two guests; no separate single-room offer. Frontend and hosted draft pricing were reconciled on 3 October.
- [x] Preserve dates and guest count through the public search flow.
- [x] Use twelve photos from the owner's cleaned export, with category filters and a full-photo viewer.
- [x] Replace the native date picker with a full-field custom calendar, mobile sheet, and current hotel-timezone defaults.
- [x] Add a stay-review and secure guest email sign-in handoff at `/book`.
- [x] Add name, phone and email validation with an editable checkout review, without automatically sending email or charging payment.
- [x] Replace guest email-link checkout with Book now → mobile OTP → a locked payment step; add real Supabase Auth integration seams, CAPTCHA support and safe disabled defaults.
- [x] Show photo-named Double, Triple, Four-person and Family-with-sofa choices, keeping unapproved rates and inventory disabled.
- [x] Keep prices, availability, OTP and payment explicitly disabled until real data and providers exist.
- [x] Integrate the supplied artifact's ivory/gold editorial design into the existing Next.js app using real Teesta photographs, not the demo hotels, claims or contact details.
- [x] Add Home, Hotels, Experiences, Offers, Our Story and Contact navigation with real pages, plus Members login beside My bookings.
- [x] Add the member phone-auth foundation and completed-reservation stay count; actual phone login and stay tracking remain inactive until their providers/schema are activated.
- [x] Remove the placeholder logo circle and obsolete homepage/property CSS. Keep the Mainali text wordmark until an approved logo is supplied.
- [x] Add guest Google sign-in to Members and My bookings through Supabase Auth (PKCE), with allow-listed return paths (`/book`, `/my-bookings`, `/members`), uncached signed-in pages, sign-out and a visible failure message. Signing in grants no reservation, payment, mobile verification or staff access.
- [x] Connect Google sign-in to checkout: continue with Google from `/book`, and link a signed-in guest's mobile to that account instead of replacing the session; stale past-date room searches no longer lead to an invalid booking page.
- [ ] Owner review of the responsive public experience.

## Phase 2 — inventory and staff access

- [x] Add a Supabase migration for properties, categories, rooms, rates, blocks, guests, bookings, payments and memberships.
- [x] Seed the 25 Teesta room numbers as inactive Double Room inventory.
- [x] Add property-scoped staff roles and RLS policies.
- [x] Add pgTAP schema, draft-inventory and fail-closed checks.
- [x] Add important-change audit records.
- [x] Add a protected staff sign-in foundation and one-screen front desk.
- [x] Add room-by-room housekeeping status controls backed by an audited database function.
- [x] Record the owner's corrected 25-room / 70-guest inventory as a backend-only import source, with unknown amenities preserved.
- [x] Prepare private pre-payment draft storage and retry-safe save-before-checkout behavior, independent of Razorpay credentials.
- [x] Apply the standalone checkout-draft migration to the hosted project and verify SQL save, retry, ownership and role permissions using rolled-back synthetic test data.
- [x] Configure the ignored local server-only Supabase key and verify a real, labelled checkout-draft row from the guest form without requesting OTP or payment.
- [ ] With owner approval to store guest contacts in production, add the server-only key to Vercel Production and repeat the real draft-save check. Until then the live booking form says online checkout isn't open and saves nothing.
- [x] Apply the narrow unified Double Room price migration to hosted Supabase; verify 1, 2, 3 and 5 guest quotes with synthetic writes rolled back.
- [ ] Import the approved Double/Triple/Four-person/Six-person categories and staff-only physical room mappings.
- [ ] Execute the migration and pgTAP suite locally when Docker Desktop is available.
- [x] Authenticate the Supabase CLI and link this checkout to project `yefndxkljepxhoeclknl`.
- [ ] Reconcile the older foundation migrations with category-capacity booking and later reception assignment before applying them or importing inventory; do not blindly push the old seed.
- [ ] In that reconciliation, keep guest-facing hold/payment functions off the `anon` and `authenticated` roles (Google sign-in makes accounts free to create): call them only from server routes that check the session, verified phone, CAPTCHA, `BOOKING_MODE` and quotas. Never apply `202609290001` without `202609300001`, and backfill `guests` rows for Auth users created before the trigger exists.
- [ ] Connect a Supabase preview project and verify policy behavior with real guest and staff sessions.
- [ ] Add authorised export controls to the reception interface.

## Phase 3 — owned hotel operations core

- [ ] Reception calendar and manual reservations using shared inventory.
- [ ] Reserve category-level capacity without exposing or assigning room numbers to guests; implement audited reception assignment later, preserving oversell protection.
- [ ] Guest folios with room charges, extras, payments and balance due.
- [ ] Night audit, daily revenue and occupancy reports.
- [ ] Wire the public and reception flows to the transactional availability and hold functions.
- [ ] Activate the approved property, room, rate and booking settings before testing a real inventory hold.
- [ ] Activate and verify phone OTP delivery with the chosen SMS provider, enforced CAPTCHA, server quotas and recovery; the UI/helper foundation is built but actual delivery is untested.
- [ ] Server-side pricing and approved payment policy.
- [ ] Razorpay test checkout, signature/webhook verification and idempotency.
- [ ] Confirmation, My Bookings, WhatsApp notifications, backup and restore drill.

## Phase 4 — integrations and guest growth

- [x] Establish the website as the first channel and build a read-only setup dashboard with the owner-source 25-room category mapping. Local preview is development-only; production requires an active Teesta staff role or group administrator.
- [ ] Connect the direct-channel dashboard to activated category reservations, operational blocks and approved nightly rates. It does not yet edit inventory or manage live reservations.
- [ ] OTA/channel inventory sync after each channel's API access and commercial terms are confirmed.
- [ ] Show crossed-out OTA savings only after comparable, dated, tax/policy-matched rates and a genuine direct discount are approved.
- [ ] Central rate/yield rules and promotions across direct and connected channels.
- [ ] Review inbox, agent/corporate rates and upsellable guest services.
- [ ] Multilingual AI concierge and guest-request routing after the operational core is proven.

## Owner decisions and external setup

- [ ] In Supabase Auth → URL Configuration, set the Site URL to `https://mainli-group-of-hotels.vercel.app` and add Redirect URLs `https://mainli-group-of-hotels.vercel.app/**` and `http://localhost:3000/**` (never a broad `*.vercel.app` pattern). Until then, live Google sign-ins return to localhost.
- [ ] Confirm the Google OAuth consent screen is published for all guests (not only test users) and shows the hotel's name, then complete one real Google sign-in and sign-out on the live site.
- [ ] Supply the approved Mainali logo.
- [ ] Confirm legal hotel name, complete address, map pin, phone, WhatsApp and email.
- [ ] Confirm amenities, room activation, tax treatment, extra-person policy and rate validity dates.
- [ ] Confirm Triple, Four-person and Family-with-sofa rates and their physical room/category mappings; map bathrooms to room types if needed.
- [ ] Approve check-in/out, cancellation, refund, privacy and booking terms.
- [x] Choose full payment in Razorpay test mode for the first booking test.
- [ ] Approve the live full-payment or deposit policy.
- [ ] Provide Supabase, SMS/OTP, Razorpay test-mode and Vercel access.
- [ ] Name each staff member, assigned property and approved role.
