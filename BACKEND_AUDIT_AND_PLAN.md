# Hotel Teesta backend audit and implementation plan

Audited: 3 October 2026, Asia/Kolkata. Scope: current working tree, refreshed GitHub `main`, hosted Supabase metadata and permissions, Vercel configuration metadata, public API responses, and local validation. This is an implementation plan; the audit did not change application code, deploy, push Git, send OTP/email, make payments, or modify hosted data.

**The public preview works. Private checkout-draft storage exists in Supabase. The reservation, reception-assignment, and payment systems still need implementation and hosted verification. Passing a build does not prove those systems work.**

Read this alongside [the customization map](BACKEND_CUSTOMIZATION_GUIDE.md). Start with increments 1 and 2 below; the rest is the roadmap, not one large change request.

## 1. Verified configuration

| Layer | Current evidence | What it means |
| --- | --- | --- |
| Application | Next.js 16.3.6, React 19.3.0, TypeScript; Supabase JS/SSR, Zod and Razorpay SDK installed | Backend lives in Next.js route handlers/server actions and SQL functions. An installed payment SDK is not a payment integration. |
| Local Git | `main`, HEAD `32340a938a500c30df2150462f792fecc8d6375e` | Latest committed guest-contact/photo work is present. |
| GitHub | Fetch succeeded; `origin/main` equals HEAD; ahead/behind `0/0` | There are no unpushed commits. The unfinished work is uncommitted/untracked. |
| Unfinished work | Before this audit: 12 modified tracked files and 13 untracked files | These 25 files are not preserved in GitHub. Inventory, the applied draft migration and OTP helpers are among them. |
| Vercel | `mainli-group-of-hotels`, team `delta-team7`; Node 24.x, root `.`, Next.js preset | Existing project linkage was verified through the CLI. |
| Production | Deployment `dpl_3FEpG3gRNHJNPiUbh8gsgQndJbMj`, created 1 Oct 2026, 16:55 IST; status Ready | Live alias points to the 1 October release. |
| Live API | `/api/health`: 200, `BOOKING_MODE=preview`, release `32340a9` | Process availability is good; booking remains a preview. |
| Live readiness | `/api/readiness`: 503, missing server Supabase key, Razorpay credentials and cron secret | The full reservation-readiness gate is not met. This is an expected failure, not evidence that the public pages are down. |
| Live draft endpoint | `/api/booking-drafts`: 404 | New local draft-saving code has not reached this production release. |
| Supabase | `MainliGroupOfHotels`, project `yefndxkljepxhoeclknl`, healthy, Tokyo `ap-northeast-1`; PostgreSQL reports 17.6 | Correct hosted project was inspected directly. |
| Supabase plan | Organization reports Free | Recovery needs an explicit backup decision and restore evidence before live bookings. |
| Hosted app tables | Only `public.booking_drafts` and `checkout_private.draft_rate_limits` in the inspected application schemas | No hosted properties, categories, rooms, reservations, payments, refunds or audit-log tables yet. |
| Hosted migrations | Only `202610010001 checkout_drafts` recorded | The two older local foundation/security migrations are absent from hosted migration history. |
| Hosted drafts | Aggregate count 2, expired count 0 at audit time | Records exist; their contacts were not read. Counts do not establish that the current guest form was tested end to end. |
| Hosted Auth | Public settings: phone provider disabled, email provider enabled, email auto-confirm false | Phone OTP cannot work in the current hosted configuration. SMS/CAPTCHA/SMTP dashboard details remain unverified. |
| Jobs | No repository `vercel.json` cron configuration; hosted `pg_cron` not installed | No repository-defined or database cron job was established. An independently configured external scheduler was not inspected. |

