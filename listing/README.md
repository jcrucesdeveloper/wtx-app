# WTX — Store Listing Package

Everything needed to submit WTX to Google Play and the Apple App Store, built
around actual ASO (App Store Optimization) practice, not guesses. Researched
2026-09-20.

## What WTX actually is (source of truth for all copy)

Read from `README.md`, `capacitor.config.ts`, and `src/` on `main` at the time
of writing. Only these are real, shipped features — copy anywhere in this
folder must not claim more:

- Plain-text workout format (`.wtt`): a routine is a small human-readable text
  file — name, `key: value` metadata, one exercise per line.
- **Templates library** — every routine you've loaded, parsed into a summary
  (exercise count, sets, muscle groups).
- **Load a routine** three ways: paste `.wtt` text, pick a `.wtt` file, or
  scan a QR code (camera or image).
- **Create a routine** with a form that serializes to valid `.wtt` text.
- **Share via QR** — the whole routine is base64url-encoded into an import
  link; no server round-trip, no account needed on either end.
- **Configurable accent color.**
- No backend, no account, no sign-up. Data lives in `localStorage` on-device.
- App ID `com.wtx.app`, display name `WTX`. Built with Capacitor for
  Android/iOS from the same web codebase.
- Monetization: AdMob ads are wired in (`src/services/ads.ts`,
  `src/stores/ads.ts`). **A "remove ads" purchase flow does not exist yet** —
  only a local flag a future IAP can call. Do not advertise "remove ads"
  as a purchasable feature until that ships.
- **Sessions and Friends tabs are UI placeholders, not functional.** Do not
  mention them in store copy — Apple (4.3, 2.3) and Google both reject
  listings that describe non-functional features.
- No privacy policy page exists yet in the codebase. One is **required**
  before either store submission (see `research/05-privacy-compliance-notes.md`).

## Folder map

```
listing/
  research/            ASO methodology, keyword research, character limits,
                        asset specs, privacy/compliance notes — read this first
  play-store/          Ready-to-paste Google Play Console copy
  app-store/            Ready-to-paste App Store Connect copy
  assets/               Image specs + content shot list (no image files —
                        design work is separate from this copy pass)
```

## How to use this

1. Skim `research/01-aso-strategy.md` for the positioning decision this
   package makes (why "plain-text, no-account workout tracker" and not
   "yet another workout tracker").
2. Pick a title from `play-store/01-title-short-description.md` and
   `app-store/01-name-subtitle-keywords.md` — both give a primary + 2
   alternatives with exact character counts.
3. Paste the rest in as-is; adjust tone to taste.
4. Before submitting, run through `research/05-privacy-compliance-notes.md`
   and the two `*-worksheet.md` files — Data Safety (Play) and App Privacy
   (Apple) are compliance-sensitive and Apple can reject on mismatch.
5. Commission/design the actual image assets per `assets/checklist.md`, then
   drop them in `assets/` before upload.

## Honesty check on the keyword research

I don't have access to Apple Search Ads volume data, Google's internal query
data, or paid ASO tools (AppTweak, Sensor Tower, MobileAction, data.ai).
Keyword picks in this package are built from: Apple's/Google's own published
ranking-factor guidance, patterns observed in top workout-tracker listings
(FitNotes, Hevy, Strong), and the niche "plain-text fitness" community
(Fitdown, Fitmark, and dev-community write-ups on ditching fitness apps for
text files) that WTX's actual differentiator competes in. Treat priority
labels as directional, not measured. `research/02-keyword-research.md`
has a validation checklist for confirming these once you have store console
access.
