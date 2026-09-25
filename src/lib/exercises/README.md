# Vendored exercise catalog

`exerciseCatalog.json` is generated from
[`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db)
(`dist/exercises.json`), released under the Unlicense (public domain).

**Upstream commit:** `a859101d633a01c4a1a920d6a8ce41dabba0705f` (2026-08-30)

## Trimming from upstream

Each of the 876 entries is trimmed to `{ id, name, muscleGroup,
primaryMuscles }` and sorted by `name`. `category` (upstream's exercise
style — `strength`, `powerlifting`, `strongman`, ...) is dropped: it's not
what people search by. `muscleGroup` isn't from upstream at all — it's
derived from `primaryMuscles` by collapsing its 17 specific values (e.g.
`quadriceps`, `lats`, `traps`) down to 7 general groups (Chest, Back,
Shoulders, Arms, Abs, Legs, Neck) via the `MUSCLE_GROUP_BY_MUSCLE` table in
`scripts/sync-exercise-db.mjs`, which throws if it meets an upstream muscle
it doesn't recognize. Other dropped fields — `force`, `level`, `mechanic`,
`secondaryMuscles`, `instructions`, `equipment`, `images` — aren't used yet.

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

This gives full coverage across all 876 entries; the long tail of rarer
exercises gets correct terminology via the compositional engine but isn't
individually proofread the way the curated common lifts are.

## Re-syncing

Run `pnpm sync:exercises` (see `scripts/sync-exercise-db.mjs`). It pulls
`dist/exercises.json` at the pinned ref, re-applies the trim, and rewrites
`exerciseCatalog.json`. Review the diff and bump the commit hash above.

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
from `id` with no separate mapping. Of the 876 catalog entries, 3 have no
upstream images at all (`Kettlebell_Halo`,
`Kettlebell_Halo_With_Overhead_Extension`,
`Kettlebell_Overhead_Triceps_Extension`) — the UI treats a missing image as
an expected, silent case, not an error.
