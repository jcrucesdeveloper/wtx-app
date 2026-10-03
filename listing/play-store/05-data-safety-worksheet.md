# Google Play — Data Safety Section Worksheet

Answers for **1.0.0 as it ships**: ads off (`VITE_ADS_ENABLED=false`), no
crash reporting (no `VITE_SENTRY_DSN`), and no advertising ID permission (the
release manifest removes it). Full reasoning is in
`research/05-privacy-compliance-notes.md`; this is the fill-in-order
version for Play Console → App content → Data safety.

Redo this worksheet in the release that turns on ads (adds Device or other
IDs, Diagnostics and possibly Approximate location, all **shared** with
Google) or sets a Sentry DSN (adds Crash logs and Diagnostics).

"Shared" in Google's sense means transferred to a third party. Supabase
processes data on our behalf as a service provider, so nothing below is
"shared".

## Step 1: Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS to Supabase) |
| Which of the following methods of account creation does your app support? | **Username and password** (email and password, Supabase Auth). Accounts are optional. |
| Delete account URL | `https://wtxworkout.com/delete-account.html` |
| Do you provide a way for users to request that some or all of their data is deleted, without requiring them to delete their account? | **Yes**. Workouts and routines can be deleted one by one in the app. |

## Step 2: Data types

Tick only these. For each one: **Collected: yes. Shared: no. Processed
ephemerally: no.**

| Category → Type | Required or optional | Purposes | What it is |
|---|---|---|---|
| Personal info → **Email address** | Optional | App functionality, Account management | Sign-in email (only with an account) |
| Personal info → **Name** | Optional | App functionality, Account management | Display name on the profile |
| Personal info → **User IDs** | Optional | App functionality, Account management, Analytics | Account ID; attached to usage events when signed in |
| Personal info → **Other info** | Optional | App functionality | Profile bio |
| Health and fitness → **Fitness info** | Optional | App functionality | Routines and workouts synced to the account (exercises, sets, weights, reps, notes) |
| App activity → **App interactions** | **Required** | Analytics | Usage events: event name, platform, app version, and where the install came from (a link's source label). Sent with or without an account. |
| App activity → **Other user-generated content** | Optional | App functionality | Workouts shared to followers, group workout activity, reports filed |

## Not collected (leave unticked)

- **Location** (approximate or precise)
- **Financial info**: no purchases in 1.0.0
- **Messages**: no chat, DMs or comments; group workout cheers are fixed
  emoji reactions
- **Photos and videos, Audio, Files and docs**: the camera and picked images
  are only used to read QR codes on the phone, and exports stay on the phone
  unless the user shares them
- **Calendar, Contacts, Web browsing, Health info**
- **App info and performance** (crash logs, diagnostics): no Sentry DSN in
  1.0.0
- **Device or other IDs**: no advertising ID, and usage events carry no
  device identifier

## Other App content answers this affects

- **Ads:** "No, my app does not contain ads."
- **Advertising ID:** "No". The release manifest removes `AD_ID` (see
  `android/app/src/main/AndroidManifest.xml`); restore it when ads ship.
- **Privacy policy:** `https://wtxworkout.com/privacy.html`
- Cross-check with `app-store/06-app-privacy-worksheet.md` before the iOS
  submission.
