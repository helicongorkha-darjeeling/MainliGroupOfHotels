# Mainali Group of Hotels build checklist

## Phase 1 — foundation and public Teesta pages

- [x] Verify the web-ready photo export and keep source photographs untouched.
- [x] Set up Next.js, TypeScript, Tailwind CSS and the multi-property content structure.
- [x] Build the Mainali homepage, Hotel Teesta page, room-search preview, My Bookings shell, contact and draft policies.
- [x] Replace internal room-label review content with one clean customer-facing Double Room offer.
- [x] Apply supplied starting rates: ₹1,500 single occupancy and ₹2,500 for one or two guests.
- [x] Preserve dates and guest count through the public search flow.
- [x] Use eight photos from the owner's cleaned export, with category filters and a full-photo viewer.
- [x] Replace the native date picker with a full-field custom calendar, mobile sheet, and current hotel-timezone defaults.
- [x] Add a stay-review and secure guest email sign-in handoff at `/book`.
- [x] Keep prices, availability, OTP and payment explicitly disabled until real data and providers exist.
- [ ] Replace the dedicated temporary logo slot with the supplied approved Mainali logo.
- [ ] Owner review of the responsive public experience.

## Phase 2 — inventory and staff access

- [x] Add a Supabase migration for properties, categories, rooms, rates, blocks, guests, bookings, payments and memberships.
- [x] Seed the 25 Teesta room numbers as inactive Double Room inventory.
- [x] Add property-scoped staff roles and RLS policies.
- [x] Add pgTAP schema, draft-inventory and fail-closed checks.
- [x] Add important-change audit records.
- [x] Add a protected staff sign-in foundation and one-screen front desk.
- [x] Add room-by-room housekeeping status controls backed by an audited database function.
- [ ] Execute the migration and pgTAP suite locally when Docker Desktop is available.
- [ ] Authenticate the Supabase CLI, link project `yefndxkljepxhoeclknl`, then push the migrations and seed.
- [ ] Connect a Supabase preview project and verify policy behavior with real guest and staff sessions.
- [ ] Add authorised export controls to the reception interface.

## Phase 3 — owned hotel operations core

- [ ] Reception calendar and manual reservations using shared inventory.
- [ ] Guest folios with room charges, extras, payments and balance due.
- [ ] Night audit, daily revenue and occupancy reports.
- [ ] Wire the public and reception flows to the transactional availability and hold functions.
- [ ] Activate the approved property, room, rate and booking settings before testing a real inventory hold.
- [ ] Real phone OTP with CAPTCHA, throttling and recovery.
- [ ] Server-side pricing and approved payment policy.
- [ ] Razorpay test checkout, signature/webhook verification and idempotency.
- [ ] Confirmation, My Bookings, WhatsApp notifications, backup and restore drill.

## Phase 4 — integrations and guest growth

- [ ] OTA/channel inventory sync after each channel's API access and commercial terms are confirmed.
- [ ] Central rate/yield rules and promotions across direct and connected channels.
- [ ] Review inbox, agent/corporate rates and upsellable guest services.
- [ ] Multilingual AI concierge and guest-request routing after the operational core is proven.

## Owner decisions and external setup

- [ ] Supply the approved Mainali logo.
- [ ] Confirm legal hotel name, complete address, map pin, phone, WhatsApp and email.
- [ ] Confirm amenities, room activation, tax treatment, extra-person policy and rate validity dates.
- [ ] Approve check-in/out, cancellation, refund, privacy and booking terms.
- [x] Choose full payment in Razorpay test mode for the first booking test.
- [ ] Approve the live full-payment or deposit policy.
- [ ] Provide Supabase, SMS/OTP, Razorpay test-mode and Vercel access.
- [ ] Name each staff member, assigned property and approved role.
