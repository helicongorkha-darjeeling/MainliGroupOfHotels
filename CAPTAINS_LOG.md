# Captain's Log

## Stardate 2026-09-28
- Changed: Created the Next.js foundation and first mobile-first Mainali/Hotel Teesta public experience using the completed WebP photo set.
- Why it matters: Guests can now explore the real property and carry dates and guest count into a truthful room-search preview without fake rates, inventory, OTP or payment claims.
- Felt: The first light is on—small, real, and ready for the next system.

## Stardate 2026-09-28
- Changed: Passed lint, date-rule tests, production build, health check, and visual QA at phone and desktop sizes.
- Why it matters: The first review build is stable, responsive, accessible by label, and honest about everything that still needs owner approval.
- Felt: A calm first launch pad—Pike would call the ship ready for inspection.

## Stardate 2026-09-29
- Changed: Added the Supabase booking foundation, draft 25-room Teesta inventory, role-scoped access policies, database-enforced collision protection, production readiness endpoints, and security headers.
- Why it matters: Online and reception bookings now have one safe database design to build on, while the public site still refuses to invent availability or take unapproved payments.
- Felt: The ship has a real engine room now—even while Docker takes shore leave.

## Stardate 2026-09-29
- Changed: Recovered after the forced restart and passed lint, 3/3 application tests, the 14-route production build, health checks, and header checks.
- Why it matters: The source survived cleanly and can be handed off without confusing a local Docker problem with a website failure.
- Felt: A small but important recovery win—steady at the helm.

## Stardate 2026-09-29
- Changed: Packaged the verified milestone in a local `main` commit and attempted the approved GitHub handoff; the remote currently grants the signed-in account read-only access.
- Why it matters: The work is safely versioned and ready to push as soon as repository write permission is granted.
- Felt: Docking clearance is the only Git step left—the ship and cargo are safe.

## Stardate 2026-09-29
- Changed: Replaced the public room-label review with one Double Room offer, applied the supplied ₹1,500/₹2,500 rates, and built the protected one-screen staff and housekeeping foundation.
- Why it matters: Guests now see a clean, bookable-looking offer while the hotel gains the first honest piece of its own operations system instead of a fake DJUBO-style demo.
- Felt: The bridge and the first working station are connected—one real system at a time.

## Stardate 2026-09-29
- Changed: Authenticated the new GitHub account and pushed the complete verified project to `helicongorkha-darjeeling/MainliGroupOfHotels` on `main`.
- Why it matters: The hotel now owns a recoverable source repository ready for Supabase, Vercel, and the live booking-flow work.
- Felt: Docking complete—the ship is safely home under the right flag.

## Stardate 2026-09-29
- Changed: Linked and deployed the Vercel production project, refined the date calendar, and added the secure stay-review and guest sign-in booking handoff.
- Why it matters: A guest can now move from real dates and pricing into the first honest stage of a booking, while inventory remains protected until the hosted database is approved and migrated.
- Felt: The booking corridor is open; the final airlock is Supabase, not guesswork.

## Stardate 2026-10-01
- Changed: Used eight real photos from the cleaned, renamed export in a filtered gallery and full-photo viewer; kept the source photos untouched.
- Why it matters: Guests can inspect the rooms and hotel spaces clearly before choosing a stay.
- Felt: The hotel finally looks like itself—real rooms from our hills.

## Stardate 2026-10-01
- Changed: Replaced the native calendar with full-field date buttons, an anchored desktop picker and mobile sheet; verified current-date defaults, month boundaries and the stay-review handoff.
- Why it matters: A guest can choose dates comfortably and carry the right stay and price into sign-in, without claiming an untested booking or payment.
- Felt: A smoother boarding corridor—one small, working step closer to the engine room.

## Stardate 2026-10-01
- Changed: Added guest phone/email validation and an editable checkout review that opens without sending a sign-in email or making payment.
- Why it matters: We can walk through the booking experience safely while identity, inventory and payment setup remain real external gates.
- Felt: The next door opens clearly—no mystery button, no pretend booking.

## Stardate 2026-10-01
- Changed: Added Double, Triple, Four-person and Family-with-sofa photo choices, plus separate lobby, restaurant, front-desk and exterior gallery filters.
- Why it matters: Guests choose the layout the owner actually photographed; unpriced layouts cannot silently book Double Room inventory.
- Felt: The ship's rooms now have their own faces, not one label for every cabin.

