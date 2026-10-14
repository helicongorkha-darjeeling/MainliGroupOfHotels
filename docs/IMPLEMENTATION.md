# Mainali public site implementation
Approved plan: public design system, synchronized Hotel/HotelRoom/FAQPage/EventVenue data, independent search visibility, and branded copies of 20 photos.
Constraints: preserve backend behavior, pricing functions, staff/admin files and original images. Canonical property route: /stays/teesta. No merge or deployment.
## Progress
- Setup: isolated design-system-landing branch from origin/main.
- Automatic Vercel Git deployments are disabled specifically for `design-system-landing` in `vercel.json` to keep delivery limited to a draft PR. Other branches retain their existing behavior. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
- Tasks: (1) facts/schema/indexing, (2) brand/photos, (3) public presentation, (4) validation and draft PR.
- Ruling: use the bundled Python/Pillow runtime rather than install another system Python.
- Ruling: preserve legacy private CSS behind a public-page scope boundary; staff/admin styles and source files remain untouched.
- Owner information remains editable; absent facts must not be invented.


## Validation and review
- Main baseline: 219 tests (the earlier 249 count included the unmerged staff branch). New suite: 236 tests.
- 20 viewport cases passed; keyboard, guest bounds, URL parameters, private noindex, redirect, no-JS and reduced motion checked.
- Final independent code review found no additional booking, privacy, schema or backend regressions.
- Fixed final review findings: account spacing/separators, mobile anchor offsets and 48px guest stepper targets.
- Fixed desktop compact controls: Tailwind hidden!important overrode desktop display. Replaced hidden attribute with responsive data-expanded styling and added a browser regression check.
- Ruling: apply the hero gradient before watermarking derivatives; this preserves automatic ink/ivory contrast without a second CSS overlay.
- Owner fact accuracy and live authenticated payment outcomes require owner/provider verification; no claims of search rankings or citations are made.
- Removed the hero booking-panel overlap after final screenshot review so the watermark stays fully visible.
- Schema.org validator: actual property Hotel/HotelRoom graph and FAQPage returned 0 errors and 0 warnings on 14 October 2026.
