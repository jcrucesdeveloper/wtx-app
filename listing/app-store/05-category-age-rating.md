# App Store — Category & Age Rating

## Category

**Primary: Health & Fitness.** Apple allows a secondary category too;
**Productivity** is a defensible second choice given the actual mechanic
(plan/organize structured text data, no logging/tracking yet) — it also
puts WTX in front of the plain-text/tools-minded audience the differentiator
targets, per `research/01-aso-strategy.md`.

## Age rating (Apple's age-rating questionnaire, post-2026 revision uses
expanded age bands: 4+, 9+, 13+, 16+, 18+)

Expected outcome given the actual app: **4+**, since WTX has:

- No user-generated content visible to other users
- No chat/messaging/social features
- No simulated gambling, violence, or mature/suggestive themes
- No unrestricted web access
- **Contains ads** — declare truthfully in App Store Connect's age-rating
  and app-information sections; doesn't raise the rating band on its own for
  a non-targeted, standard ad SDK

Answer Apple's actual questionnaire honestly at submission time — this is a
sanity-check prediction, not a substitute for it.

## In-App Purchases declaration

**None to declare yet.** No purchase flow exists in the codebase (see
top-level `README.md` and `research/05-privacy-compliance-notes.md`). Update
this page and the App Privacy label together once an actual "remove ads"
IAP ships.
