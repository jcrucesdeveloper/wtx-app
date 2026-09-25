import data from './exerciseCatalog.json'

/** General muscle groups exercises are tagged with. See README.md. */
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Abs', 'Legs', 'Neck'] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/** One exercise from the vendored free-exercise-db catalog. See README.md. */
export interface ExerciseCatalogEntry {
  id: string
  /** Canonical English name — the stable identity used for storage/matching (see `findCatalogEntryByName`). */
  name: string
  /** Display-only Spanish name. Never used for storage/matching — see `useExerciseName`. */
  nameEs: string
  muscleGroup: MuscleGroup
  primaryMuscles: string[]
}

/** All vendored exercises, sorted by name. */
export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = data as ExerciseCatalogEntry[]

/**
 * Case-insensitive search over {@link EXERCISE_CATALOG}, matching the
 * exercise name (English or Spanish) and its muscle group (so "legs" or
 * "piernas" surfaces every leg exercise, not just ones with that word in the
 * name). A name that starts with `query` ranks first, then a muscle-group
 * match, then a name that merely contains `query`; ties keep the catalog's
 * alphabetical order. An empty query returns the first `limit` entries
 * alphabetically.
 */
export function searchExerciseCatalog(query: string, limit = 50): ExerciseCatalogEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return EXERCISE_CATALOG.slice(0, limit)

  const nameStartsWith: ExerciseCatalogEntry[] = []
  const groupMatch: ExerciseCatalogEntry[] = []
  const nameIncludes: ExerciseCatalogEntry[] = []
  for (const entry of EXERCISE_CATALOG) {
    const name = entry.name.toLowerCase()
    const nameEs = entry.nameEs.toLowerCase()
    if (name.startsWith(needle) || nameEs.startsWith(needle)) nameStartsWith.push(entry)
    else if (entry.muscleGroup.toLowerCase().startsWith(needle)) groupMatch.push(entry)
    else if (name.includes(needle) || nameEs.includes(needle)) nameIncludes.push(entry)
  }

  return [...nameStartsWith, ...groupMatch, ...nameIncludes].slice(0, limit)
}

/**
 * Exact (case-insensitive) name lookup, for resolving a routine/session
 * exercise's free-text name to its catalog entry — e.g. to build an image
 * URL. Unlike {@link searchExerciseCatalog}, this never fuzzy-matches: a
 * custom exercise name with no exact catalog match simply has no entry
 * (and so no image), rather than risking showing the wrong exercise's image.
 */
export function findCatalogEntryByName(name: string): ExerciseCatalogEntry | undefined {
  const needle = name.trim().toLowerCase()
  if (!needle) return undefined
  return EXERCISE_CATALOG.find((entry) => entry.name.toLowerCase() === needle)
}
