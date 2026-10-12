# Google sign-in branding for Mainali Hospitality

The production redirect fix is deployed. Google receives the exact callback `https://mainli-group-of-hotels.vercel.app/auth/callback` via Supabase. The displayed Google sign-in brand is managed separately in the Google Cloud project that owns client `1043204672593-3jvtt5ubi81m75qk476qepqm4045npqd.apps.googleusercontent.com`.

## Branding values to configure

The owner identified the project as `hotel-booking-app-510313`. Open [its Google Auth Platform Branding page](https://console.cloud.google.com/auth/branding?project=hotel-booking-app-510313). Use the following public app information:

| Field | Value |
| --- | --- |
| App name | Mainali Hospitality |
| Home page | https://mainli-group-of-hotels.vercel.app |
| Privacy policy | https://mainli-group-of-hotels.vercel.app/policies/privacy |
| Terms | https://mainli-group-of-hotels.vercel.app/policies/booking-terms |
| Available logo | `public/brand/mainali-hospitality.png` |

Choose an approved support email from the accounts Google makes available in the project. Website contact fields and Google branding changes do not grant any additional Google scopes or staff access. The Google callback URI remains `https://yefndxkljepxhoeclknl.supabase.co/auth/v1/callback` unless a custom Supabase auth domain is actually configured.

The owner reported setting the app name to `Mainalihospitality`, support email to `helicongorkha@gmail.com`, the production homepage and authorized domains `mainli-group-of-hotels.vercel.app` and `yefndxkljepxhoeclknl.supabase.co`. The owner later renamed the Cloud project to `Mainali Hospitality`; that project label is separate from the OAuth app name.

A fresh production Google sign-in on 12 October 2026 succeeded as `helicongorkha@gmail.com`, returned to the online Members page and displayed the Front Desk Operations link. Google's account chooser still displayed `yefndxkljepxhoeclknl.supabase.co`. Its saved privacy link initially had an extra trailing semicolon and returned 404. The owner corrected it, and a second fresh sign-in verified both policy links now match the table above. Both public policy pages return 200, and sign-in still succeeds. The app name remains unverified on the account chooser.

The exact OAuth app name and final verification/publication status still need confirmation. The owner supplied [the Verification Center URL](https://console.cloud.google.com/auth/verification?project=hotel-booking-app-510313), but the Codex browser redirected it to Cloud's Welcome page with no project selected. No successful Google branding mutation was made through that browser. Ask the owner for the status/error text on the page rather than its URL.

Google saves consent-screen changes as Draft Branding. For a published external app, run its brand verification, resolve any ownership or policy issues, and publish the approved branding before expecting the new name/logo to appear for guests.

## Current review and homepage ownership

On 12 October 2026, the owner reported that Google's previous verification attempt found the homepage was not registered to the owner. The owner then submitted a manual review request. Google's message says the previous approved consent screen remains in use, the first email is expected within 3–5 days, and manual review can take up to 4–6 weeks. This is a pending review, not published Mainali branding.

Search Console loaded under `helicongorkha@gmail.com`. A URL-prefix property for `https://mainli-group-of-hotels.vercel.app/` was prepared, and Google's exact HTML verification file was downloaded to `public/google29d463337eacf41d.html`. It must be deployed at `https://mainli-group-of-hotels.vercel.app/google29d463337eacf41d.html`, publicly reachable with the original file contents, before selecting Verify in Search Console. Do not remove the file after verification succeeds; Google periodically rechecks it.

Publishing the file prepares the ownership proof; a successful Search Console verification is required before treating the issue as fixed. After successful ownership verification, follow Google's instruction to wait 24 hours before requesting branding re-verification. If the manual review remains in progress, keep the existing configuration and report the ownership fix when Google's review team contacts the developer email. No review-team email has been sent by Codex.

Sources: [Google's homepage ownership issue instructions](https://support.google.com/cloud/answer/13807376), [Search Console HTML-file verification](https://support.google.com/webmasters/answer/9008080#html_verification).

## Replacing the Supabase hostname

A verified app name and a custom auth hostname are separate settings. Replacing `yefndxkljepxhoeclknl.supabase.co` requires an owned domain and a configured Supabase custom domain, typically `auth.<your-owned-domain>`. Do not use an invented hostname or point Google's callback at an unconfigured domain. Once the actual domain is verified and activated, update the app's Supabase public URL and Google's callback settings together, deploy, and test a fresh sign-in.

An owned domain is not required to use the current production sign-in. Supabase custom domains are a paid add-on on a paid plan. Supabase also documents an experimental vanity-subdomain option on paid plans, such as a branded name under `supabase.co`, which does not require buying a separate domain. Neither option has been activated or purchased. See [Supabase custom-domain requirements](https://supabase.com/docs/guides/platform/custom-domains) before choosing a hostname.

The custom-domain add-on currently costs $0.0137/hour (approximately $10/month), in addition to the paid plan and domain registration. [Supabase custom-domain pricing](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains).

Sources: [Supabase Google sign-in branding](https://supabase.com/docs/guides/auth/social-login/auth-google#setup-consent-screen-branding), [Google brand verification and publication](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).
