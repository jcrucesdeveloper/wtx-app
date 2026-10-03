# WTX — Store Listing Package

Everything needed to submit WTX to Google Play and the Apple App Store, built
around actual ASO (App Store Optimization) practice, not guesses. Researched
2026-09-20.

## What WTX actually is (source of truth for all copy)

The shipped feature list is `CHANGELOG.md` → 1.0.0. Copy anywhere in this
folder must not claim more than that. In short:

- **Tracking:** one-tap set logging with last time's values, rest timer,
  warm-up and drop sets, editing a workout while it runs, a review step
  before finishing.
- **Progress:** personal records, comparison with the last session, week
  streak, milestones, training calendar and history.
- **Routines:** an editor, 876 exercises with images and Spanish names,
  three starter routines, and the plain-text `.wtt` format — load from text,
  file, link or QR, and share the same ways.
- **Accounts are optional.** The app works fully on the device. An account
  adds sync, group workouts and the social feed.
- **Group workouts and social:** live rooms joined by code, link or QR,
  cheers, a shared recap, a followers-only feed with kudos, profiles,
  report and block.
- **App:** English and Spanish, dark/light themes, accent colours, kg or lb,
  opt-in reminders, full data export and import.
- **Ads:** 1.0.0 ships with ads off (`VITE_ADS_ENABLED`). There is no
  "remove ads" purchase. Don't mention ads either way in the copy.
- App ID `com.wtxworkout.app`, display name `WTX`, public site
  `https://wtxworkout.com`.

All copy exists in **English and Spanish**. Spanish is the launch market for
marketing, so keep the two in step.

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
   package makes (a fast workout tracker you can use without an account and
   train on with friends, with plain-text routines as the unusual extra).
2. Pick a title from `play-store/01-title-short-description.md` and
   `app-store/01-name-subtitle-keywords.md` — both give a primary and an
   alternative per language, with exact character counts.
3. Paste the rest in as-is, English and Spanish; adjust tone to taste.
4. Before submitting, run through `research/05-privacy-compliance-notes.md`
   and the two `*-worksheet.md` files — Data Safety (Play) and App Privacy
   (Apple) are compliance-sensitive and Apple can reject on mismatch.
5. Upload the images from `visuals/png/` (shot list in
   `assets/checklist.md`) and the videos from `videos/out/`.

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
