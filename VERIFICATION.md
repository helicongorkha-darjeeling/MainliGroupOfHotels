# Verification — 29 September 2026

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
