# Verification — 3 October 2026

## Current increment — guest Google sign-in and public push

- Hosted Supabase Auth, checked read-only: Google provider enabled, email confirmation required, phone and anonymous sign-in off. Google's OAuth client accepted the Supabase callback and opened its account chooser (no `redirect_uri_mismatch`). No account was created; a deliberately invalid code was used only to see where Supabase returns guests.
- Found: the Supabase Site URL was `http://localhost:3000` and the production callback was not allow-listed, so a live sign-in would have returned to localhost. This is an owner dashboard setting; see `TASKS.md` and the README setup section.
- `npm test`: 55/55 passed across nine files, including new callback-route tests (success, cancelled, missing, rejected and thrown code exchanges, off-site and staff `next` values) and the checkout-closed message. `npm run lint` and the 25-route Next.js 16.3.6 production build passed.
- Local production-server probes: `/members` and `/my-bookings` render Continue with Google with `Cache-Control: private, no-cache, no-store`; `?auth=failed` shows the retry message; `/auth/callback` returns missing, cancelled and invalid codes with `auth=failed`, keeps `/book` stay parameters, refuses `//evil`, `https://evil` and `/staff`, and sends `private, no-store`.
- Independent review by four reviewers, each finding challenged by a second verifier: no OAuth-flow security defects. A self-registered Google user gains no hosted data or staff access, because the hosted database has only private `booking_drafts`, revoked from browser roles. Confirmed low-severity fixes were applied before pushing: the stay-history caption, sign-out after a failed revoke request, the button state after Back from Google, the checkout-closed message, the privacy notice, and a local path removed from `design-qa.md`. A secrets and personal-data scan of every pending file found only test placeholders.
- Live, after pushing `757b9bd` and Vercel's automatic Production deployment: `/members` and `/my-bookings` serve Continue with Google uncached; `/auth/callback` failure and refusal paths match the local results; the client bundle carries the Supabase project URL; twelve other public pages and `/api/health` return 200; the privacy notice includes Guest sign-in; `/api/booking-drafts` returns `checkout_unavailable`, so the guest form shows the checkout-closed message. The sign-in start reached Google's account page over HTTP. A browser click-through was not run because the Chrome extension was not connected. After the deployment, Supabase still returned live sign-ins to `http://localhost:3000/`, pending the dashboard change.
- Not verified: a completed real Google sign-in and sign-out (needs a person's Google account and the corrected Supabase URL settings); member stay history (the hosted `bookings` table does not exist yet); production draft saving (Vercel has no `SUPABASE_SECRET_KEY`, so the live form says online checkout isn't open).

## Earlier increment — real-photo design, direct-channel setup and unified rate

- Integrated the supplied artifact/ZIP look into the existing Next.js application: self-hosted editorial fonts, ivory/gold palette, complete navigation, real Teesta hero photographs, new destination pages and a gated members page. Dummy properties, reviews, discounts and authentication were not imported. See `design-qa.md` for matched screenshot evidence and fixes.
- A fresh SHA-256 comparison matched all twelve public WebP assets to the owner's cleaned exports; no original photographs were changed or reprocessed.
- `npm test`: 48/48 passed across seven files. `npm run lint` and the Next.js 16.3.6 production build passed, including TypeScript and 25 generated pages/routes.
- Actual local guest-form saving now works with the ignored server key. A labelled synthetic guest reached checkout review and its private hosted row was verified. The test draft remains stored; no OTP, reservation, payment or email verification was created.
- Frontend and hosted starting Double Room pricing now agree: ₹2,500 per room per night for one or two guests, and the same rate for an odd party's final room. Narrow migration `20261003134414_unified_double_room_price.sql` was applied and recorded in hosted history. Hosted tests for 1/2/3/5 guests passed; their synthetic writes were rolled back. Browser-role execution remains denied.
- Mobile calendar/search/results/checkout preserve 10–12 October and one guest, show one Double Room and ₹5,000+ for two nights, and retain name/phone/email fields. Whole-field calendar opening, checkout transition and Escape focus restoration passed. Today defaults correctly show 3–4 October in Darjeeling.
- Desktop 1440 × 1000 and phone 390 × 844 source/implementation views were compared together, including a focused header comparison. Narrow 320 px header/calendar fit was checked and corrected. Gallery space filters and full-photo Escape close passed. The fresh browser pass captured zero errors or warnings during checked home/property interactions.
- Direct-channel setup counts are owner-source aggregates: 25 rooms / capacity 70, with 14 Double / 4 Triple / 6 Four-person / 1 Six-person. Three dashboard sections work; six-person sofa-photo mapping remains explicitly pending. This is read-only setup, not live availability, inventory editing or OTA synchronization.
- Production-build HTTP probes returned 200 for health, members and all new public pages. The development-only channel preview flag returned 307 to staff login in production. Signed-in property-role authorization is implemented but cannot yet be tested against hosted staff tables, which remain absent.
- Backend baseline hash comparison: 24 of 26 existing guarded backend/booking files unchanged; only the intentionally updated rate module and inactive seed differed. New UI/library files and the narrow price migration are additional. Existing user changes in `hotel_fact_sheet.md` and separate audit documents were preserved.
- No push or new Vercel deployment was performed. Production secret-key configuration/form saving, real phone OTP, category inventory holds, Razorpay, member stay tracking and OTA API access remain unverified/inactive. No savings claim is published without comparable real channel pricing.

