# Mobile staff review

Review date: 13 October 2026. Follow-up branch: `codex/room-guest-checkin`.

## Current room workflow

The manager/front desk taps a room to open its dashboard. A clean vacant room collects a guest profile and typed ID information, then saves reservation, room assignment, optional received advance, profile and server check-in time together. An occupied room shows guest details, source, arrival and expected checkout, with an Add food bill action. Checkout creates the numbered Mainali invoice and marks the room dirty atomically. New ID photo uploads are retired.

Admin and staff sign in with individual names/passwords. The gateway verifies a signed password authentication claim plus the current active role. Google remains available for guest bookings. Managers add, reset and deactivate staff from Staff; no real passwords or new accounts were created during review.

## Fresh phone evidence

Native browser captures use the actual components and synthetic data. Sample tax/legal values are not approved hotel settings. Review saves, payments and messages are disabled.

| Screen | Capture |
| --- | --- |
| Password-only sign-in | [Login](login-390.jpg) |
| Room registration | [Room 305](room-register-390.jpg), [Typed ID fields](typed-id-390.jpg) |
| Occupied room | [Room 302](room-occupied-390.jpg) |
| Add food bill | [Food bill](food-bill-390.jpg) |
| Staff name and chosen password | [Add staff](staff-names-390.jpg) |
| Branded invoice | [Invoice](invoice-food-390.jpg) |
| 360px with 125% text | [Registration](room-register-360-large.jpg) |

[Current measurements](typed-room-viewport-checks.json) confirm no horizontal overflow in registration, occupied-room and food forms at 390px and 360px with 125% root text. Invoice and staff-account screens also fit 390px. Production controls are at least 48px with at least 16px text; the compact development-only review selector is excluded. Registration contains zero file inputs. Rooms -> room 305 -> registration and occupied room -> Add food bill were exercised through the UI. Mutations are covered at API/SQL boundaries, not claimed as live browser writes.

Other images and `viewport-checks.json` in this folder are historical captures from the 12 October PR #3 review. They do not describe the updated typed-ID or password-only screens. Run `pnpm dev` and open `/staff/review` for the current local harness.

## Validation

- ESLint, TypeScript, **249 unit/API/Edge tests across 21 files**, and the Next.js production build passed.
- Both staff migrations plus `category_core_regression.sql`, `mobile_staff_regression.sql` and `typed_guest_room_regression.sql` passed in a single hosted BEGIN/ROLLBACK transaction with per-suite savepoints.
- SQL checks cover typed registration, role/RLS privacy, room capacity, matching/mismatched retries, one profile/request/audit, food charges on invoices, checkout rollback on missing legal/tax settings or unpaid balance, invoice retry/numbering and room cleaning. Failed checkout consumes no invoice sequence/audit. Registration IDs do not enter invoice snapshots.
- After rollback: **25 rooms and 3 existing reservations** remained; no synthetic users, new tables or storage buckets remained.
- Built production server: `/staff/review` returned 404; anonymous `/staff/rooms/305` redirected to `/staff/login`; staff operations API returned 401; retired staff OAuth callback redirected to password login; staff login rendered no Google button. Temporary production server stopped afterward.

## Release status

PR #3 is merged. This follow-up is prepared for a separate PR. No permanent migration, Edge deployment, main push, real staff-account creation, payment or email was performed by this follow-up. Apply the two staff migrations in order, deploy the complete Edge directory and release the matching frontend together; see [operating/release instructions](../../LIVE_BOOKING_SETUP.md).

Before hotel use, complete real password-session creation/reset/deactivation and room check-in -> food -> payment -> invoice/checkout -> dirty -> attributed clean in a preview project. Owner legal/tax/policy and guest-profile retention settings, Razorpay test capture/replay and configured Resend delivery remain release dependencies. Android/iOS UPI switching needs real-device testing after provider setup. OTA sync, POS, night audit, housekeeping task scheduling, automated FRRO submission and live staff Razorpay payments remain outside this release.
