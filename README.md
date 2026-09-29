# Mainali Group of Hotels

Mobile-first public website and booking foundation for Hotel Teesta, Darjeeling.

## Current state

The public experience and production-safe booking foundation are implemented as a truthful preview. The pages use supplied Hotel Teesta photographs and preserve a guest's selected dates and party size through the room-search route. The customer-facing offer is one Double Room at the supplied starting rates: ₹1,500 for single occupancy and ₹2,500 for one or two guests. Availability, phone OTP, and payment controls remain disabled until their real services are connected.

The repository also includes a Supabase migration, reproducible 25-room inventory seed, database policy/concurrency tests, readiness checks, security headers, and a server-side availability endpoint that fails closed until launch configuration is complete. A protected `/staff` foundation provides a one-screen front desk, while `/book` now carries a selected stay into a real Supabase email sign-in and guarded inventory-hold flow. Manual reservations, folios, phone OTP, and Razorpay checkout remain later milestones.

The approved Mainali logo file is still being prepared. The header therefore uses a dedicated temporary `data-logo-slot="mainali"` mark. It is intentionally isolated in `components/brand.tsx`, so the final logo can replace it without changing navigation spacing or page composition.

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Staff entry is at `http://localhost:3000/staff`. Without Supabase public environment values it intentionally shows a setup-required screen; it never simulates a successful login or hotel data.

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

The site has not been deployed by this build step.
