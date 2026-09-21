# Google Play — Data Safety Section Worksheet

Fill this in Play Console → App content → Data safety. Full reasoning is in
`research/05-privacy-compliance-notes.md`; this file is the condensed,
fill-in-order version.

## 1. Does your app collect or share any of the required user data types?

**Yes.** (The AdMob SDK collects advertising/device identifiers even though
WTX's own code collects nothing — see below.)

## 2. Data types

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Device or other IDs (advertising ID) | Yes (via AdMob SDK) | Yes, with Google | Advertising |
| Approximate location | Verify against production AdMob config — mark Yes if location-based ad targeting is enabled, No otherwise | Same as collected | Advertising |
| App activity / interactions | Possibly, via AdMob | Same as collected | Advertising, analytics |
| Any routine/exercise data the user enters | **No** | No | N/A — stays in local `localStorage`, never transmitted |
| Account info | **No** | No | App has no accounts |

## 3. Security practices

- Is data encrypted in transit? **Yes** (AdMob SDK traffic is HTTPS by
  default — standard Google Mobile Ads SDK behavior).
- Can users request data deletion? For WTX's own data: **not applicable**,
  nothing is collected server-side. For the AdMob-collected advertising ID:
  governed by the user's device-level ad ID / opt-out settings, not by WTX.

## 4. Before you submit

- [ ] Confirm production AdMob config (personalized vs. non-personalized
      ads) — determines the "approximate location" and tracking-related
      answers above. Don't guess; check the actual `AdMob` init call and
      Google AdMob console settings.
- [ ] Privacy policy URL is live and linked (required regardless of the
      answers above — see `research/05-privacy-compliance-notes.md`).
- [ ] Re-run this worksheet if an IAP/remove-ads flow ships before
      submission — that would add a "Purchase history" data type.
