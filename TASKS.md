# Mainali Hospitality checklist

Current inventory: 25 active rooms (14 Double, 4 Triple, 6 Four-person, 1 Six-person). Approved rates: ₹2,000 solo, ₹2,500 couple, ₹1,200 per guest for 3+. Historical September prototypes and seeds must not be replayed against hosted Supabase.

## Public website and existing production

- [x] Mainali logo, Teesta photographs and responsive public pages.
- [x] Real category availability, seasonal pricing and guest capacity recommendations.
- [x] Google sign-in with fixed production callback and validated return destinations; owner verified sign-in works.
- [x] Book now → review → Google sign-in when Pay now is tapped → guest contact → secure payment handoff.
- [x] Real low-stock counts, genuine seasonal discount comparisons and original payment-hold deadline; no invented scarcity or discounts.
- [x] Tentative 24-hour holds, payment 15-minute holds, cancellation and expiry capacity release.
- [x] Guest booking history and own-contact save; Google sign-in does not verify phone numbers.
- [x] Server-only booking gateway, payment signature/webhook verification, idempotent capture and late-payment review.
- [x] Resend receipt/reminder integration and front-desk call list; provider delivery still needs configuration/test.
- [x] Existing Admin manager login and protected operational dashboard; owner confirmed password login opens it.
- [x] Supabase CLI link and October category import: exactly 25 physical rooms.
- [x] Public privacy/booking/refund draft pages; owner approval remains pending.
- [ ] Google branding/homepage review completion by Google Trust and Safety.
- [ ] Owner review on real Android/iOS devices, including UPI app switching/return.

## Mobile staff PR — implemented and verified, pending coordinated release

- [x] Branch `codex/mobile-staff-operations`; no direct main push.
- [x] Manager, reception and read-only housekeeping roles checked by server, gateway and database.
- [x] Individual username/password accounts created/reset/deactivated through manager UI and Edge Auth admin; existing owner account retained.
- [x] Distributed sign-in throttling, fresh active-role checks and no service key/password exposure.
- [x] Phone home: Arrivals, In-house, Departures, Rooms with dirty count, New walk-in.
- [x] Housekeeping's 25-room Dirty/All list, safe status-only response and visible 30-second refresh.
- [x] Checkout marks dirty; front desk clean/key return requires active housekeeper attribution and room audit.
- [x] Capacity-safe walk-in wizard with atomic advance, saved rates and mismatched-retry conflict protection.
- [x] Check-in registration: source/OTA reference, contacts/address/nationality/adults/children, ID and private camera photographs.
- [x] Server check-in/out times, audited manager corrections, availability-safe extensions/early departure.
- [x] Foreign passport/visa fields and official FRRO reporting reminder; no automatic submission.
- [x] Folios, extra charges, manager discounts, approved tax snapshot, integer-paise calculations and idempotent receipts.
- [x] Cash/card-terminal/manual-UPI receipts with staff attribution and non-cash reference.
- [x] Test-only Razorpay balance Payment Links/UPI QR with verified provider capture, retry/race checks and credit review.
- [x] Balance-due checkout denial with explicit audited manager approval option.
- [x] Transactional Indian financial-year invoice numbering, private printing and rotating/revocable expiring share links.
- [x] WhatsApp draft handoff and configured Resend invoice email.
- [x] Additive migration, service-only RLS tables/private storage and backward-compatible core regression.
- [x] 219 unit/API/Edge tests; rollback SQL regressions preserve 25 rooms and existing records.
- [x] Native phone screenshots, 360–430px checks, 125% text checks and 48px controls in `artifacts/staff-review/`.
- [x] Development-only synthetic review harness; all external saves disabled, absent from production.
- [ ] Review and merge PR only after agreeing coordinated backend/frontend release.
- [ ] Preview-project backup/migration/Edge/Next deployment and real-session role smoke test.
- [ ] Create named real staff, check account reset/deactivation with real Supabase sessions.
- [ ] Real private ID camera upload/download test and owner-approved retention/deletion procedure.
- [ ] Real test-mode Razorpay link/QR capture and replay verification; no live staff payment mode in scope.
- [ ] Resend verified sender and actual receipt/reminder/invoice delivery test.

## Owner settings and launch dependencies

- [ ] Approved legal hotel name, complete address, GST treatment/GSTIN where applicable, contact details and map pin.
- [ ] Approved check-in/out, cancellation/refund, privacy and guest-ID retention/deletion terms.
- [ ] Save approved tax and terms in manager settings; payment remains gated until ready.
- [ ] Razorpay test keys/webhook secret in Supabase Edge secrets; include payment.captured, order.paid, payment_link.paid and qr_code.credited.
- [ ] Resend key/sender and both Edge/Vault scheduler secrets.
- [ ] Real provider payment/refund review process and database backup/restore drill.
- [ ] Live provider activation/KYC, settlement setup and launch approval after successful tests.
- [ ] Optional phone OTP provider (MSG91 considered); not required for Google or staff username sign-in and not activated.
- [ ] Custom hotel domain when purchased; update website/Auth/Google settings together.

## Later scope

- [ ] OTA/channel inventory sync after channel access/commercial terms.
- [ ] POS, night audit, revenue reports and authorised exports.
- [ ] Housekeeper task scheduling and automated calls.
- [ ] FRRO submission integration.
- [ ] Marketing/concierge/loyalty features after operational launch.