The sections below are historical records; earlier prices, test counts and missing-local-key statements describe their dates, not the current state.

## Mobile OTP checkout — boilerplate, providers not activated

- Guest review now shows `Book now` instead of an email sign-in link. It leads to mobile verification, with the payment section accessible only after a matching Supabase Auth-confirmed phone. Contact metadata and email login alone are not accepted as mobile verification.
- The real SMS request / OTP verification helpers are wired to Supabase Auth and a fresh Turnstile challenge. `PHONE_OTP_ENABLED` is disabled by default; provider configuration, actual SMS delivery and the CAPTCHA provider remain unverified. No OTP was sent and no Auth session, room hold or payment was created during testing.
- The old guest-side physical-room hold action was removed. Payment stays non-payable even after mobile verification; the future server must authenticate, price and atomically hold category capacity before creating a payment order.
- `npm test`: 43/43 tests passed across six files, including disabled-provider, CAPTCHA, invalid-code, missing-session, wrong-phone, unconfirmed-phone and controlled Auth-error checks. These phone tests use mocks, not a configured SMS provider. Final lint and the production build passed, including TypeScript and all 19 generated pages/routes.
- Browser initially exercised the real missing-storage-key failure: the guest stayed on the details form with inputs retained. Review and the unconfigured OTP screen were subsequently checked using an isolated local synthetic draft-receipt fixture; those UI receipts are not real hosted writes. SMS API requests were blocked in this separate test browser. Live form persistence and provider-enabled verification remain untested.
- Desktop review (1440 × 1000) and phone review/OTP (390 × 844) screenshots were visually inspected. The phone OTP viewport fits the heading, security notice, code field, disabled verification action and back link without horizontal overflow. Focus moves to the current step heading; provider-disabled OTP input and actions remain locked. Artifacts: `output/playwright/mobile-booking-review-desktop.png`, `mobile-booking-review-phone.png` and `mobile-booking-otp-phone.png` (synthetic UI receipts only).
- Hosted public-table metadata still lists only `booking_drafts`. The 25-room source is not imported or connected to date-based category availability. No new migration, push or production deployment was performed for this OTP increment.
- Existing development-browser notices during navigation included `/favicon.ico` returning 404 and Next Image notices for the sticky photo container/LCP. No application exception was observed. The intentional missing-key request returned 503.
- Integration and inventory activation instructions are in `BOOKING_FLOW_SETUP.md`. Local server-key configuration is still absent; do not publish this unfinished booking increment before verifying the real form save.

## Pre-payment saving — prepared, hosted activation pending

