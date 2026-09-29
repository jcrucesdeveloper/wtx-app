# App Store — App Privacy ("Nutrition Label") Worksheet

Fill this in App Store Connect → App Privacy. Full reasoning and code
references: `research/05-privacy-compliance-notes.md`. Apple rejects on
label/behavior mismatches more often than almost any other metadata field —
don't guess on the items marked **Verify**.

"Linked to you" = tied to the account (Supabase user id / email). "Tracking"
= combined with other companies' data for ads, or shared with a data broker.

## Data types to declare

| Data type | Collected? | Linked to you? | Tracking? | Purposes | Source |
|---|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality | Supabase Auth (accounts) |
| Contact Info → Name | Yes (display name — declare it; it's a name the user picks) | Yes | No | App Functionality | `profiles.display_name` |
| User Content → Other User Content | Yes (routines, workouts incl. notes, bio, shared workouts) | Yes | No | App Functionality | `routines`, `sessions`, `profiles.bio` |
| User Content → Customer Support / Other | Only if reports are stored with free text — **Verify** after moderation lands | Yes | No | App Functionality | `content_reports` |
| Identifiers → User ID | Yes | Yes | No | App Functionality, Analytics | Supabase user id (also on `app_events`) |
| Identifiers → Device ID (IDFA) | Yes, when the user allows tracking | No (not tied to the account by us) | **Yes** — ATT prompt is shown | Third-Party Advertising | AdMob |
| Usage Data → Product Interaction | Yes | Yes when signed in (`app_events.user_id`) | No | Analytics | `app_events` |
| Usage Data → Advertising Data | Yes | No | **Yes** | Third-Party Advertising | AdMob |
| Diagnostics → Crash Data | Yes (when `VITE_SENTRY_DSN` is set) | No (no `setUser`) | No | App Functionality | Sentry |
| Diagnostics → Other Diagnostic Data | Yes (breadcrumbs, device/OS) | No | No | App Functionality | Sentry |
| Location → Coarse Location | **Verify** — AdMob derives approximate location from IP | No | **Verify** (Yes if used for ad targeting) | Third-Party Advertising | AdMob |
| Health & Fitness → Fitness | **Verify with counsel** — workout logs are arguably "Fitness"; declaring it is the conservative answer | Yes | No | App Functionality | `sessions` |
| Purchases | **No** — purchase flow is hidden until it ships | — | — | — | — |
| Contacts, Photos, Audio, Browsing/Search History, Sensitive Info, Financial | No | — | — | — | Camera is used only to scan QR codes on-device |

## App Tracking Transparency (ATT)

The app **already shows the ATT prompt** on iOS (`src/services/ads.ts`,
`requestTrackingAuthorization`) before initializing AdMob.

- [ ] `NSUserTrackingUsageDescription` is present in `ios/App/App/Info.plist`
      with a clear, localized reason (**Verify**).
- [ ] Declare "Data Used to Track You": Device ID and Advertising Data (and
      Coarse Location if AdMob uses it for targeting) — consistent with
      showing the prompt. If you'd rather not track, remove the prompt and
      serve non-personalized ads only; never one without the other.
- [ ] The iOS privacy manifest (`PrivacyInfo.xcprivacy`, added separately)
      lists the same data types and tracking domains.

## Account deletion (guideline 5.1.1(v))

- In-app path: **Configuration → Account → Delete account** (type DELETE to
  confirm) — deletes the account and synced data server-side
  (`supabase/functions/delete-account`).
- [ ] Mention the path in App Review notes and give the reviewer a demo
      account (email + password) with a shared workout and a follower.

## Before you submit

- [ ] Privacy Policy URL live: `https://<site>/privacy.html` (App Store
      Connect → App Information). Terms/EULA: `https://<site>/terms.html`.
- [ ] `VITE_LEGAL_NAME` / `VITE_SUPPORT_EMAIL` set for the production build
      (they appear in both the app and the pages).
- [ ] Production AdMob config confirmed (personalized vs non-personalized,
      location targeting) — **Verify** rows above updated to match.
- [ ] Sentry "Prevent storing of IP addresses" on (**Verify**), or declare
      accordingly.
- [ ] Re-run this worksheet if an IAP/remove-ads flow ships.
- [ ] Cross-check against `play-store/05-data-safety-worksheet.md` — same
      binary, same story.
