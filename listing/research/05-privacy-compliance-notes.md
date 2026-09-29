# Privacy & Compliance Notes

This isn't legal advice — it's a map of what both stores (and Chile's Ley
21.719) will ask, checked against what the codebase actually does, so the
person filling out Data safety / App Privacy / age-rating forms isn't
guessing. Items marked **Verify** depend on production configuration.

The user-facing texts are the Terms and Privacy Policy in
`src/locales/{en,es}.json` (`legal.*`), shown in the app (Configuration →
About, and at sign-up) and generated into `public/privacy.html` /
`public/terms.html` by `pnpm build:legal`. Keep them, this file and the
worksheets telling the same story.

## What's actually true today (verified against the code)

### Local-only use (no account)

- Routines, sessions, settings: `localStorage` only.
- Reminders: `@capacitor/local-notifications`, scheduled on the device — no
  push service, no server (`src/services/notifications.ts`).
- QR scanning (`qr-scanner`): camera frames decoded on the device, never
  stored or uploaded. Routine share links/QRs encode the routine in the URL
  itself — no server.
- **Still sends data even without an account:**
  - Usage events to Supabase `app_events` (`src/services/supabaseAnalytics.ts`,
    `app_opened` on every launch) with `user_id = null`, platform, app
    version, timestamp. Only when `VITE_SUPABASE_URL` is set.
  - Crash reports to Sentry when `VITE_SENTRY_DSN` is set.
  - AdMob (native builds only) — see below.

### Accounts (Supabase Auth + Postgres, all tables behind RLS)

