# Mainali Group of Hotels

Mobile-first public website and booking foundation for Hotel Teesta, Darjeeling.

## Current state

The public experience is a guarded preview using the supplied ivory/gold design and Hotel Teesta's actual photographs. Home, Hotels, Experiences, Offers, Our Story, Contact and Members login have real destinations. The calendar defaults to today in Darjeeling and preserves dates and party size through room search and checkout. Double Rooms start at ₹2,500 per room per night for one or two guests; Triple, Four-person and Family-with-sofa layouts remain on request. Availability, phone OTP and payments are not live.

Members login and My bookings offer guest sign-in with Google through Supabase Auth. Signing in creates a private guest account; it does not create a reservation, take payment, verify a mobile number or grant staff access.

The actual local `/book` form saves contacts and the selected stay into hosted private `booking_drafts` before checkout review. Book now then leads to the gated mobile OTP/payment foundation; it does not send an email link or allocate a physical room. The hosted draft writer and frontend starting price have been reconciled. A draft is not a reservation. Production server-key configuration and saving must be verified separately after deployment.

The website is the first channel. The protected `/staff/channels` setup dashboard summarizes the owner's 25 rooms and 70-person capacity; it is read-only source mapping, not live inventory or OTA synchronization. The older front-desk/database foundation is retained but must be reconciled with category-level reservations and later reception room assignment before activation. Do not blindly push its historical migrations or provisional seed. See [BOOKING_FLOW_SETUP.md](BOOKING_FLOW_SETUP.md) and [SUPABASE_CHECKOUT_SETUP.md](SUPABASE_CHECKOUT_SETUP.md).

The approved Mainali logo is still pending. The header uses a clean text wordmark in `components/brand.tsx`, with the former placeholder circle removed. Local verification and screenshot evidence are recorded in [design-qa.md](design-qa.md) and [VERIFICATION.md](VERIFICATION.md).

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Staff entry is at `http://localhost:3000/staff`. Without Supabase public environment values it intentionally shows a setup-required screen; it never simulates a successful login or hotel data.

Read-only channel setup preview: `http://localhost:3000/staff/channels?preview=1`. The preview flag works only in development; production requires an authenticated, active Teesta staff membership or group administrator. Member phone login also remains disabled until its real provider and CAPTCHA are configured.

Production checks:

```bash
npm run lint
npm test
npm run build
npm start
```

Docker is not required for the website checks above. It is required only for the local Supabase migration and pgTAP checks described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment and safety

Keep `BOOKING_MODE=preview` until all owner decisions in `TASKS.md` are approved and the transactional booking path has passed concurrency and payment tests. Razorpay values must start with test-mode credentials. Never expose `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` through `NEXT_PUBLIC_` variables.

## Guest Google sign-in setup

Google sign-in needs no extra environment variables; it uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The rest is dashboard configuration:

1. Google Cloud: a Web OAuth client whose authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`, with the consent screen published so every guest, not only test users, can sign in.
2. Supabase → Authentication → Sign In / Providers → Google: enabled with that client's ID and secret.
3. Supabase → Authentication → URL Configuration: Site URL `https://mainli-group-of-hotels.vercel.app`; Redirect URLs `https://mainli-group-of-hotels.vercel.app/**` and `http://localhost:3000/**`. The callback carries a `?next=` path, so exact entries without `**` do not match. Never allow a broad `https://*.vercel.app/**` pattern.

The site returns guests only to `/book`, `/my-bookings` or `/members` (see `lib/auth-redirect.ts`).

## Current official foundation

The implementation was checked against current official guidance on 28 September 2026:

- [Next.js App Router](https://nextjs.org/docs/app) and [installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side), [phone sign-in](https://supabase.com/docs/guides/auth/phone-login), [auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Razorpay server integration](https://razorpay.com/docs/payments/server-integration/nodejs/) and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs) and [environment variables](https://vercel.com/docs/environment-variables)

Important implementation rules for later phases:

- Use Supabase sessions in secure cookies and RLS/grants for guest and property isolation.
- Add CAPTCHA and application-level throttling in addition to Supabase OTP rate limits.
- Calculate prices on the server and persist the breakdown with the booking.
- Allocate inventory in a database transaction; expire holds and do not revive unavailable inventory after a late payment.
- Verify Razorpay payment signatures and webhook authenticity on the server; process webhook events idempotently.
- Treat cancellation and refund as separate, linked operations.

## Deployment

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the staged Vercel and Supabase release process. Keep `BOOKING_MODE=preview` and do not add live Razorpay credentials until every launch gate is complete.

Backup, hold-expiry, recovery, and incident procedures are in [OPERATIONS.md](OPERATIONS.md).

Pushing `main` to GitHub deploys Vercel Production automatically. The 3 October push (editorial design, private checkout drafts, channel setup and guest Google sign-in) passed 55 local tests, lint and the production build. Production draft saving still needs `SUPABASE_SECRET_KEY` in Vercel, approved by the owner. Live reservation, OTP, payment, member history and OTA checks remain pending.
