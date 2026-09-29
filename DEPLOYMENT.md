# Deployment

This release is safe to deploy as a public preview. It is not approved for live inventory, OTP, or payments.

## 1. Website checks

```bash
npm ci
npm run lint
npm test
npm run build
```

## 2. Local Supabase verification

Docker Desktop must be running for this section only.

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

`db reset` applies `supabase/migrations` and `supabase/seed.sql`. The pgTAP file in `supabase/tests` checks the schema, draft inventory and fail-closed booking setting. Concurrency, role-session and repeated-payment scenarios remain mandatory integration tests before live booking.

Do not continue if any migration or database test fails.

## 3. Preview Supabase project

1. Create a separate Supabase project for preview—not the eventual production project.
2. Link the CLI to that project and review the migration before applying it.
3. Apply the migration, then run the seed in the Supabase SQL editor.
4. Create one test guest, one reception user, one property manager, and one group administrator.
5. Verify each role can read only its permitted rows.
6. Keep every Teesta room and the property itself in `draft` until the owner confirms the facts.

Never place a secret/service-role key in a `NEXT_PUBLIC_` variable.

## 4. Vercel preview

1. Import the Git repository into Vercel as a Next.js project.
2. Add all `.env.example` variables to the Preview environment.
3. Use preview/test credentials only and keep `BOOKING_MODE=preview`.
4. Set `NEXT_PUBLIC_SITE_URL` to the assigned HTTPS preview URL.
5. Set `APP_RELEASE` to the deployed Git commit SHA.
6. Deploy and check `/api/health`, `/api/readiness`, the mobile pages, and server logs.

`/api/health` proves the web process is alive. `/api/readiness` additionally proves required configuration and a database query; it should return 503 until that setup is complete.

## 5. Live-booking gate

Set `BOOKING_MODE=live` only after all of the following are evidenced:

- Owner-approved room facts, rates, taxes, payment choice and policies.
- Activated inventory matching the physical room register.
- Real OTP with CAPTCHA, throttling, resend and recovery tests.
- Razorpay test signatures, webhook authentication, delayed/repeated event tests and refund handling.
- Concurrent online and reception booking tests for the last room.
- Guest/staff access tests, authorised export review, backup restore drill and owner acceptance.

Until then, the public deployment must remain a truthful preview.
