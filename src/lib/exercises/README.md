# Vendored exercise catalog

`exerciseCatalog.json` is generated from
[`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db)
(`dist/exercises.json`), released under the Unlicense (public domain).

**Upstream commit:** `a859101d633a01c4a1a920d6a8ce41dabba0705f` (2026-08-30)

## Trimming from upstream

Each of the 876 upstream entries is trimmed to `{ id, name, nameEs,
muscleGroup, equipment, primaryMuscles }` (plus `defaultKind` for timed
groups, see below) and sorted by `name`. `category` (upstream's exercise
style — `strength`, `powerlifting`, `strongman`, `cardio`, `stretching`, ...)
is dropped from the output: it's not what people search by. `muscleGroup`
isn't from upstream at all:

- Upstream's `cardio` (14) and `stretching` (123) categories become the
  **Cardio** and **Stretching** groups (`MUSCLE_GROUP_BY_CATEGORY` in
  `scripts/exercise-overlay.mjs`). A treadmill run or a hamstring stretch is
  found by what it is, not by the muscle it works most.
- Everything else is derived from `primaryMuscles` by collapsing its 17
  specific values (e.g. `quadriceps`, `lats`, `traps`) down to 7 general
  groups (Chest, Back, Shoulders, Arms, Abs, Legs, Neck) via the
  `MUSCLE_GROUP_BY_MUSCLE` table in `scripts/sync-exercise-db.mjs`, which
  throws if it meets an upstream muscle it doesn't recognize.

Other dropped fields — `force`, `level`, `mechanic`, `secondaryMuscles`,
`instructions`, `images` — aren't used yet.

Entries in Cardio and Stretching carry `defaultKind: "time"`: added to a
workout in progress (`activeSession.addExercise`), they're tracked by time
instead of weight × reps. Routines written in the editor still choose the
kind themselves (`time 10m` in the routine text).

## Overlay (exercises WTX adds)

`scripts/exercise-overlay.mjs` holds what upstream doesn't have, merged in by
the sync so a re-sync never loses it: the category → group table above and
`CUSTOM_EXERCISES`, 14 entries for warm-ups (Warm-Up, Jumping Jacks, High
Knees, Leg Swings), sports (Soccer, Basketball, Tennis, Padel, Volleyball,
Swimming, Running, Boxing, Hiking) and a plain Treadmill. Their ids start with
`WTX_` (the sync throws on a clash with an upstream id) and each carries a
hand-written `nameEs`. Upstream already covers Arm Circles, Bicycling (outdoor
cycling), Rope Jumping, Trail Running/Walking and the treadmill, bike, rower,
elliptical and stair machines, so those aren't duplicated.

## Equipment buckets

`equipment` is derived from upstream's `equipment` by `equipmentFor()` in
`scripts/sync-exercise-db.mjs`, collapsing its 12 values (plus null) into
the 8 buckets the exercise picker filters by: Barbell, Dumbbell, Machine,
Cable, Bodyweight, Kettlebell, Band, Other. The split follows what gym apps
filter by (Hevy: barbell, dumbbell, kettlebell, machine, plate, resistance
band, suspension, none; JEFIT: barbell, dumbbell, machine, cable, band,
bodyweight), trimmed to what this catalog has enough of to be worth a chip:

- `e-z curl bar` and a trap bar count as Barbell; anything with "Smith" in
  its name is Machine (upstream tags one Smith lift `barbell`).
- `medicine ball`, `exercise ball`, `foam roll`, plates, sleds and strongman
  implements are Other — too few each for a chip of their own.
- Upstream's `other` and null (~200 entries, mostly pull-ups, dips, jumps and
  stretches) are resolved by name rules (`EQUIPMENT_BY_NAME`); whatever no
  rule claims is Bodyweight.

The sync throws on an upstream equipment value it doesn't recognize.

`images` is handled separately from this catalog — see "Exercise images"
below.

A handful of upstream names also carry a competition-discipline suffix
(e.g. `"Bench Press - Powerlifting"`) — same reasoning as dropping
`category`, exercises shouldn't be tied to a sport. `cleanName()` in
`scripts/sync-exercise-db.mjs` strips a trailing `- Powerlifting` /
`- Strongman` / `- Olympic Weightlifting` / `- Weightlifting` / `- CrossFit`
and the sync throws if that ever produces a duplicate name.

## Friendlier names

Upstream's equipment tagging is inconsistent (`Bench Press`, `Dumbbell Bench
Press`, `Machine Bench Press`, `Smith Machine Bench Press` all name the same
movement differently) and a chunk of names are more clinical than a personal
workout tracker needs (e.g. `Standing Bent-Over One-Arm Dumbbell Triceps
Extension`). `NAME_OVERRIDES` in `scripts/sync-exercise-db.mjs`, keyed by the
upstream `id` (stable across renames — see "Exercise images" below), retags
these to a `Base Movement (Equipment)` convention — equipment as a
parenthetical suffix rather than a prefix, so variants of the same movement
sort together; the bare name is reserved for the default/most common
implementation (e.g. barbell for `Bench Press`, `Squat`). Applied in
`friendlyName()`, right after `cleanName()`, so it survives every re-sync
instead of needing hand-editing on the generated JSON.

## Spanish names (`nameEs`)

Every entry also carries a `nameEs` — a **display-only** Spanish name, shown
via `useExerciseName()` (`src/composables/useExerciseName.ts`) when the app
locale is `es`. `id` and `name` stay the stable English identity used for
storage and matching (`findCatalogEntryByName`) everywhere else in the app
(routines/sessions/templates store `name` as free text); `nameEs` never
affects that.

`nameEs` is generated in `scripts/sync-exercise-db.mjs`, layered like
`friendlyName()`:

1. `BASE_PHRASE_ES` — hand-picked, natural Spanish for the common/important
   base phrases (equipment tag stripped), so one entry covers every equipment
   variant of a movement (`"Bench Press"` covers `Bench Press (Dumbbell)`,
   `Bench Press (Machine)`, etc.).
2. `NAME_OVERRIDES_ES` — whole-name Spanish for idiomatic exercises that don't
   decompose word-by-word (`Mountain Climbers`, `Good Morning`, ...).
3. A compositional fallback for everything else: translates a trailing
   `(Equipment)` tag via `EQUIPMENT_ES`, then the base phrase via greedy
   multi-word phrase matching before falling back to word-by-word
   substitution, reordering so a trailing movement noun leads (Spanish
   noun-first order). An unrecognized word passes through unchanged rather
   than breaking the whole name. The sync throws if any entry ends up with an
   empty `nameEs`.

This gives full coverage across all 876 upstream entries (the 14 WTX
entries have hand-written `nameEs` in the overlay); the long tail of rarer
exercises gets correct terminology via the compositional engine but isn't
individually proofread the way the curated common lifts are.

## Re-syncing

Run `pnpm sync:exercises` (see `scripts/sync-exercise-db.mjs`). It pulls
`dist/exercises.json` at the pinned ref, re-applies the trim, merges the
overlay (`scripts/exercise-overlay.mjs`), and rewrites `exerciseCatalog.json`
(890 entries: 876 upstream + 14 WTX). Review the diff and bump the commit hash above.

## Exercise images

Images are never bundled into the app or vendored into this repo — they're
fetched on demand from a jsDelivr CDN and persisted on-device only once an
exercise is actually used (see `src/lib/exercises/imageCache.ts` and
`src/config/exerciseImages.ts`).

They're served from
[`jcrucesdeveloper/free-exercise-db`](https://github.com/jcrucesdeveloper/free-exercise-db),
a fork of upstream with every `exercises/<id>/{0,1}.jpg` resized to 480px
wide and converted to WebP (`scripts/optimize-images.sh` in that repo),
cutting the image payload from ~122MB to ~34MB. The CDN URL is pinned to
the fork's `wtx-v1` tag (`EXERCISE_IMAGES_REF` in
`src/config/exerciseImages.ts`) so images never change under us
unexpectedly — bump it deliberately, same as this file's upstream commit.

Upstream's per-exercise folder names already match this catalog's `id`
field exactly (verified at fork time), so image URLs are built directly
from `id` with no separate mapping. Of the 876 upstream entries, 3 have no
upstream images at all (`Kettlebell_Halo`,
`Kettlebell_Halo_With_Overhead_Extension`,
`Kettlebell_Overhead_Triceps_Extension`) — the UI treats a missing image as
an expected, silent case, not an error.

### Images for the WTX exercises

The `WTX_` entries have no upstream images. Their frame-0 images come from
Wikimedia Commons, **public domain or CC0 only** (no attribution required;
recorded anyway), picked so that no identifiable person is shown (equipment,
venues, or people seen from behind). Each was resized to 480px and encoded
to WebP the same way as the fork's `scripts/optimize-images.sh`, and committed
to the fork as `exercises/<id>/0.webp` with a `WTX_IMAGES.md` credits file.
They're served from the fork's `wtx-v2` tag (`CUSTOM_EXERCISE_IMAGES_REF` in
`src/config/exerciseImages.ts`), so the upstream images stay pinned at
`wtx-v1`. Until `wtx-v2` is pushed and tagged they don't load, which the UI
treats like any exercise without an image. The same sources live in
`imageSource` on each entry (`scripts/exercise-overlay.mjs`), and a unit test
checks every one is public domain or CC0.

| Exercise id | Source | License | Author |
| --- | --- | --- | --- |
| `WTX_Soccer` | [60th LRS finishes intramural soccer season strong 5811245.jpg](https://commons.wikimedia.org/wiki/File:60th_LRS_finishes_intramural_soccer_season_strong_5811245.jpg) | Public domain | Tech. Sgt. David W. Carbajal |
| `WTX_Basketball` | [Basketball through hoop.jpg](https://commons.wikimedia.org/wiki/File:Basketball_through_hoop.jpg) | Public domain | Airman 1st Class Kerelin Molina |
| `WTX_Tennis` | [Closeup of a tennis ball (2).jpg](https://commons.wikimedia.org/wiki/File:Closeup_of_a_tennis_ball_(2).jpg) | CC0 | Miscellaneous contributor |
| `WTX_Padel` | [Padel court.jpg](https://commons.wikimedia.org/wiki/File:Padel_court.jpg) | CC0 | Samson Ssemakadde |
| `WTX_Volleyball` | [Beach volleyball ball.jpg](https://commons.wikimedia.org/wiki/File:Beach_volleyball_ball.jpg) | Public domain | Thue |
| `WTX_Swimming` | [Swimming laps (Unsplash rAyIvNqlwCY).jpg](https://commons.wikimedia.org/wiki/File:Swimming_laps_(Unsplash_rAyIvNqlwCY).jpg) | CC0 | Artem Verbo artemverbo |
| `WTX_Running` | [Spikes shoes.jpg](https://commons.wikimedia.org/wiki/File:Spikes_shoes.jpg) | CC0 | Defeder |
| `WTX_Boxing` | [Black boxing gloves.jpg](https://commons.wikimedia.org/wiki/File:Black_boxing_gloves.jpg) | Public domain | Airman 1st Class Kerelin Molina |
| `WTX_Hiking` | [California Riding & Hiking Trail- Covington Region (52583010187).jpg](https://commons.wikimedia.org/wiki/File:California_Riding_%26_Hiking_Trail-_Covington_Region_(52583010187).jpg) | Public domain | Joshua Tree National Park |
| `WTX_Treadmill` | [Treadmills at gym.jpg](https://commons.wikimedia.org/wiki/File:Treadmills_at_gym.jpg) | Public domain | U.S. Air Force Photo/Staff Sgt Araceli Alarcon |

Warm-Up, Jumping Jacks, High Knees and Leg Swings have no image: every public
domain/CC0 photo found showed identifiable faces.

