# Verification — 1 October 2026

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
