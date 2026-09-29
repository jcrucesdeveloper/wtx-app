# Google Play — Category, Tags & Content Rating

## Category

**Primary: Health & Fitness.** This is the closest fit and where the
competitive set (FitNotes, Hevy, Strong) lives — matters for "similar apps"
discovery surfaces, not just search.

Play Console also lets you add up to 5 descriptive **tags** on top of the
category. Reasonable picks given the current feature set (routines, workout
logging, social feed, group workouts): Workout Planner, Workout Tracker /
Gym Log, Strength Training, Fitness Social / Training Partners — pick the
closest options from the live dropdown at submission time; the taxonomy
changes and isn't published as a fixed list.

## Content rating (IARC questionnaire)

WTX now has social features, so answer these honestly:

| IARC question | Answer | Notes |
|---|---|---|
| Violence, sexuality, language, controlled substances, gambling, crude humor | No | None in the app's own content |
| Can users interact or exchange content with each other? | **Yes** | Following, shared workouts visible to followers (incl. free-text notes and bios), kudos, live group workouts |
| Does the app share the user's current physical location with others? | No | |
| Can users purchase digital goods? | No | "Remove ads" is hidden until it ships |
| Does the app contain ads? | Yes | AdMob (declared separately under App content → Ads) |
| Unrestricted internet / web browser | No | |

Expected outcome: a low age rating (Everyone / PEGI 3 or so) with the
**"Users Interact"** interactive element shown on the listing — IARC rates
the content, and user interaction is a descriptor, not a higher tier. Let the
questionnaire decide; this is a sanity check.

## Target audience (App content → Target audience and content)

**16 and over** (matches the Terms: accounts 16+, not directed at under-13s).
Selecting any under-13 group pulls WTX into the Families policy (certified
ad SDKs only, no personalized ads, more review). Answer "No" to "Could your
app unintentionally appeal to children?" only if the store listing,
screenshots and icon are clearly aimed at adults.

## UGC moderation (Play's User Generated Content policy)

Play requires, for apps with UGC: terms that prohibit objectionable content
(done — `legal.terms`), in-app reporting of content and users, blocking, and
acting on reports in a timely way. These land with the moderation work
(report/block, content filter, reports reviewed within 24 hours) — confirm
they're in the build you submit.