## Stardate 2026-10-02
- Changed: Prepared private Supabase checkout-draft saving before payment, including validated contacts, retry-safe updates and failure handling. Hosted activation is still pending database access and the server-only key.
- Why it matters: Checkout will only report a save after the database acknowledges it, independently of Razorpay; drafts cannot become pretend reservations.
- Felt: Wiring the recorder before opening the payment airlock.

## Stardate 2026-10-02
- Changed: Recorded the owner's 25-room, 70-guest inventory in a backend-only import source, with 14 Double, 4 Triple, 6 Four-person and 1 Six-person rooms; blank amenities remain unknown.
- Why it matters: Guests choose a category while reception controls physical room assignment. The corrected inventory remains unpublished until database import and category-capacity checks are verified.
- Felt: A clear cabin manifest, with the keys staying at reception.

## Stardate 2026-10-02
- Changed: Verified Supabase login, linked the hotel checkout to the correct hosted project, and applied only the private checkout-draft migration with its migration history. Hosted save, retry, ownership, validation and role-permission checks passed; synthetic test writes were rolled back.
- Why it matters: The database can safely receive guest details before payment. The website still needs its server-only key and a real form test; inventory holds, reception assignment and payments remain off.
- Felt: The recorder is connected—now one safe cable left before the guest form can use it.

## Stardate 2026-10-02
- Changed: Replaced the guest email-link button with Book now, a compact mobile OTP step and a guarded payment section. Added real Supabase phone-auth/CAPTCHA integration seams and setup instructions; removed the old automatic physical-room hold action.
- Why it matters: Guests can follow a clear category-first booking journey while reception retains room assignment. Missing providers cannot simulate SMS verification, inventory holds or payment; live delivery and charging remain off.
- Felt: The boarding sequence is clear—each door opens only when its real check passes.

## Stardate 2026-10-03
- Changed: Audited local/GitHub/Vercel/Supabase backend state and added BACKEND_AUDIT_AND_PLAN.md plus BACKEND_CUSTOMIZATION_GUIDE.md. Tests (45), lint and build passed; hosted draft grants and migration history were checked read-only.
- Why it matters: We now have an evidence-based path from private drafts to category reservations and verified payments, with clear customization points and 25 unfinished source files identified. No application code, hosted data, push or deployment was changed by this audit.
- Felt: A clear engine-room map—one small, testable system at a time.

## Stardate 2026-10-03
- Changed: Configured the ignored local Supabase server key, corrected local same-origin host matching without trusting forwarded headers, and verified that the actual guest form saves a labelled draft before checkout review.
- Why it matters: Guest contacts now reach the real private database locally before payment; a saved draft is still not a reservation, SMS or charge. Production configuration remains to be checked.
- Felt: The recorder works—the booking engine now has a real first signal.

## Stardate 2026-10-03
- Changed: Integrated the supplied ivory-and-gold design with Teesta's real photographs, complete navigation and a gated members page. Removed obsolete public styles and reconciled the ₹2,500 Double Room starting price in both the site and hosted draft writer.
- Why it matters: Guests see the real hotel, keep their selected dates, and receive one consistent room price. The existing guarded checkout, private storage and disabled-payment controls are preserved.
- Felt: Teesta looks like itself, with a much clearer boarding path.

## Stardate 2026-10-03
- Changed: Made the website the first channel in a read-only setup workspace showing the owner's 25 rooms, 70-person capacity and category mapping; restricted production access to authorized Teesta staff or group administrators.
- Why it matters: We can see exactly what is recorded and what must be activated next, without pretending source counts are live availability or assigning room numbers online.
- Felt: One bridge, one manifest—now we can open the next system deliberately.

## Stardate 2026-10-03
- Changed: Finished guest Google sign-in on Members and My bookings with Supabase PKCE, allow-listed return paths, sign-out and honest failure states; confirmed Google is enabled and accepts the Supabase callback; reviewed every pending file for the public repository and pushed the whole site to `main`.
- Why it matters: Guests can open a private Mainali account in one tap without a password, while signing in still grants no reservation, payment, mobile verification or staff access. One Supabase URL setting remains before live sign-ins return to the website.
- Felt: A new gangway is down—guests can step aboard, and the keys still stay at reception.
