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
`images` is the notable one: exercise matching is text-only for now, so the
upstream images aren't vendored. Re-run the sync script once image support
is built to see what else is needed from upstream.

## Re-syncing

Run `pnpm sync:exercises` (see `scripts/sync-exercise-db.mjs`). It pulls
`dist/exercises.json` at the pinned ref, re-applies the trim, and rewrites
`exerciseCatalog.json`. Review the diff and bump the commit hash above.
