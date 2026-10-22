import data from './exerciseCatalog.json'

/** General muscle groups exercises are tagged with. See README.md. */
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Abs', 'Legs', 'Neck'] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/**
 * Equipment buckets exercises are tagged with, in chip order. Collapsed from
 * upstream's `equipment` field by `equipmentFor()` in
 * `scripts/sync-exercise-db.mjs`. See README.md.
 */
export const EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'Other',
] as const

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number]

/** One exercise from the vendored free-exercise-db catalog. See README.md. */
export interface ExerciseCatalogEntry {
  id: string
  /** Canonical English name — the stable identity used for storage/matching (see `findCatalogEntryByName`). */
  name: string
  /** Display-only Spanish name. Never used for storage/matching — see `useExerciseName`. */
  nameEs: string
  muscleGroup: MuscleGroup
  equipment: EquipmentType
  primaryMuscles: string[]
}

/** All vendored exercises, sorted by name. */
export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = data as ExerciseCatalogEntry[]

/** Lowercases and strips accents, so "maquina" finds "Máquina". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Words (English and Spanish, normalized) a query can start with to match a
 * muscle group or equipment bucket, so "piernas" or "mancuerna" surface every
 * exercise in that bucket, not just ones with the word in their name. Mirrors
 * the `wtx.muscleGroups` / `wtx.equipment` locale labels. Other has none:
 * "other" isn't something people type to find an exercise.
 */
const MUSCLE_GROUP_TERMS: Record<MuscleGroup, string[]> = {
  Chest: ['chest', 'pecho'],
  Back: ['back', 'espalda'],
  Shoulders: ['shoulders', 'hombros'],
  Arms: ['arms', 'brazos'],
  Abs: ['abs', 'abdomen', 'abdominales'],
  Legs: ['legs', 'piernas'],
  Neck: ['neck', 'cuello'],
}

const EQUIPMENT_TERMS: Record<EquipmentType, string[]> = {
  Barbell: ['barbell', 'barra'],
  Dumbbell: ['dumbbell', 'mancuerna'],
  Machine: ['machine', 'maquina'],
  Cable: ['cable', 'polea'],
  Bodyweight: ['bodyweight', 'peso corporal'],
  Kettlebell: ['kettlebell', 'pesa rusa'],
  Band: ['band', 'banda'],
  Other: [],
}

interface IndexedEntry {
  entry: ExerciseCatalogEntry
  name: string
  nameEs: string
  /** Muscle-group and equipment terms this entry matches by prefix. */
  tags: string[]
}

/** Normalized search strings, built once at module load rather than per keystroke. */
const SEARCH_INDEX: IndexedEntry[] = EXERCISE_CATALOG.map((entry) => ({
  entry,
  name: normalizeSearchText(entry.name),
  nameEs: normalizeSearchText(entry.nameEs),
  tags: [...MUSCLE_GROUP_TERMS[entry.muscleGroup], ...EQUIPMENT_TERMS[entry.equipment]],
}))

const EXACT_NAME_INDEX = new Map(
  EXERCISE_CATALOG.map((entry) => [entry.name.toLowerCase(), entry] as const),
)

export interface ExerciseFilter {
  query?: string
  muscleGroup?: MuscleGroup | null
  equipment?: EquipmentType | null
}

export interface ExerciseFilterResult {
  /** The first `limit` matches, ranked. */
  results: ExerciseCatalogEntry[]
  /** How many exercises match in total, before `limit`. */
  total: number
}

/**
 * Filters {@link EXERCISE_CATALOG} by text query, muscle group and equipment
 * — all combined with AND. The query matches case- and accent-insensitively
 * against the exercise name (English or Spanish), its muscle group and its
 * equipment (so "legs" surfaces every leg exercise, "cable" every cable one).
 * A name that starts with the query ranks first, then a muscle-group or
 * equipment match, then a name that merely contains it; ties keep the
 * catalog's alphabetical order.
 */
export function filterExerciseCatalog(
  { query = '', muscleGroup = null, equipment = null }: ExerciseFilter,
  limit = 50,
): ExerciseFilterResult {
  const needle = normalizeSearchText(query)

  const nameStartsWith: ExerciseCatalogEntry[] = []
  const tagMatch: ExerciseCatalogEntry[] = []
  const nameIncludes: ExerciseCatalogEntry[] = []
  for (const item of SEARCH_INDEX) {
    if (muscleGroup && item.entry.muscleGroup !== muscleGroup) continue
    if (equipment && item.entry.equipment !== equipment) continue
    if (!needle || item.name.startsWith(needle) || item.nameEs.startsWith(needle)) {
      nameStartsWith.push(item.entry)
    } else if (item.tags.some((tag) => tag.startsWith(needle))) {
      tagMatch.push(item.entry)
    } else if (item.name.includes(needle) || item.nameEs.includes(needle)) {
      nameIncludes.push(item.entry)
    }
  }

  const total = nameStartsWith.length + tagMatch.length + nameIncludes.length
  return { results: [...nameStartsWith, ...tagMatch, ...nameIncludes].slice(0, limit), total }
}

/**
 * Text-only search over {@link EXERCISE_CATALOG} — see
 * {@link filterExerciseCatalog} for matching and ranking. An empty query
 * returns the first `limit` entries alphabetically.
 */
export function searchExerciseCatalog(query: string, limit = 50): ExerciseCatalogEntry[] {
  return filterExerciseCatalog({ query }, limit).results
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
  return EXACT_NAME_INDEX.get(needle)
}