- 34/34 application tests passed, including contact validation, save acknowledgement, failed-write handling, bounded requests, origin checks, missing credentials and safe rate-limit responses.
- Nine SQL checks passed in an isolated in-memory PostgreSQL database (PGlite): migration execution, actual draft insert, server-derived Double starting price, retry/edit idempotency, browser ownership, null rates for new layouts, restricted role permissions, service-role access and a twenty-attempt database quota. These are not hosted Supabase or multi-connection concurrency checks.
- Supabase CLI login verified after the user completed sign-in. Account-wide login worked from this checkout; project `MainliGroupOfHotels` (`yefndxkljepxhoeclknl`) reported `ACTIVE_HEALTHY`, and this checkout's local project link matches that ref. No Supabase MCP tools are exposed in this chat; the CLI was used instead.
- Hosted schema metadata was empty before applying the standalone `202610010001_checkout_drafts.sql`. The migration completed and only this version was recorded as applied in migration history. The first history repair failed authentication while another CLI command was running; a sequential retry succeeded.
- Hosted SQL checks passed under the service role: actual draft insert, same-ID contact/category update, null unapproved rates, different-browser rejection and invalid-date rejection. Metadata assertions verified RLS and public-role restrictions. All synthetic writes were rolled back; a follow-up query confirmed zero draft rows and the existence of migration history. No real guest data, sign-in email, reservation or payment was created.
- Local and Vercel Production configuration still lack `SUPABASE_SECRET_KEY`. The website guest-form save and a new production deployment remain unverified; database checks are not an end-to-end website test.
- Fresh `npm run lint` and `npm run build` passed, including TypeScript and all 19 generated pages/routes. No new browser success claim is made.
- Owner inventory source verified: 25 unique room numbers, 70 maximum guests, 14 Double / 4 Triple / 6 Four-person / 1 Six-person, and eleven explicitly marked TV rooms. Blank amenities and rate cells remain unconfirmed.
- Room numbers remain in a backend-only import source. Category-only reservation capacity and later reception assignment still require implementation before enabling holds.

## Guest-contact checkout and photo-named room choices

- Added required name, phone and email fields, with an editable checkout review. Browser checks rejected an invalid phone number, normalised an Indian number and retained values when editing.
- Review checkout focuses its heading, keeps contact details out of the URL and makes no reservation or payment. No sign-in email was sent during this verification.
- All four room-result links carried 10–12 October and four guests into their corresponding Double, Triple, Four-person and Family-with-sofa booking photos.
- Double Room preserved its ₹10,000 starting total for two rooms over two nights. New layouts displayed `On request`; automated tests verify that they have no Double Room price or database category fallback.
- Lobby, Restaurant, Front desk and Bathroom filters each selected the matching photo. The bathroom full-photo viewer loaded on mobile and closed with Escape; it is not assigned to a specific room type.
- Desktop 1440 × 1000 and phone 390 × 844 checkout screenshots were visually inspected. Both checked checkout layouts had no horizontal overflow.
- Twelve source photographs are now curated in the public gallery. Four additional copies were hash-matched; source exports remain untouched.
- `npm test`: 16/16 passed. `npm run lint`, the 19-route production build and `git diff --check` passed.
- Existing earlier-navigation image-preload notice was present in the first local session; the fresh room-choice navigation pass reported zero console errors or warnings.
- Real Supabase profile/booking persistence, sign-in delivery, inventory holds, Razorpay checkout and confirmations remain unverified. Live booking stays disabled.

## Cleaned-photo and custom-calendar increment

- Git remote refreshed; checkout and `origin/main` matched before edits. No incoming changes were skipped.
- Eight renamed WebP photographs copied unchanged from `hotel_teesta_photos_web`; SHA-256 hashes matched for each copy. See `PHOTO_MANIFEST.md`.
- Source folders preserved and excluded from Git/Vercel uploads, including `hotel_teesta_photos_originals`.
- Browser: desktop 1440 × 1000 and phone 390 × 844. Gallery category filter, full-image loading, arrow-key navigation and Escape close passed; screenshots were visually inspected.
- Calendar opens when the date field is clicked near its outer edge, not just on the icon. It advances from check-in to checkout, closes after checkout, and returns keyboard focus to the date control.
- Phone calendar fits within the viewport. No horizontal overflow was found on the checked property page.
- Month boundary: 31 October adjusts checkout to 1 November and opens November for departure selection.
- Browser clock advanced to 2 October: homepage defaults became 2–3 October, proving defaults are not frozen at build time.
- Invalid URL date/guest input recovers to valid calendar defaults without crashing.
- Search → room result → guest sign-in preserves 10–12 October and two guests, with one double room and a ₹5,000 starting total. No sign-in email, reservation or payment was sent by this check.
- Application tests: 9/9 passed. Lint and the 19-route production build passed.
- Existing local-browser notices: missing `/favicon.ico` and one unused image-preload warning during navigation. No application exception was observed. The Next.js smooth-scroll warning was corrected.
- Supabase migration, real inventory holds, payment verification and confirmation remain unverified; this increment does not enable live booking.

