# Save guest details before payment

Current code saves a checkout draft before showing the checkout review when the server is configured. It does not reserve a room, confirm an email, create a payment, or require Razorpay keys. The standalone storage migration was applied to project `yefndxkljepxhoeclknl` on 2 October. On 3 October the ignored local server key was configured and a labelled test guest was saved through the actual form. Vercel Production configuration and production form saving still need verification after an approved deployment.

## First: sign in locally

Supabase CLI login is account-wide on this computer, not tied to the current folder. Run `npx --yes supabase login --agent=no --output-format=text` from any folder, finish the browser sign-in and enter the verification code in that same terminal, not in chat. Run project-specific commands from this checkout (or supply `--workdir`). CLI login and this checkout's project link were verified on 2 October 2026. No Docker is needed for CLI sign-in.

## Next: connect private storage

1. Completed: `supabase/migrations/202610010001_checkout_drafts.sql` was applied independently of the older booking-foundation schema. It adds `public.booking_drafts` and a service-role-only writer; it never enables inventory or payments. The additional `20261003134414_unified_double_room_price.sql` changes only the saved starting Double Room amount to ₹2,500 per room per night, regardless of one or two occupants. Both versions are recorded in hosted migration history. Do not reapply them or blindly push the older foundation migrations; their physical-room hold model must first be reconciled with category booking and later reception assignment.
2. Local configuration is completed. Verify `SUPABASE_SECRET_KEY` in Vercel Production through secure provider settings before an approved deployment. Use the intended project's server secret or service-role key. Never put it in `NEXT_PUBLIC_*`, Git, screenshots, logs or chat.
3. Local form test completed: a labelled synthetic guest reached review and its contact/stay details were verified in `booking_drafts`. The test draft remains stored; it is not a reservation. After deployment, repeat an explicitly labelled test and verify the row in Supabase's Table Editor → `booking_drafts`. A repeated submit/contact edit must update the same draft ID. Do not send OTP or make a payment merely to check storage.

The endpoint accepts bounded same-origin JSON requests. A random HttpOnly cookie owns the draft; its hash is stored, not the cookie itself. The database enforces a quota across application instances. Browser roles cannot read contacts or call the privileged writer directly. Server responses return only a draft receipt, not guest details. Invalid configuration, failed writes and mismatched receipts leave the guest on the details form with their inputs retained.

Drafts expire logically after seven days. Expiry does not automatically delete data. The owner must approve retention, deletion, abuse controls and operational access before public launch. Do not treat the current quota as a complete substitute for bot protection or monitoring.

## Inventory and room assignment

`supabase/data/teesta-inventory.json` records the owner's 2026-10-02 sheet: 14 Double, 4 Triple, 6 Four-person and 1 Six-person room; 25 rooms and capacity 70. Blank amenity cells remain unknown. Rate cells in that sheet were blank; the later owner instruction sets the public starting Double Room price to ₹2,500 per room per night for one or two guests. Other layouts remain unpriced. These are starting quotes, not activated nightly inventory pricing.

Room numbers are staff-only. Guests will reserve a category; reception will assign a physical room later. Category-level capacity reservations and audited later assignment still need implementation and concurrency tests. The current hold function allocates physical rooms internally, so it must not be enabled unchanged as proof of this new workflow. The six-person room must not be equated to the photographed Family Room with Sofa without a confirmed photo mapping.

The read-only channel setup dashboard shows these source aggregates at `/staff/channels`. Its `?preview=1` shortcut works only in local development and is ignored in production, where staff authorization is required. It is not live availability or OTA synchronization.

The local database-save check has passed, but do not enable live bookings until category inventory, policies, phone verification and payments pass their own end-to-end checks. `BOOKING_MODE` remains `preview`.
