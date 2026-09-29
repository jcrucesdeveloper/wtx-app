# Google Play — Data Safety Section Worksheet

Fill this in Play Console → App content → Data safety. Full reasoning and
code references are in `research/05-privacy-compliance-notes.md`; this is the
condensed, fill-in-order version. Items marked **Verify** depend on
production config.

"Shared" in Google's sense = transferred to a third party. Data sent to a
**service provider** processing it on our behalf (Supabase, Sentry) is *not*
"shared"; AdMob data *is* shared (Google uses it for its own purposes too).

## 1. Does your app collect or share any of the required user data types?

**Yes.**

## 2. Is all of the user data collected by your app encrypted in transit?

**Yes** (HTTPS to Supabase, Sentry and Google).

## 3. Do you provide a way for users to request that their data is deleted?

**Yes** — in-app: Configuration → Account → Delete account; outside the app:
email the contact address (see the Privacy Policy). Play also asks for a
**Delete account URL**: use `https://<site>/privacy.html` (section "Your
choices: export and deletion") or a dedicated page — **Verify** it's
accepted.

## 4. Data types

| Category → type | Collected | Shared | Optional? | Purposes | Source |
|---|---|---|---|---|---|
| Personal info → Email address | Yes | No | Optional (only with an account) | Account management, App functionality | Supabase Auth |
| Personal info → Name | Yes (display name) | No | Optional | App functionality, Account management | `profiles` |
| Personal info → User IDs | Yes | No | Optional | Account management, Analytics | Supabase user id |
| Personal info → Other info | Yes (bio) | No | Optional | App functionality | `profiles.bio` |
| Health and fitness → Fitness info | Yes — workouts (exercises, sets, weights, reps, notes) synced with an account | No | Optional | App functionality | `sessions`, `routines` |
| Messages → Other in-app messages | No (no chat/DMs/comments) | — | — | — | — |
| App activity → App interactions | Yes | No | Required (sent without an account too) | Analytics | `app_events` |
| App activity → Other user-generated content | Yes (shared workouts, reports once moderation lands) | No | Optional | App functionality | `sessions.shared`, `content_reports` |
| App info and performance → Crash logs | Yes (when Sentry DSN set) | No | Required | Analytics (app stability) | Sentry |
| App info and performance → Diagnostics | Yes | No (Sentry) / Yes (AdMob) | Required | Analytics, Advertising | Sentry, AdMob |
| Device or other IDs | Yes (advertising ID, app set ID) | **Yes** (Google) | Required | Advertising or marketing, Fraud prevention/security, Analytics | AdMob |
| Location → Approximate location | **Verify** (AdMob derives it from IP) | **Verify** | Required | Advertising | AdMob |
| Financial info → Purchase history | **No** — purchase flow hidden until it ships | — | — | — | — |

Photos/videos, contacts, calendar, files, audio, precise location, web
browsing: **No** (the camera is used only to decode QR codes on-device).

## 5. Also in Play Console → App content

- [ ] **Ads:** "Yes, my app contains ads."
- [ ] **Privacy policy:** `https://<site>/privacy.html`.
- [ ] **Account deletion:** as in section 3.
- [ ] **Target audience:** 16+ (matches the Terms; avoids the Families
      policy). Don't select under-13 age groups.
- [ ] **Data safety** answers above, re-checked against the AdMob console
      (personalized vs non-personalized, location) — **Verify**.
- [ ] `app-ads.txt` served at the developer website root
      (`public/app-ads.txt.example`).
- [ ] Re-run this worksheet if an IAP/remove-ads flow ships (adds "Purchase
      history") or moderation stores new data types.
- [ ] Cross-check with `app-store/06-app-privacy-worksheet.md`.