| Table (migration) | What | Who can read it |
|---|---|---|
| `auth.users` | email, password hash, sign-in metadata | Supabase / us only |
| `profiles` | `display_name` (1–24), `bio` (≤150), permanent `invite_code`, `created_at` | self, people you follow, your followers, roommates (`can_view_profile`) |
| `routines` | full `.wtt` text | owner only |
| `sessions` | full `.wts` text incl. session notes and per-exercise notes; `shared` flag; `feed_snapshot` (PRs, comparison, streak, milestone, `trainedWith` = partners' display names) | owner; **followers read shared ones in full, including notes** |
| `follows` | follower → followee edges | the two parties |
| `session_kudos` | who gave kudos on which session | anyone who can see the session (UI shows a count) |
| `rooms` / `room_members` / `room_set_logs` | group workout: routine text, members, each completed set | room members |
| `app_events` | event name, platform, app version, time, **`user_id` when signed in** | nobody via the API (insert-only) |
| `user_blocks`, `content_reports` (moderation work, landing separately) | who blocked/reported whom, what and why | **Verify** once merged |

Things worth knowing when answering questionnaires:

- **Following needs no approval.** Anyone with your invite code / link / QR
  can follow you (`follow_by_code`) and then read your shared workouts.
- **Rooms auto-follow.** When a room finishes, every pair of members
  mutually follows (`finish_room_when_done`).
- **"Share to feed" defaults to ON** at workout finish (remembered per device
  in `settings.shareToFeedDefault`). Consider defaulting it OFF for privacy
  by default (Ley 21.719 art. 14 quinquies) — it's a product decision.
- There's no public profile, no open user search, no DMs/chat, no comments,
  no photos/media uploads, no location. User-generated text = display name,
  bio, routine/session text incl. notes.
- Sign-up requires ticking the Terms + Privacy Policy checkbox
  (`ConsentNotice.vue`); account emails (confirmation, password reset) are
  sent by Supabase Auth.

### Account deletion (`supabase/functions/delete-account`)

Configuration → Account → Delete account calls the edge function, which
deletes the `auth.users` row; `on delete cascade` removes the profile,
routines, sessions (and so shared posts), kudos given and received, follows
in both directions, room memberships and set logs. The device copy is cleared.

Gaps (the policy discloses them; consider fixing):

- `rooms.host_id` is `on delete set null` — rooms you hosted keep their
  `routine_name` / `routine_wtt` for the other members.
- `app_events.user_id` is `on delete set null` — events stay, de-identified.
- Other people's `feed_snapshot.trainedWith` is a copy of display names —
  your name stays on their previously shared workouts.
- Supabase backups keep copies until they roll over (**Verify** plan: daily
  backups 7 days on Pro, PITR up to 28 days — the policy says "usually within
  30 days").
- Sentry keeps events per its plan retention (policy says up to 90 days —
  **Verify** the plan).
- No retention/purge job for `app_events`; the policy gives criteria, not a
  fixed period. A `pg_cron` purge (e.g. 24 months) would be a cheap upgrade.

A **web deletion URL** is required by Google Play for apps with accounts:
the policy tells people to email the contact address from their account
email if they can't use the app — use `https://<site>/privacy.html#en` (the
"Your choices: export and deletion" section) as the Play "Delete account URL",
or build a dedicated page. **Verify** Google accepts it at submission.

### Export (portability)

Configuration → Data → Export all data: `.zip` of `.wtt`/`.wts` plain-text
files (`src/lib/exportData.ts`) — routines + sessions from the device copy.
Profile/follows/kudos are not in it; the policy offers them by email.

### Crash reporting (`src/services/crashReporting.ts`)

`Sentry.init({ app, dsn, release, beforeSend })` with SDK defaults
(`@sentry/vue` 11): no Session Replay, no `setUser`, `sendDefaultPii` off,
tracing off. Default integrations still send error + stack trace, device/OS/
browser info, the current URL/route (routes can contain profile/session
UUIDs) and breadcrumbs (navigation, clicks, console, network request URLs).
IP address: not stored by default with `sendDefaultPii` off — **Verify** the
Sentry project's "Prevent storing of IP addresses" setting is on.

### Ads (`src/services/ads.ts`, `capacitor.config.ts`)

- Interstitial after finishing a session; native only.
- At launch: Google UMP consent (`requestConsentInfo` → `showConsentForm`
  when required, i.e. EEA/UK/CH), then **ATT prompt on iOS**
  (`requestTrackingAuthorization`), then `AdMob.initialize`.
- Because the ATT prompt is shown, Apple will expect "Data Used to Track You"
  to be declared (Device ID / advertising data) — if you declare no
  tracking, remove the ATT prompt instead. Don't do one without the other.
- **Missing:** a UMP "privacy options" entry point
  (`AdMob.showPrivacyOptionsForm`) so EEA/UK users can change their consent
  later — Google requires it when `privacyOptionsRequirementStatus` is
  REQUIRED. The policy currently only points to device settings.
- `initializeForTesting: true` and Google sample IDs until the release
  checklist in `README.md` is done. **Verify** personalized vs
  non-personalized serving in the AdMob console (and any "limited ads"
  behaviour) before filling the forms.
- AdMob data (per Google's disclosure): advertising ID (AAID/IDFA),
  IP → approximate location, device info, ad interactions, diagnostics.

### In-app purchases

The "Remove ads" purchase is being hidden until it's real (separate work).
**Do not declare IAP or "Purchase history"** until a purchase flow ships.

## Chile — Ley 21.719 (in force 1 Dec 2026)

Covered in the Privacy Policy: controller identity + contact (placeholders
`VITE_LEGAL_NAME` / `VITE_SUPPORT_EMAIL`), purposes, legal bases, categories
of data, recipients/third parties and international transfers, retention
criteria, rights (acceso, rectificación, supresión, oposición, portabilidad,
bloqueo, automated decisions) and how to exercise them (in-app + email, 30
days + one 30-day extension), complaint to the Agencia de Protección de
Datos Personales, security + breach notification, minors, changes.

Open points for the lawyer:

- Whether workout data (and free-text notes) could count as health data
  (sensitive data → express consent). The sign-up checkbox is the consent
  hook; the texts ask people not to write health details.
- Minimum age: texts say 16+ for accounts, not directed at under-13s.
- Whether an in-app "Privacy options" screen (ads consent, share default)
  is needed for "privacy by default".
- Registration of processing activities / security measures documentation.

## Google Play: Data safety

See `play-store/05-data-safety-worksheet.md`.

## Apple: App Privacy

See `app-store/06-app-privacy-worksheet.md`.

## Content rating / age rating

WTX now has **user-generated content and social features** (profiles with
bio, following, shared workouts visible to followers, kudos, live rooms) —
no chat, no media, no location. Apple guideline 1.2 therefore applies:
Terms forbidding objectionable content (done), a way to **report** content
and **block** users, **filtering**, acting on reports **within 24 hours**,
and published contact info (the moderation work + the legal pages). See
`app-store/05-category-age-rating.md` and
`play-store/04-category-tags-content-rating.md`.

## Sources

- [Google Play data disclosure for AdMob — Google for Developers](https://developers.google.com/admob/android/privacy/play-data-disclosure)
- [Provide information for Google Play's Data safety section — Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Content rating requirements for apps, games, and ads — Play Console Help](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en)
- [App Store Review Guidelines 1.2 (User-Generated Content), 5.1.1(v) (account deletion)](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- Ley 21.719 (modifies Ley 19.628) — full text on [BCN LeyChile](https://www.bcn.cl/leychile) (search "21.719")
