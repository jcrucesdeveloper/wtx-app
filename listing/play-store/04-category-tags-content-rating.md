# Google Play — Category, Tags & Content Rating

Answers for **1.0.0 as it ships: ads off, accounts optional, social on.**
Re-check every "Ads" line in the release that sets `VITE_ADS_ENABLED=true`.

## Category (Store settings → App category)

- **App or game:** App
- **Category: Health & Fitness.** Where the competitive set (Hevy, Strong,
  FitNotes) lives, which matters for "similar apps" surfaces, not just search.
- **Tags (up to 5):** pick the closest from the live list, e.g. Workout
  tracker, Gym, Strength training, Workout planner, Fitness. The taxonomy
  changes and isn't published as a fixed list.

## Content rating (App content → Content ratings → IARC questionnaire)

- **Category:** All other app types
- **Email for IARC:** `jcrucesdeveloper@gmail.com`

| Question | Answer | Why |
|---|---|---|
| Violence, blood, sexuality, nudity, language, drugs, alcohol, tobacco, gambling, crude humour, horror | **No** to all | None in the app's own content |
| Can users interact or exchange content with each other? | **Yes** | Followers feed with shared workouts (free-text names and notes), bios, kudos, live group workouts with cheers |
| Does the app share the user's current physical location with other users? | **No** | |
| Does the app allow users to purchase digital goods? | **No** | No in-app purchases in 1.0.0 |
| Does the app contain ads? | **No** | 1.0.0 ships with ads off |
| Is the app a web browser or search engine? | **No** | |
| Does the app contain any of the restricted content listed (gambling, etc.)? | **No** | |

Expected outcome: Everyone / PEGI 3 or close, with the **"Users Interact"**
element on the listing. Interaction is a descriptor, not a higher tier. Let
the questionnaire decide; this is a sanity check.

## Target audience (App content → Target audience and content)

- **Age groups:** **16–17** and **18 and over** only. This matches the Terms
  and the sign-up check ("I'm 16 or older"). Selecting any under-13 group
  pulls WTX into the Families policy.
- **Could your store listing unintentionally appeal to children?** **No.**
  The icon, screenshots and copy are about gym training.

## User-generated content (Play's UGC policy)

Play expects, for apps with UGC: terms that ban objectionable content, in-app
reporting of content and users, blocking, and acting on reports in a timely
way. All are in 1.0.0:

- Terms prohibit objectionable content (`legal.terms`).
- Report a post or an account: the ⋯ menu on a profile or a shared workout.
- Block and unblock: the same menus; a Blocked accounts list under your
  profile.
- A word filter on names, bios and shared workouts.
- Reports are reviewed within 24 hours (README → Moderation).
