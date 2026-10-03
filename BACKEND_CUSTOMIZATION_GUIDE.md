# Backend customization map

Current map: 3 October 2026. Proposed files below are explicitly marked; they are not implemented by this audit. The aim is to make the next change easy to locate and verify without rewriting the whole project.

**Think of the UI as the bridge, server handlers as the engine controls, and database rules as the safety interlocks. A button looking ready does not establish that the engine is running.**

## Current guest flow

```text
Search dates / guests
  → app/rooms/page.tsx and app/book/page.tsx
  → display choice / indicative price from lib/room-types.ts + lib/rates.ts
  → components/guest-booking-flow.tsx collects contacts
  → lib/save-checkout-draft.ts establishes a private cookie, then submits details
  → app/api/booking-drafts/route.ts validates and calls Supabase on the server
  → public.save_checkout_draft validates ownership/quota and persists a draft
  → mobile OTP helpers, only when provider + CAPTCHA configuration are enabled
  → disabled payment section
```

The hosted draft SQL exists. The production website still lacks the new draft route. Phone Auth is disabled, and no payment route is implemented. Drafts, verified identity, inventory holds, payment attempts and confirmed bookings are separate things.

## Where to customize today

| Desired change | Start here | Other authority / verification |
| --- | --- | --- |
| Room names/photos/descriptions | `lib/room-types.ts`, `lib/property.ts` | Display choices do not create database stock. Confirm category/photo mapping. |
| Public indicative Double price | `lib/rates.ts` | Current SQL draft formula and inactive seed also contain rate constants. Reconcile all affected displays, but implement final payable prices in approved DB rates. |
| Guest contact requirements | `lib/guest-details.ts`, `lib/checkout-draft.ts` | Draft SQL has independent validation/checks. Changing UI alone cannot change database acceptance. |
| Date/guest limits | `lib/stay.ts`, `lib/checkout-draft.ts` | Availability API, category capacities and SQL/settings must agree. Hotel date is Asia/Kolkata; checkout is excluded. |
| Checkout labels/layout | `components/guest-booking-flow.tsx`, `app/book/page.tsx`, relevant CSS | Keep saved/verified/held/paid messages tied to actual server evidence. |
| How details are saved | `lib/save-checkout-draft.ts`, `/api/booking-drafts` | Preserve receipt checking, retries, cookie ownership, body bound and generic public errors. |
| Draft lifetime/quota | Applied draft SQL via a **new migration**, plus cookie settings in the route | Current values: seven-day expiry/cookie, twenty successful writes per ten-minute IP-hash bucket. No cleanup job yet; updates extend record expiry, existing cookie is not renewed. Choose a consistent expiry/retention contract. |
| Phone OTP behavior | `lib/mobile-checkout.ts`, `components/checkout-captcha.tsx` | SMS provider, CAPTCHA secret/enforcement, quotas, templates and redirect settings belong in Supabase secure settings. |
| Enable phone UI | `PHONE_OTP_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | These only expose the prepared flow. They do not configure the provider or authorize payments. |
| Server credentials | `.env.local` locally; Vercel environment settings when hosted | `.env.example` describes required names. Never put secrets in `NEXT_PUBLIC_*` or commit them. |
| Feature configuration checks | `lib/server/env.ts`, `lib/server/supabase.ts` | Draft client already has a smaller requirement set. Other clients/readiness currently require unrelated payment/job credentials. |
| Physical inventory source | `supabase/data/teesta-inventory.json` | Local import source: 14/4/6/1 categories. Writing this file does not import or activate rooms. |
| Inventory holds/payments | Foundation SQL as reference, plus **new category reservation services** | Older RPC holds one physical room. Do not turn it on unchanged for the new multi-room category workflow. |
| Staff housekeeping | `app/staff/actions.ts`, `app/staff/page.tsx` | Requires hosted tables, staff memberships and `set_room_housekeeping_status`; those are not hosted yet. |
| Guest reservation list | `app/my-bookings/page.tsx` | Currently a shell. It needs authenticated, guest-scoped database reads and real reservation statuses. |
| Error/health behavior | `app/global-error.tsx`, `/api/health`, `/api/readiness` | Add safe diagnostics and request IDs; do not log contact forms or provider payloads. |
| Hold expiry | `/api/cron/expire-holds`, older expiry SQL | Current route is POST; schedule and hosted booking functions are absent. Match scheduler method and keep auth. |
| Provider browser permissions | `next.config.ts` | CSP already allows Razorpay/Turnstile origins. Test real provider behavior before broadening permissions. |

Changing a hosted SQL function requires a new migration and deployment verification. Editing an already-applied SQL file changes the repository but does not change the hosted database.

## Make customization easier as features are built

Keep the existing Next.js + Supabase architecture. Add a small module only when its behavior is implemented; no large framework or rewrite is needed.

| Responsibility | Proposed home | Rule |
| --- | --- | --- |
| Shared booking statuses and permitted transitions | `lib/booking-state.ts` | UI renders server status; it cannot declare payment/booking success. |
| Draft ownership + canonical guest verification | `lib/server/checkout.ts` | Claim under `/api/booking-drafts/claim` or consciously revise cookie path; authenticate on the server. |
| Approved quote, category hold, release and assignment | `lib/server/booking.ts` and transactional SQL RPCs | All sales channels use the same inventory rules; DB transactions enforce capacity. |
| Razorpay order creation/fetch/signature verification | `lib/server/payments/razorpay.ts` | Provider mechanics stay behind one server-only adapter. Never accept browser amount. |
| Confirmation, webhook deduplication, refund/review rules | `lib/server/payments/service.ts` plus SQL | Separate business decisions from provider API calls; persist outcomes/idempotency. |
| Redacted diagnostics | `lib/server/logger.ts` | One event format, safe field allowlist, request/release correlation. |
| Database contracts | `lib/database.types.ts` generated from the intended DB | Regenerate after schema changes; avoid copied strings and unchecked response shapes. |

Keep operational settings in a protected database settings/rates table with validation, approval/version fields and audit records. Keep public branding/photo content in the content modules. Keep secrets/provider keys in secure environment or provider settings. This gives you an explicit place to change rates, room stock, policy, appearance and credentials.

Choose database settings as the authoritative full/deposit policy source; remove or deliberately wire the currently unused env policy examples during payment work. Reserve a server payment feature gate for implemented/tested capability; changing `BOOKING_MODE` or adding keys must not independently make charging possible.

Split `GuestBookingFlow` into smaller display steps only when it needs a new feature. Move inventory/payment decisions into services first. A visual refactor alone will not make booking rules easier to change.

## Definition of a finished feature

Every meaningful backend change should leave six small pieces of evidence:

1. **Behavior:** one sentence describing the guest/operator result.
2. **Owner:** exact file/module/settings source controlling that behavior.
3. **Contract:** input, output, authentication, permitted state change and failure path.
4. **Proof:** real server/database/provider check appropriate to the feature; mocks alone cannot prove an external integration.
5. **Release:** local commit, GitHub SHA, deployed SHA and migration version distinguished.
6. **Recovery:** the flag or reviewed rollback procedure, plus a Captain's Log entry.

For UI-only labels, normal browser inspection is enough. For inventory, identity or money, prove the relevant server/database boundaries and race/failure behavior.

## Two good next-session prompts

> Add privacy-safe request IDs and structured logging only to checkout-draft saves, then separate draft capability from full booking readiness. Keep preview booking and payments disabled. Show a forced failure with its safe support reference.

> Review and preserve the existing uncommitted draft/OTP increment as one coherent main checkpoint. Verify one explicitly labeled guest draft from the form with retry and denial checks before any public capture release. Keep application secrets out of Git and report GitHub and Vercel status separately.

Use [the ordered implementation plan](BACKEND_AUDIT_AND_PLAN.md) when moving beyond these steps. The next live-site change should solve one observable problem and leave its control point documented.
