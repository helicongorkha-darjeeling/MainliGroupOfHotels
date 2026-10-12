# Mobile staff review

Review date: 12 October 2026. Branch: `codex/mobile-staff-operations`.

## What is built

One 25-room hotel with manager, front desk and read-only housekeeping access. The flow covers staff accounts, room/key-return status, capacity-safe walk-ins and extensions, registration/private ID photos, server check-in/out times, folios, manual/test gateway payments and financial-year invoices. See [release and operating instructions](../../LIVE_BOOKING_SETUP.md).

## Phone screenshots

These are native browser captures at **390 × 844**, using the actual staff components with **synthetic sample data**. Sample legal information and the 5% sample tax are not approved hotel settings. All saves, uploads, account changes, payments and messages in this review are disabled.

| Screen | Capture |
| --- | --- |
| Staff sign-in | [Login](login-390.jpg) |
| Front desk home | [Home](01-home-390.jpg) |
| Arrivals / in-house / departures | [Arrivals](arrivals-390.jpg), [In-house](in_house-390.jpg), [Departures](departures-390.jpg) |
| 25-room operations | [Rooms](rooms-390.jpg) |
| Walk-in steps | [Dates](walk-in-390.jpg), [Room](walk-in-room-390.jpg), [Guest](walk-in-guest-390.jpg), [Advance](walk-in-advance-390.jpg) |
| Registration | [Check-in](check-in-390.jpg), [Private ID fields](check-in-id-390.jpg) |
| Stay and bill | [Stay](stay-390.jpg), [Take payment](take-payment-390.jpg) |
| Housekeeping | [Dirty](housekeeping-390.jpg), [All 25 rooms](housekeeping-all-390.jpg) |
| Staff accounts | [Team](team-390.jpg), [Add staff](add-staff-390.jpg) |
| Invoice and settings | [Invoice](invoice-390.jpg), [Settings](settings-390.jpg) |

Additional 360px captures with 125% root text: [Home](home-360-large-text.jpg), [Rooms](rooms-360-large-text.jpg), [Check-in](check-in-360-large-text.jpg), [Stay](stay-360-large-text.jpg), [Housekeeping](housekeeping-360-large-text.jpg), [Team](team-360-large-text.jpg), [Invoice](invoice-360-large-text.jpg).

Browser measurements are saved in [viewport-checks.json](viewport-checks.json). All twelve review screens fit 390px; key screens also fit 360px, including 20px body text at 125%. Staff controls measure at least 48px. Spot checks at 430px, 768px tablet and 1280px desktop show no horizontal overflow. A scrollbar consumes 15px, so the document client width is narrower than the viewport. The housekeeping All filter contained 25 room cards and no guest names.

Run `pnpm dev` and open `/staff/review` for the local visual harness. It exists only in development, uses no live data, and returns 404 from a production build. Real operations remain protected at `/staff` and `/admin`.

## Verification through the stack

| Boundary | Evidence |
| --- | --- |
| Browser → component | Native screenshots; wizard navigation; 25-room housekeeping filters; 360–430px and large-text checks. Review mutations are explicitly disabled. |
| Next.js → gateway | Unit/API checks for active role routing, origin checks, SSR session cookies, anonymous/guest denial, housekeeping write denial, manager-only accounts/settings, and strict mutation payloads. |
| Gateway → Auth/provider/SQL | 104 Edge handler/helper tests exercise role reads, Auth admin boundaries, scoped private ID uploads, signatures, provider ownership, currency/amount, capture replay/races and invoice sharing. Provider/Auth writes are mocked. |
| SQL → inventory/folio/audit | `category_core_regression.sql` plus `mobile_staff_regression.sql`, with the new migration, passed in one rollback-only hosted transaction. Checks cover clean-room check-in, server times, role/storage isolation, housekeeper audit, conflicts, tax/paise maths, FY numbering, balances, invoice immutability and late captures. Walk-in changed-payload retries return 409 while identical retries remain idempotent after guest edits. |
| Response → UI | Saves refresh server-owned snapshots; housekeeping gets a safe projected room response at both gateway and Next.js. Errors and payment-review/credit state remain visible. |

Full ESLint, TypeScript (`tsc --noEmit`), unit/API tests and Next.js production build pass. The installed Node entrypoints were used as equivalents of the npm scripts because npm is unavailable in this Windows shell. **219 tests across 20 files pass**, including the 104 Edge tests. The final SQL rollback audit retained **25 rooms and 3 existing reservations**, with no synthetic users, new operational tables or new storage bucket left behind.

The built production server was checked on a temporary local port: `/staff/review` returned 404; anonymous `/staff` and `/admin` redirected to `/staff/login`; `/api/staff/operations` returned 401; cross-origin staff account writes returned 403; an invalid public invoice token returned 404 with private/no-store and no-index headers. The temporary server was stopped after these checks.

## Remaining release checks

No permanent migration, Edge deployment, main push, staff account creation, ID upload, payment or email was performed for this PR. Existing production remains on the previous admin release. The next release requires the reviewed migration plus complete Edge directory and Next.js build together. A Vercel preview against the earlier live gateway is not evidence that these new backend features are activated.

Before operational use, verify in a preview project with real Supabase sessions: account creation/reset/deactivation; a real camera upload and authorised download; check-in → payment → invoice → checkout → dirty → attributed clean; provider test captures/replays; invoice email and link revocation. Owner-approved legal/tax/policy and ID retention settings are still required. Test-mode Razorpay links and QR must not collect real money. Android/iOS UPI app switching needs real-device testing after provider setup.

OTA sync, POS, night audit, housekeeping task scheduling, automatic FRRO submission and live staff Razorpay payments are outside this release.
