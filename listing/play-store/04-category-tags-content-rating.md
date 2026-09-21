# Google Play — Category, Tags & Content Rating

## Category

**Primary: Health & Fitness.** This is the closest fit and where the
competitive set (FitNotes, Hevy, Strong) lives — matters for "similar apps"
discovery surfaces, not just search.

Play Console also lets you add up to 5 descriptive **tags** on top of the
category (surfaced in "related search" and category-browse pages, separate
from the category itself). Reasonable picks given the actual feature set:

- Workout Planner
- Fitness Tracking → skip this one; WTX doesn't log completed sessions yet
  (see `research/01-aso-strategy.md` word-avoid list). Prefer "Workout
  Planner" / "Exercise" style tags over "Tracking".

Pick the exact tag set from whatever list Play Console currently offers at
submission time — the available tag taxonomy changes periodically and isn't
independently listed in Google's public docs, so choose from the live
dropdown at submission rather than hardcoding tag names here.

## Content rating (IARC questionnaire)

Expected outcome given the actual app: **lowest tier (Everyone / ESRB E /
PEGI 3)**, since WTX has:

- No user-generated content visible to others
- No chat/messaging/social interaction
- No simulated gambling, violence, or mature themes
- No location sharing
- **Contains ads** — declare this truthfully; it doesn't raise the age
  rating on its own but does add the "Contains ads" store label
- No in-app purchases (yet) — do not declare IAP until the purchase flow for
  ad removal actually exists (see top-level `README.md`)

Answer the actual IARC questionnaire honestly at submission time; this is a
prediction to sanity-check against, not a substitute for filling it out.
