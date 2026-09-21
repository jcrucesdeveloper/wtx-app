# Privacy & Compliance Notes

This isn't legal advice — it's a map of what both stores will ask, mapped
against what's actually true of WTX's codebase today, so the person filling
out Data Safety / App Privacy forms isn't guessing.

## What's actually true today (verified against `src/` and `capacitor.config.ts`)

- No account, no sign-up, no login anywhere in the app.
- All routine data lives in browser `localStorage` — never leaves the
  device, never touches a server WTX controls (confirmed: "no backend" in
  README, and there's no API/fetch layer in `src/`).
- `@capacitor-community/admob` is a dependency and `src/services/ads.ts` /
  `src/stores/ads.ts` wire it in. `capacitor.config.ts` currently sets
  `initializeForTesting: true` — i.e. it's still serving Google's test ads,
  not production ad units.
- **AdMob itself collects data** even though WTX's own code doesn't: device/
  advertising identifiers, IP-derived approximate location, and app
  interaction data, for ad serving and (if personalized ads are on)
  ad personalization. This is Google's data collection, not WTX's, but both
  stores require you to disclose it anyway — "my app doesn't collect
  anything" is not an accurate answer once an ad SDK is bundled.
- No IAP/purchase library is wired in yet (`grep` for purchase/IAP/
  RevenueCat in `src/` and `package.json` returns nothing beyond the local
  `adsRemoved` flag). **Do not declare "In-app purchases" in either store's
  listing yet** — that flag only means "the UI has a button for something
  that doesn't exist yet."

## Action item before either submission: a privacy policy

Both stores require a hosted, publicly reachable privacy policy URL —
**Google explicitly requires this even for apps that collect nothing**, and
Apple requires it in App Store Connect's App Information page. WTX has no
privacy policy page in the codebase today. This needs to be written and
deployed (e.g. as a static route on the existing Cloudflare-hosted site,
`/privacy`) before either store submission — this listing package does not
include that page; flagging it here so it isn't missed.

The policy should honestly state, per the above: no account/no server-side
storage of routine data, but AdMob is present and collects advertising/device
identifiers per Google's own AdMob privacy practices (link to Google's AdMob
data disclosure in the policy — this is standard practice, not unusual for
an ad-supported app).

## Google Play: Data Safety section

Google requires this form even when an app collects nothing itself — "no
data collected" is a valid answer *only if accurate*, and it isn't here
because of AdMob. Suggested answers for the questionnaire:

| Question | Answer for WTX | Why |
|---|---|---|
| Does your app collect or share any user data? | **Yes** | AdMob SDK collects device/advertising identifiers for ad serving |
| Data types collected | Device or other IDs (advertising ID); possibly approximate location (AdMob can use this for ad targeting depending on config) | Standard AdMob disclosure — see Google's own AdMob data disclosure doc linked below |
| Is data collected by WTX's own code (routines, settings)? | No — stays in local storage, never transmitted | Confirmed: no backend, no fetch/API calls in `src/` |
| Is any data shared with third parties? | Yes — Google (AdMob), for advertising | Required disclosure for any bundled ad SDK |
| Is data encrypted in transit? | Yes (AdMob SDK traffic is HTTPS) | Google's own SDK requirement |
| Can users request data deletion? | N/A for WTX's own data (nothing is collected server-side to delete); note the AdMob/Google-side identifier is governed by the user's own device ad-tracking settings | — |
| Ads: does your app show ads? | **Yes** | AdMob is integrated — declare regardless of test-mode status, since production behavior is what matters at review |

Fill this out again, precisely, once real AdMob ad unit IDs replace test
mode and once/if an IAP flow ships — the form must reflect current binary
behavior, not a future state.

## Apple: App Privacy ("nutrition label")

Set up manually in App Store Connect — Xcode's privacy report can help draft
it but doesn't submit it for you.

| Category | Likely answer for WTX | Why |
|---|---|---|
| Data Not Collected (by WTX's own code) | Applies to routines/settings — local only | No backend |
| Identifiers (Device ID / Advertising ID) | **Collected**, via AdMob | Standard for any app bundling AdMob |
| Usage Data | Possibly, via AdMob (ad interaction data) | Depends on final AdMob configuration |
| Location (approximate) | Possibly, if AdMob's location-based ad targeting is enabled | Verify in the production AdMob SDK config, not assumed |
| "Data Used to Track You" / requires App Tracking Transparency (ATT) prompt | **Verify before submission** — depends on whether AdMob is configured for personalized ads that use IDFA across apps/websites. If yes, an ATT prompt is required at runtime and must be declared. If AdMob is set to non-personalized/contextual ads only, ATT may not be required. | This is a binary "did you configure it this way or not" fact that must be checked against the actual production AdMob setup before shipping, not guessed here |

**This table is a starting point, not a final answer.** The honest, accurate
answer for the tracking/ATT question depends on decisions not yet made
(personalized vs. non-personalized ads in the production AdMob config).
Confirm that config, then fill the label — Apple rejects for label/behavior
mismatches, and it's one of the more commonly cited reasons apps bounce at
review.

## Content rating / age rating

- No user-generated content, no chat, no location sharing, no purchases
  (yet) beyond ads. Both stores' content-rating questionnaires should land
  this at the lowest tier (Google: "Everyone" / IARC all-ages; Apple: 4+),
  contingent on truthfully declaring "Contains ads."
- Both stores require declaring "Contains ads" explicitly if any ad SDK is
  bundled, regardless of whether it's currently in test mode — this drives a
  visible "Contains ads" label on the store listing itself.

## Sources

- [Google Play data disclosure for AdMob — Google for Developers](https://developers.google.com/admob/android/privacy/play-data-disclosure)
- [Provide information for Google Play's Data safety section — Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Content rating requirements for apps, games, and ads — Play Console Help](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en)
- [Apple: App Privacy label, age rating discussion — GitHub issue writeup](https://github.com/Health-Flare/InnerFlare/issues/32)
