# App Store — App Privacy ("Nutrition Label") Worksheet

Fill this in App Store Connect → App Privacy. Full reasoning:
`research/05-privacy-compliance-notes.md`. This is the condensed,
fill-in-order version — Apple rejects on label/behavior mismatches more
often than almost any other metadata field, so don't guess on the items
marked "verify."

## Data types to declare

| Data type | Collected? | Linked to identity? | Used for tracking? | Notes |
|---|---|---|---|---|
| Identifiers (Device ID) | **Yes** | No (device-level, not account — app has no accounts) | **Verify** against production AdMob config | Comes from the AdMob SDK, not WTX's own code |
| Location (Coarse) | **Verify** | — | — | Only if AdMob is configured for location-based ad targeting; check before answering |
| Usage Data | **Verify** | No | **Verify** | AdMob may collect ad-interaction data depending on config |
| User Content (routines, exercises entered) | **No** | — | — | Confirmed: stays in local `localStorage`, no backend, no transmission |
| Contact Info / Account Info | **No** | — | — | App has no accounts |

## App Tracking Transparency (ATT)

Apple requires an ATT permission prompt at runtime **if** the app uses IDFA
or otherwise tracks the user across apps/websites owned by other companies
for advertising — this is exactly what "personalized ads" mode in AdMob
does. This is a binary yes/no determined by the actual production AdMob
configuration (not yet finalized as of this writing — see
`capacitor.config.ts`, still in `initializeForTesting: true`).

- [ ] Before submission: confirm whether production AdMob is configured for
      personalized or non-personalized/contextual ads.
- [ ] If personalized → implement the ATT prompt (`AppTrackingTransparency`
      framework) and declare "Data Used to Track You" in the label.
- [ ] If non-personalized/contextual only → ATT prompt likely not required;
      declare accordingly, but confirm against Apple's current guidelines at
      submission time since this area gets policy updates periodically.

## Before you submit

- [ ] Privacy policy URL is live and entered in App Store Connect → App
      Information (required for every app).
- [ ] Re-run this worksheet if an IAP/remove-ads flow ships before
      submission.
- [ ] Cross-check this label against the Play Store Data Safety worksheet
      (`play-store/05-data-safety-worksheet.md`) — they should tell the same
      factual story, since it's the same binary/SDK behavior on both
      platforms.
