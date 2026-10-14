# Owner-editable hotel information
Edit public hotel facts in `lib/hotel-content.ts` and marketing/contact copy in `lib/site-copy.ts`. Visible tables, amenities and JSON-LD share the hotel model. FAQ HTML and schema share the same question/answer array.

## Confirm before public launch
- Public HTTPS domain: set NEXT_PUBLIC_SITE_URL for the production environment.
- Public phone/WhatsApp and an exact map pin; the current address-based Maps search is retained.
- Approved check-in and checkout times; update the corresponding FAQ answer when supplying times.
- Room sizes, precise beds, adult/child rules and included meals/transfers.
- Published starting-rate schedule, seasonal prices, taxes and final payment/cancellation terms.
- Any event venue with name, description and capacity. Leave absent when not offered.
- Any genuine guest rating, review count and source. Leave absent until verified.
- Exact walking distances. Current copy uses the existing address and omits unconfirmed walking times.

## Search visibility
SITE_INDEXING defaults to disabled independently of BOOKING_MODE. Keep previews blocked.
After the owner approves public information and the production HTTPS domain, enable SITE_INDEXING=enabled only in production and rebuild. Vercel preview environments remain blocked. No indexing setting enables online payment.
Private/transactional URLs remain excluded from the sitemap and return noindex headers.

## Photos
20 full-size branded copies: `C:\Users\FaradaysCage007\Desktop\Clients\Kiran - with logo\public\images`.
All 20 originals were checked against SHA-256 hashes; none changed. No failed or skipped hotel images.
Brand assets, dependency images and review screenshots were excluded intentionally.
28 crop-specific website derivatives plus 20 full-frame website copies live in `public/branded-images`.
Two reviewed adjustments: teesta-room-seating uses bottom-left to avoid the bed; teesta-arrival uses top-left for contrast against sky. Others use bottom-right, size 0.22 and opacity 0.92. All logo artwork/colours are supplied originals.
Hero derivatives include the display gradient before watermarking so automatic contrast selection sees the final background.

Reproduce assets with the bundled Python/Pillow runtime:
```powershell
python scripts/brand-photos.py --output "<external output folder>" --logo-folder "C:\Users\FaradaysCage007\Desktop\Prompts\photo-logo"
# Optional: --files teesta-arrival.webp
```
The supplied script and three PNGs are kept together in Desktop/Prompts/photo-logo; that copied script also supports --files with relative photo paths.

## Validation
- Main baseline: 219 tests; current implementation: 236 passing tests across 24 files.
- Schema.org validator: actual Teesta page Hotel graph and FAQPage returned 0 errors, 0 warnings (14 October 2026).
- No database migration, rate-function change, payment activation, merge or manual deployment is included.
- Search rankings and AI citations are outcomes to measure after launch, not guarantees.
