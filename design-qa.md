# Mainali design integration — 3 October 2026

## Design contract

Visual thesis: carry the supplied design's warm ivory, restrained gold, dark navigation strip, editorial serif headings and generous photography into the existing hotel application. Use the hotel's real rooms and spaces rather than a fictional resort portfolio. This is an adaptation of the supplied design, not a claim that the sample resort is Hotel Teesta.

Content thesis: help a guest understand the actual hotel, choose dates and a photographed room layout, and review contact details. Show one starting Double Room price, keep other rates on request, and do not invent OTA discounts, availability, guest reviews, hotel history or member benefits.

Interaction thesis: preserve the existing guarded booking flow and private draft capture. Whole-field date buttons open an anchored desktop calendar or a phone sheet. Navigation, manual hero-photo controls and photo filters are real interactions. Missing phone, inventory and payment providers stay closed rather than displaying simulated success.

## Source and implementation

- User reference: the supplied design artifact, inspected in the in-app browser.
- Authoritative supplied files: the owner-provided design ZIP (kept locally, not committed), safely extracted to a temporary reference directory and inspected without running its scripts as application code.
- Static reference served locally at http://127.0.0.1:4174/index.html during comparison only.
- Implementation: http://127.0.0.1:3000/ and http://127.0.0.1:3000/stays/teesta.
- Channel setup: http://127.0.0.1:3000/staff/channels?preview=1 — development-only, read-only source aggregates.
- Existing Next.js application reused; no duplicate application, new backend stack or imported demo authentication.

## Screenshot evidence

Artifacts are local verification files under `output/playwright/mainali-design/` (Git-ignored).

| Source | Implementation | Matched state |
| --- | --- | --- |
| source-desktop.jpg | implementation-desktop.jpg | 1440 × 1000 viewport, density 1, homepage at scroll 0, menu closed, first hero photo |
| source-mobile.jpg | implementation-mobile.jpg | 390 × 844 viewport, density 1, homepage at scroll 0, menu closed |
| source-header.jpg | implementation-header.jpg | 1440 × 130 top-of-page detail crop, normal navigation state |

Source and implementation images were presented together for both full-viewport and focused-header comparisons. Source imagery and demo copy are deliberately different. Header and hero geometry, five-column desktop search, below-hero mobile search, serif hierarchy, palette and editorial spacing were compared. The target uses four real hero photographs rather than the source's three stock slides.

Additional inspected screenshots: `calendar-desktop.jpg`, `calendar-mobile.jpg`, `booking-mobile.jpg`, `members-mobile.jpg`, `implementation-mobile-menu.jpg`, `channel-overview-desktop.jpg`, `channel-mapping-desktop.jpg`, and `channel-mobile.jpg`. `implementation-full-desktop.jpg` records the editorial page after normal reading scroll revealed the animated feature.

## Findings and fixes

1. Corrected the desktop content width, vertical hero position and booking-strip overlap against the reference.
2. Added all six requested navigation destinations and a proper keyboard-closeable mobile menu; member login sits beside My bookings.
3. Replaced stock/demo property imagery with verified existing Teesta WebP exports. A fresh SHA-256 check matched all twelve public assets to the cleaned source photographs. Room, lobby and restaurant hero selections load the corresponding photograph. Kept bathroom photos in the property gallery, not falsely attached to a room category.
4. Self-hosted licensed Cormorant Garamond and Jost variable WOFF2 fonts. Removed only the temporary TTF copies created during this implementation, reducing the font payload to about 64 KB plus licenses. Original photographs and the supplied ZIP remain untouched.
5. Improved white-text contrast over bright room photography and used dark lettering on gold actions. Reduced-motion styles remove hero transforms and menu entry animation.
6. Fixed the mobile headline's word spacing, narrow-phone account-link wrapping, and singular guest wording in results. At 320 px the top account row fits within its 36 px height; the calendar fits inside the viewport.
7. Removed 101 obsolete CSS rule groups from the old home/property skin while retaining shared booking, calendar, gallery and operations rules. No active TSX usage of those exact old classes remained.
8. Corrected solo and odd-party Double Room prices locally and in the hosted private draft writer. No separate Single Room is sold or advertised.
9. Scoped the new production channel page to active Teesta reception/property-manager roles or a group administrator. Its local preview flag does not bypass production authentication.
10. Replaced developer-facing member/offers copy with guest-facing language. No fabricated stay count or struck-through OTA price is shown.

## Interaction and safety verification

- Mobile: full date-field click opens the calendar; selecting 10 October advances to checkout; choosing 12 October and one guest reaches `/rooms` with matching parameters. Double Room shows ₹5,000+ for two nights and links to `/book` with the same room, dates and guest count.
- Checkout: real phone, email and name fields are present. No new guest details, OTP request or payment were submitted in this visual regression pass. The earlier real local guest-form save in this turn was separately verified against hosted Supabase and remains a labelled test draft, not a booking.
- Calendar: today defaults are 3–4 October in the hotel timezone; past days disabled. Desktop picker aligns horizontally with the active field and chooses an above-field position when below-field space is insufficient. Escape closes it and returns focus. Phone sheet was checked at 390 px and 320 px.
- Navigation: all public destination routes returned HTTP 200 in the production build. The mobile menu contains the six destinations plus My bookings and Members login; Escape closes it and restores trigger focus.
- Gallery: Lobby, Restaurant, Front desk and Bathroom filters show matching assets. The full-photo dialog opens and Escape closes it with focus restored.
- Members: provider-disabled phone entry and submission stay disabled with a clear setup state. Stay-count logic uses only the current guest's `checked_out` reservations, not drafts. Live OTP and signed-in counts cannot be verified before provider/schema activation.
- Channel workspace: Overview, Room mapping and Launch checklist all switch correctly. Counts match 14/4/6/1 rooms and 70-person capacity. The six-person source category remains unmapped to the sofa photograph pending owner confirmation. No room numbers or guest data are sent to its client component.
- Production probe: `/staff/channels?preview=1` returns HTTP 307 to `/staff/login` without an authenticated staff session; public pages and health return 200.
- Fresh browser verification tab: zero captured console errors or warnings during the checked home/property interactions. Earlier failed Google-font development attempts are historical, not part of this fresh pass.
- Checked phone pages have no horizontal document overflow; the mapping table intentionally uses its own horizontal scrolling container.
- React review: server-rendered editorial pages; interactive clients limited to controls, menus, OTP and dashboard tabs; effect cleanup restores scrolling; no hero interval, global store or unnecessary new dependency. Concurrent independent server authorization reads use `Promise.all`.

## Backend regression boundary

Of 26 backend/booking baseline files, only `lib/rates.ts` and the inactive development `supabase/seed.sql` changed during this design increment. A new narrow migration, `20261003134414_unified_double_room_price.sql`, was applied independently; historical migrations were not rewritten or bulk-pushed. The private draft writer retains its permissions and validation.

Hosted transactional regression assertions passed for 1, 2, 3 and 5 guests over two nights. Synthetic writes were rolled back. The writer is executable by the service role only, not anonymous/authenticated browser roles. Informational Supabase RLS-without-policy notices for private draft/quota tables are intentional deny-by-default, not reasons to expose their data.

## Result

Design and local interaction verification: **passed** for this guarded preview scope. Automated tests: **48/48 passed** across seven files; lint and production compilation passed. Live launch is **not ready**: approved nightly rates/taxes/policies, category-level reservations and concurrency checks, phone OTP, Razorpay test checkout, guest/staff live sessions and production environment verification remain separate gates. No Git push or Vercel deployment was performed for this increment.