Production URL: [Hotel Teesta preview](https://mainli-group-of-hotels.vercel.app).

### Environment inventory — values redacted

| Setting | Local `.env.local` | Vercel Production and Preview metadata |
| --- | --- | --- |
| Supabase public URL/key | Set, correct project URL | Both variable names present; encrypted values not inspected |
| `SUPABASE_SECRET_KEY` | Set; validity not established by a website write in this audit | Absent |
| `NEXT_PUBLIC_SITE_URL` | Production HTTPS origin | Variable present; value not inspected |
| `BOOKING_MODE` | `preview` | Present; live health confirms Production is `preview` |
| `APP_RELEASE` | `aadc073`, stale relative to local HEAD | Present; live health reports `32340a9` |
| `PHONE_OTP_ENABLED` | Absent, defaults off | Absent |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Absent | Absent |
| Razorpay key ID, key secret, webhook secret | Absent | Absent |
| `CRON_SECRET` | Absent | Absent |
| `PAYMENT_POLICY`, `DEPOSIT_PERCENT` | Absent | Absent |

`PAYMENT_POLICY` and `DEPOSIT_PERCENT` appear in `.env.example` but are not read by current application code. Older SQL uses `booking_settings` instead. Choose one authoritative policy source before implementing payment; adding these env values alone will do nothing.

## 2. What is already sound

- Draft writes use a privileged server-only Supabase client; the browser receives a small receipt, not guest records.
- An HttpOnly random cookie owns the draft. Only its hash is stored. Same-origin checks, JSON-only input, an 8 KB body limit, validation, timeouts and receipt matching are implemented locally.
- Hosted `anon` and `authenticated` have no draft SELECT/INSERT/UPDATE/DELETE permission and cannot execute `save_checkout_draft`. `service_role` can read and call the writer, but cannot directly insert/update/delete the table.
- Both hosted tables have RLS enabled; the writer has an empty search path and execution restricted to the server role.
- Draft retries retain one ID and require the same browser owner. Drafts cannot claim a reservation, payment or verified email.
- Mobile helpers inspect the canonical Supabase user and confirmed phone, rather than accepting contact metadata as verification. They are still provider-unverified.
- The new payment button is explicitly disabled. Missing providers cannot fabricate a successful charge.
- Local tests: **45 passed across 6 files**. `npm run lint` and `npm run build` passed on the audited working tree.

## 3. Findings and priorities

“Next release” means the next public draft-capture release. “Before live” means before taking real reservations or money.

| ID | Priority | Finding and impact | Evidence / implementation location |
| --- | --- | --- | --- |
| G1 | Next release | Applied hosted migration and its application code are untracked. Git cannot currently reproduce hosted draft storage. | Git inventory below; `supabase/migrations/202610010001_checkout_drafts.sql` |
| D1 | Before live | Local and hosted migration histories differ. Blindly pushing all older migrations would introduce an obsolete reservation model. Preserve the applied migration and rehearse the exact migration path first. | Hosted migration list; `SUPABASE_CHECKOUT_SETUP.md` |
| D2 | Before live | Old seed assigns all 25 rooms to Double. New inventory has 14 Double, 4 Triple, 6 Four-person and 1 Six-person, capacity 70. It is recorded locally but not imported. | `supabase/seed.sql`; `supabase/data/teesta-inventory.json` |
| D3 | Before live | Old hold RPC chooses one physical room and limits the party to that room's capacity. Current UI can split a party across several category rooms and expects later reception assignment. These contracts do not match. | `create_online_inventory_hold`; `lib/room-types.ts`; `BOOKING_FLOW_SETUP.md` |
| D4 | Next release | Seven-day expiry is logical only; no deletion/cleanup job exists in the inspected code. Rate-limit rows also need cleanup. Updating drafts extends expiry. | Draft SQL; no `pg_cron`; cookie lifetime |
| D5 | Before live | Authenticated phone ownership is not yet bound to a draft on the server. UI verification is insufficient authorization for future holds or payment. | `booking_drafts` has no authenticated guest ownership; `lib/mobile-checkout.ts` |
| D6 | Before live | Physical room assignment, reception bookings, operational blocks and online reservations must share capacity accounting. The old per-room exclusion constraint alone does not implement category promises. | Foundation allocations SQL and newer category workflow |
| O1 | Next release | No structured application logger, request correlation, error tracker or instrumentation found in app code. Draft errors become generic 503s with no diagnostic event. | `app/api/booking-drafts/route.ts`; application search |
| O2 | Next release | Readiness bundles database, payment and scheduler credentials, then checks only `properties`. Draft capture can work while this endpoint remains red; conversely a table query does not prove payments/OTP work. | `lib/server/env.ts`; `/api/readiness`; Supabase clients |
| O3 | Before live | Expiry route exports POST only. Vercel Cron sends GET, so scheduling that route unchanged would fail. Scheduler credentials are absent. | `/api/cron/expire-holds`; [Vercel Cron](https://vercel.com/docs/cron-jobs) |
| O4 | Before live | Backup/restore, alert delivery and historical log retention are unverified. Free Supabase requires an explicit export/recovery strategy. | Organization metadata; [Supabase backups](https://supabase.com/docs/guides/platform/backups) |
| P1 | Before live | Razorpay dependency, env placeholders and old SQL helpers exist; order, verification, webhook and refund application handlers do not. | `app/api` file inventory; disabled payment UI |
| P2 | Before live | Final rates/taxes/policies are unapproved. Starting Double rates are duplicated in TypeScript, draft SQL and seed; other types have no payable rate/category mapping. | `lib/rates.ts`; draft writer; seed; `lib/room-types.ts` |
| M1 | Next release | Documentation describes different generations of booking. README still mentions guest email sign-in/holds; newer code removed that guest hold action. Future customization needs one current contract. | README vs `BOOKING_FLOW_SETUP.md` and checkout component |
| M2 | Before live | pgTAP file has 12 schema/seed/default checks. It does not verify roles, concurrent last-room booking or payments. Route tests mock the database. | `supabase/tests/001_booking_foundation.test.sql`; route tests |

### Advisor interpretation

Security advisor returned two INFO notices for RLS enabled with no policy. This is consistent with the current server-only draft/counter design: permissions explicitly deny browser access. **Do not add public-read policies to silence these notices.** Recheck grants and API behavior after each migration. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance advisor returned one INFO unused-index notice for `booking_drafts_expires_at_idx`. With two drafts and no cleanup job, that is unsurprising. Keep it for planned expiry cleanup, then inspect real usage. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Supabase's recent PostgreSQL upgrade notice applies conditionally to particular indexes/operators/encryption. This project still reports 17.6. Check managed upgrade status before launch; the old allocation design uses UUID/date GiST, so the float/NaN notice alone does not establish a broken inventory index. [Upgrade notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

## 4. Database checklist

- [ ] **D-A — Migration baseline (developer).** Inventory applied versions and compare function definitions/grants. Preserve `202610010001` unchanged as history. Rehearse both a clean database install and an upgrade from the hosted draft-only state. Review any out-of-order migration operation; do not run a blanket remote reset or seed.
- [ ] **D-B — Approved category import (owner + developer).** Import the 25-room source into four real categories with staff-only physical room numbers. Confirm the Six-person/Family-with-sofa photo mapping, capacities, amenities, sellable units, rates, tax treatment and policy dates. Keep unknown values unknown; do not substitute Double inventory for an unmapped category.
- [ ] **D-C — Category reservations (developer).** Add booking items with category, units and occupancy split. Reserve units for every night in `[checkIn, checkOut)` using one transaction, deterministic lock order and capacity checks shared by online/reception/block operations. Locks must coordinate overlapping stays, not only identical start/end dates. Reject the whole request if any night cannot be sold.
- [ ] **D-D — Assignment and blocks (developer + reception).** Keep category reservation separate from physical assignment. Add staff-authorized assignment/reassignment and maintenance blocks, preserving per-room overlap constraints and an audit trail. Check that an eligible room plan exists across the whole stay when fixed assignments/blocks constrain it; nightly totals alone can hide room fragmentation.
- [ ] **D-E — Server identity binding (developer).** Add a server claim/finalization operation checking current Auth user, confirmed canonical phone and browser draft ownership. Draft cookie path is `/api/booking-drafts`; an unrelated `/api/payments/orders` route would not receive it. Claim under that path or deliberately revise cookie scope before payment integration.
- [ ] **D-F — Quote and policy snapshots (owner + developer).** Authoritative approved rates/settings live in the database. Store immutable night-by-night amounts, INR integer paise, tax, policy version, payment due, expiry and occupancy allocation when a hold is created. Public starting prices remain indicative. Validate full/deposit rules and future balance collection separately.
- [ ] **D-G — Roles and audit (owner + developer).** Name reception/manager/admin accounts, enforce property scope and guest ownership in RLS and RPCs, revoke unnecessary function grants, generate database TypeScript types and test denied access directly. Audit sensitive changes without copying full guest records into routine logs.
- [ ] **D-H — Retention and recovery (owner + developer).** Agree retention for abandoned contacts, rate counters and operational records. Add authorized scheduled cleanup with run counts and alerts. Choose backups/PITR or encrypted off-site exports, restoration owner and acceptable data-loss/recovery windows; complete an isolated restore drill. Storage objects require their own backup if introduced.
- [ ] **D-I — Real integration tests (developer).** Exercise insert/retry/foreign ownership/expired drafts/quota with PostgreSQL; guests A/B and staff across properties; last-unit races; overlapping date ranges; multi-room parties; checkout-day turnover; blocks; hold expiry versus payment; canceled holds and assignment conflicts.

Database acceptance: exactly the approved room/category counts, zero unauthorized guest-data reads, no overselling under concurrent online/reception requests, no physical overlap, safe expiry, and a demonstrated restore.

## 5. Observability checklist

- [ ] **O-A — Useful errors first.** Add `lib/server/logger.ts` with structured events: request ID, release, environment, route, operation, duration, safe error code and outcome. Cover draft writes, Auth failures, holds, orders, webhooks and jobs incrementally. Return a support/request reference for failures.
- [ ] **O-B — Privacy controls.** Redact name/email/phone, cookies, sessions, OTP/CAPTCHA, authorization, secrets and payment payloads. Log only an allowlisted set of fields. Use an opaque booking/draft reference when necessary; remove query strings from URLs and scrub event breadcrumbs.
- [ ] **O-C — Capability diagnostics.** Separate process health, draft storage, guest Auth, reservation database, payment configuration and job status. Public health returns minimal status; detailed diagnostics require staff/admin or a monitoring secret. Do not declare a provider operational because its variable is nonempty. Avoid synthetic writes on every health poll.
- [ ] **O-D — Release identity.** Derive release from the deployed commit where available; handle CLI deployments explicitly. Correct stale local `APP_RELEASE` and attach the release to every server event. Keep schema version and deployment version identifiable together.
- [ ] **O-E — Error capture.** Add one error-tracking integration using the installed Next.js instrumentation conventions, with server and client capture, source maps, release tagging and PII scrubbing. Simulate one failure and verify it is searchable by request reference.
- [ ] **O-F — Monitors and alerts.** Add uptime plus capability checks, job heartbeat, repeated draft-save failure, webhook processing delay, any payment-review booking, failed refunds and inventory-integrity alerts. Route them to a named operator and verify delivery; add deduplication and a short incident runbook.
- [ ] **O-G — Scheduler.** Choose one scheduler and verify its frequency/plan. If using Vercel Cron, provide an authenticated GET entry point; if using an external POST scheduler, keep the documented POST contract. Jobs must be idempotent and safe when overlapping. Record started/finished/last-success timestamps and release counts.
- [ ] **O-H — Retention and performance.** Verify actual Vercel/Supabase log retention and costs; retain enough scrubbed events to investigate incidents. Measure Supabase RPC latency, checkout failures and server region before changing regions or buying tools. Current inspected Vercel functions are `iad1`, while Supabase is Tokyo; latency impact has not been measured.
- [ ] **O-I — Funnel visibility after correctness.** Track search → draft saved → mobile verified → hold created → order created → captured → confirmed using anonymous/opaque references. Never count UI clicks as paid bookings or send contacts to analytics. Add Web Analytics/Speed Insights only if they answer an operating question.

Suggested initial alert rules, to tune with real traffic: three consecutive capability failures; five server write failures in ten minutes; any payment requiring review; job silence beyond twice its expected interval. These are proposed thresholds, not existing monitors or measured targets.

Vercel's retained runtime-log window depends on the account plan; dashboard verification is required before treating it as incident history. [Runtime log limits](https://vercel.com/docs/logs/runtime).

## 6. Payment checklist — Razorpay test mode first

- [ ] **P-A — Commercial setup (owner).** Verify merchant account, settlement bank and test access. Confirm final category rates, taxes, cancellation/refund terms, live full/deposit policy and who approves refunds. Existing setup notes request full payment for the first test; that is not live approval.
- [ ] **P-B — Server order service (developer).** Authenticate guest and owned draft, recheck verified phone, create a real category hold and server quote, then create/persist a Razorpay test order. Bind order to payment attempt, booking, amount and currency. Never accept browser amount, guest ID or a success flag as authority.
- [ ] **P-C — Retry behavior (developer).** Persist an application idempotency key and serialize order creation. Reuse one attempt/order for repeated clicks. Handle provider timeouts and successful provider calls followed by failed database persistence; uncertain results need reconciliation before creating another chargeable order. Do not assume the Orders API provides an idempotency guarantee without verifying it.
- [ ] **P-D — Checkout and callback (developer).** Load Standard Checkout only after a valid server order exists. Expose only the provider's public key ID/order fields. Verify callback signature with the server-held order ID, then verify the provider payment's order, amount, INR currency and captured status. Authorization alone cannot confirm a paid booking. [Server integration](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/).
- [ ] **P-E — Webhook inbox (developer).** Validate HMAC over raw request bytes using the separate webhook secret. Deduplicate provider event IDs; store durable processing status, bounded retries and safe error details. Accept events in any order; avoid regressing captured/refunded states. Return success only after durable acceptance/processing; transient failure must remain retryable. [Webhook validation and idempotency](https://razorpay.com/docs/webhooks/validate-test/).
- [ ] **P-F — Atomic confirmation (developer).** Coordinate payment, booking and capacity locks in a consistent order. Confirm once only when capture is verified and inventory remains retained. Payment after hold expiry/cancellation goes to a visible review/refund workflow; never silently recover capacity already sold. Repeat callbacks/webhooks must produce the same outcome.
- [ ] **P-G — Recovery and reconciliation (developer + operator).** Check unresolved orders/payments against Razorpay, recover lost callbacks and failed webhooks, flag mismatches and expose an operator queue. Provider webhook retries are finite, so webhooks alone are insufficient recovery. [Webhook delivery behavior](https://razorpay.com/docs/webhooks/best-practices/).
- [ ] **P-H — Refunds and balances (owner + developer).** Separate cancellation, refund request, provider refund and settlement status. Add permission checks, idempotency, amount limits, partial/full refund handling and refund failure review. Calculate balances from captured payments/refunds; implement later balance collection explicitly if deposits are selected.
- [ ] **P-I — Genuine guest result (developer).** Show a real booking reference and current database status. Wire `/my-bookings` with guest-scoped reads. Confirmation messages use a durable outbox so notification failure does not duplicate a booking. Payment-pending/review states remain truthful and recoverable after refresh.
- [ ] **P-J — Test evidence (developer + owner).** Successful capture, failed/abandoned payment, repeat clicks, invalid signature, wrong amount/order/currency, duplicate/out-of-order webhook, provider timeout, lost callback, webhook retry, capture-versus-expiry race and successful/failed refund. Verify the real test provider and database records together.

Payment acceptance: one payable attempt per retry sequence, exactly one valid confirmation, no paid-without-capacity guest result, verified refund/recovery behavior and observable failures. Keep production charging disabled until these checks and owner approvals are evidenced.

## 7. Implement in small increments

Each row is a separate session/release with at most two related changes. Acceptance is the stop condition. Environment/provider setup is separate from code deployment; test against an isolated development/preview database before production use.

| Order | Scope for this increment | Dependency | Acceptance / rollback |
| --- | --- | --- | --- |
| 1 | Preserve/review the unfinished source and reconcile current setup documents | This audit | Applied migration and all required helpers/tests are versioned together; secrets excluded. Local commit/checkpoint first; main push waits for the public-release check in step 3 if it triggers production. |
| 2 | Add privacy-safe draft logging and capability-based diagnostics | 1 | A forced save failure produces a safe request reference and searchable reason; draft capability is independent of missing payment keys. Revert this commit if diagnostics regress. |
| 3 | Verify draft capture and configure its production server key | 1–2; approved draft-retention/public-capture terms | Explicit test form creates/updates one private row; failed writes retain inputs; foreign access is denied. Then push/release this preview-only increment and repeat the check on the deployed endpoint. Roll back code/disable capture without deleting records. |
| 4 | Reconcile schema history and import approved inactive categories/rooms | 3; owner's category/photo mapping | Fresh install and draft-only upgrade both succeed; counts 14/4/6/1, total 25/70; privileges remain correct. Backup before additive migration; restore/revert via reviewed forward fix. |
| 5 | Implement category holds and operational blocks/assignment core | 4; approved prices/settings for isolated tests | Concurrent last-unit/multi-room/overlap tests pass; room numbers remain staff-only. Booking feature remains disabled in production. |
| 6 | Configure real SMS/CAPTCHA and bind verified guest to draft server-side | 3–4; SMS provider/domain configuration | Real approved test number verifies; wrong/expired code, resend, CAPTCHA and quota failures are safe. Switch OTP flag off if delivery breaks. |
| 7 | Add Razorpay test order service and Standard Checkout | 5–6 | One real test order uses the immutable server amount and retained category hold; repeats reuse it. Production payment feature stays closed. |
| 8 | Add signed callback/webhook processing and atomic confirmation | 7 | Duplicate/out-of-order/expiry-race tests produce one safe result; genuine reference appears. Disable order creation on incident, retain incoming verified event processing for outstanding orders. |
| 9 | Add refund/reconciliation queue and guest booking access | 8 | Operator resolves late payment/refund failures; guest sees only own records after refresh. |
| 10 | Add job scheduling/alerts and complete restore/operator drill | Earlier instrumentation; real inventory/payment test flow | Job heartbeat, alert delivery and isolated restoration are evidenced. Operational runbook names a responsible person. |
| 11 | Owner acceptance and controlled live activation | All booking/payment/recovery gates | Approved inventory/rates/policies and staff training; one supervised legitimate end-to-end reservation and payment. No live activation was authorized or performed by this audit. |

Logging expands alongside each new service; do not wait until step 10 to record hold/payment failures. Reception manual booking and assignment must be validated against the same capacity model before either sales channel becomes live. OTA synchronization, AI concierge and revenue dashboards follow this core.

## 8. Git preservation and release checklist

Audit-time modified tracked files:

```text
.env.example
CAPTAINS_LOG.md
TASKS.md
VERIFICATION.md
app/book/page.tsx
app/globals.css
app/policies/[slug]/page.tsx
components/guest-booking-flow.tsx
hotel_fact_sheet.md
lib/server/env.ts
lib/server/supabase.ts
next.config.ts
```

Audit-time untracked files:

```text
BOOKING_FLOW_SETUP.md
SUPABASE_CHECKOUT_SETUP.md
app/api/booking-drafts/route.ts
app/api/booking-drafts/route.test.ts
components/checkout-captcha.tsx
lib/checkout-draft.ts
lib/checkout-draft.test.ts
lib/mobile-checkout.ts
lib/mobile-checkout.test.ts
lib/save-checkout-draft.ts
supabase/data/teesta-inventory.json
supabase/migrations/202610010001_checkout_drafts.sql
vitest.config.mts
```

This audit adds two documents and appends `CAPTAINS_LOG.md`; the list above is the original unfinished application increment.

- [x] Fetch and verify remote branch: local HEAD equals `origin/main`.
- [x] Review local tests/lint/build: all pass.
- [ ] Review/stage explicit source paths, including untracked dependencies, the applied migration and test configuration. Do not stage `.env.local`, `.vercel`, guest exports or photo originals.
- [ ] Inspect the staged diff and run a secret check before committing. `.env*` is ignored except the example; verify no secret was copied into other files.
- [ ] Preserve one coherent, disabled-by-default local checkpoint on `main`. No branch or PR is needed for this workflow.
- [ ] Complete the real draft form/provider configuration checks before a main push that deploys the public capture increment. Verify Vercel's Git trigger settings; this audit did not establish automatic Git deployment behavior.
- [ ] After pushing, compare local/remote SHA. Then separately verify Vercel deployment SHA, public health, the new draft endpoint, capability diagnostics and the guest flow.
- [ ] Record deployment ID, migration version, checks and rollback route in the Captain's Log. A GitHub push alone does not prove a Vercel release.

Do not run `supabase db reset` against hosted guest data. Do not blindly `db push` the old physical-room seed/model into the draft-only hosted project.

## 9. Limits of this audit

Docker's Linux engine was unavailable, so the local PostgreSQL migration/pgTAP suite could not run. Hosted schema/function/role checks were read-only; no new draft was submitted and no concurrency or payment test was claimed. Historical Vercel error clusters were not retrieved: the connector lacked this team's access, although the CLI successfully verified project/deployment/env metadata. Existing external alert destinations, backup/export evidence, Auth redirect allowlists, SMTP/SMS/CAPTCHA settings and Razorpay merchant settings need dashboard/operator verification.

Existing `README.md`, `DEPLOYMENT.md`, `TASKS.md` and `VERIFICATION.md` include older or preparation-only claims. Keep historical evidence, but update current instructions during increment 1. This dated audit records what was independently verified on 3 October 2026.