## Earlier baseline — 29 September 2026

The following records are historical, including the old photo counts and then-pending Git permissions.

## Passed

- `npm run lint` — zero errors and zero warnings.
- `npm test` — 9/9 tests passed across date/search validation, hotel-timezone defaults, and the supplied single/double occupancy pricing rules.
- `npm run build` — Next.js 16.3.6 production build completed; 19 pages/routes generated, including the guest booking and auth callback routes.
- `/api/health` — HTTP 200 with booking mode reported as `preview` and live booking disabled.
- Production headers — CSP, referrer policy, content-type protection, frame denial, permissions policy and HSTS are present.
- Security behavior — invalid availability input returns 400; configured preview mode and incomplete external configuration fail closed rather than returning invented inventory.
- Browser DOM check — headings, navigation, field labels, form status messaging, and disabled booking actions are exposed accessibly.
- Mobile visual check — 390 × 844 viewport, no horizontal overflow on homepage, Hotel Teesta, or populated room-results page.
- Desktop visual check — 1440 × 900 viewport, no horizontal overflow; hero image and entrance sequence settle correctly.
- Search-state check — `/rooms?checkIn=2026-10-10&checkOut=2026-10-12&guests=3` renders 2 rooms, 2 nights, one double-occupancy room plus one single-occupancy room, and a ₹8,000 starting total.
- Public-content check — the provisional room-label review is absent; Hotel Teesta presents one Double Room offer with the supplied ₹1,500/₹2,500 starting rates.
- Booking-flow check — valid room results continue to `/book`; the page preserves dates/guests, shows the room split and price, and exposes real Supabase email sign-in without claiming a room hold.
- Staff fallback check — `/staff` and `/staff/login` return HTTP 200 and visibly explain the required Supabase setup instead of exposing or inventing hotel data.
- Browser console — no warnings or errors during checked pages.
- Asset check — Sharp decoded all 226 resized WebP files with zero failures (34.46 MB total, maximum width 1920 px, maximum single file 555,884 bytes).
- Published-image check — all 8 selected `public/images` WebP files decoded successfully (2.47 MB total) and loaded in the earlier browser pass.
- Git handoff — local `main` commit created; remote push remains pending because GitHub reports `viewerPermission: READ` for the signed-in `ripplewave2025` account.

## Intentionally not claimed as passed

- Supabase migration and pgTAP execution: files are complete, but the local database run remains pending because Docker Desktop is offline.
- Hosted Supabase schema: the client connection is valid, but `public.properties` is still absent because the hosted migrations have not been pushed.
- Real availability and competing final-room requests: database is not connected to a preview Supabase project.
- Staff authentication and housekeeping writes: the interface and database function are implemented, but a Supabase project and real staff membership are not configured for live-session verification.
- Manual and online reservation concurrency: manual reservation entry is not implemented.
- OTP incorrect, expired, resend and recovery paths: SMS/Auth provider not connected.
- Payment failure, delay, repeat webhook and refund handling: Razorpay test integration not connected.
- Guest/staff data restrictions: policies and tests are written, but still require execution against PostgreSQL and real-session verification.
- Backup restoration and authorised exports: database and storage are not provisioned.

The earlier in-app browser pass verified the responsive pages. After the Task Manager restart, the browser safety layer declined localhost reload, so this pass re-verified the production server and HTTP behavior directly; no new visual-pass claim has been added.
