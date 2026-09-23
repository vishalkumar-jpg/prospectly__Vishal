# Feature: Web Analytics (Google Analytics 4)

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-08-17

## Overview

Google Analytics 4 records traffic and in-app navigation for the Prospectly SPA. It runs in
**production only** and is **anonymous** -- no user id and no user properties are ever sent.
Every URL is redacted before transmission so that no token, record id, or invite code reaches
Google.

This is separate from LogRocket (`client/src/lib/logrocket.ts` + `client/src/lib/analytics.ts`),
which handles session replay and product events. The two are independent; GA does not receive
business events.

## Server Module

None. This is a client-only integration.

## Client

### Library
- `client/src/lib/gtag/redact.ts` -- pure URL redaction (no I/O)
- `client/src/lib/gtag/gtag.service.ts` -- guarded singleton; script injection and page_view dispatch
- `client/src/lib/gtag/index.ts` -- barrel

### Hooks
- `usePageviewTracking()` -- `client/src/hooks/usePageviewTracking.ts` -- sends a page_view on every
  route change. Mounted as `<PageviewTracker />` inside `<BrowserRouter>` in `client/src/App.tsx`,
  alongside the existing `ActiveUsagePingTracker` and `ScrollToTop`.

### Initialization
- `client/src/main.tsx` calls `gtagService.init()` beside `logRocketService.init()`.

## External Integrations

- **Google Analytics 4** -- measurement id `G-9MW77JGN32`, loaded from
  `https://www.googletagmanager.com/gtag/js`.

## Business Logic

### Production gating

GA initializes only when `VITE_GA_MEASUREMENT_ID` is set and begins with `G-`.

**This variable must remain unset for local development and for the dev server.** That is the only
thing preventing local and dev traffic from polluting the production property. It also keeps GA
silent inside the Capacitor mobile shell, which ships the same bundle.

The value lives in the `FRONTEND_ENV_BASE64` GitHub secret consumed by the `deploy-frontend`
workflow. It is not stored in any committed file. Adding the variable to a local env file and
running a build outside CI is the one remaining way to leak dev data into the production property.

### URL redaction -- do not remove

Several public routes carry single-use secrets directly in the path:

- `/book-meeting/:requestId/:bookingToken`
- `/consent/:token`
- `/request/:requestId/:sharerCode`
- `/interview-booking/:candidateId/:token`
- `/jobs/:shareCode`

GA4 reads `window.location.href` into `page_location` and `document.referrer` into `page_referrer`
**automatically**. Redacting `page_path` alone is therefore not sufficient -- the service sets
`send_page_view: false` on config and sends every page_view explicitly with `page_location` and
`page_referrer` rebuilt from redacted values. Removing either the config flag or the explicit
overrides reopens the leak.

Rules are generic rather than a copy of the route table, so a tokenized route added later is
scrubbed without anyone remembering to register it. A path segment becomes `:id` when it is:

- a UUID, or all digits
- a dotted token of 20+ characters (JWTs)
- a segment where any `-`/`_`/`.`-delimited part is a mixed alphanumeric run of 6+ characters.
  This is what catches prefixed tokens such as `tok_abc123xyz789` and `bkng_Xy91Zq`. Route words
  that contain digits (`step-1`) split into parts that are purely alphabetic or purely numeric,
  so they are never matched.
- any mixed alphanumeric of 16+ characters
- a separator-free value of 20+ characters (hex hashes)

Verified against all 100 static route segments declared in `client/src/App.tsx`: zero false
positives. Re-run that check if the rules are ever loosened.

Query strings keep only `utm_*`, `gclid`, `gbraid`, `wbraid`, and `msclkid`. Everything else --
including `invite`, `sharerCode`, and `tab` -- is dropped.

Same-origin referrers are redacted. Cross-origin referrers pass through unchanged: they are the
acquisition signal and contain none of our secrets.

### What is tracked

- All routes, including authenticated pages. Safety comes from redaction, not from exclusion lists.
- `page_view` only. No business events, no conversions, no ecommerce.
- Redirect chains produce two page_views (source and destination). This is intentional -- hits on
  legacy URLs show which old links are still in circulation.

### Load timing

Commands are queued into `dataLayer` synchronously at init, then the ~90KB gtag script is injected
on `requestIdleCallback` (1s `setTimeout` fallback for Safari). Queued commands replay once the
script arrives, so deferring loses no data.

### Content Security Policy

No CSP change was required. The production frontend is served from S3 + CloudFront, and the helmet
CSP in `server/src/main.ts` only decorates `api.prospectly.com` responses. If a CSP is ever added to
CloudFront it will need `https://www.googletagmanager.com` in `script-src` and
`https://*.google-analytics.com` in `connect-src` and `img-src`.

## Known Limitations

- Ad blockers and privacy browsers block `googletagmanager.com`, so GA undercounts relative to
  server logs -- typically materially so on a B2B audience.
- There is no cookie consent mechanism anywhere in the app. GA adds to that pre-existing exposure
  (LogRocket session replay already runs at boot in production) rather than creating it. Tracked as
  a follow-up.

## Privacy Disclosure

Google Analytics is named in the "Cookies and Tracking Technologies" section of the privacy policy
(`client/src/components/privacy/SectionsA.tsx`). LogRocket is not yet disclosed there.

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-08-17 | Initial GA4 integration: production gating, SPA pageviews, URL redaction | jitendra_officebeacon |
