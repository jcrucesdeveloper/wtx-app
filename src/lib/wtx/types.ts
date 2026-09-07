/** Rep- or time-based prescription for a template exercise. */
export type ExerciseType =
  { kind: 'reps'; sets: number; reps: number } | { kind: 'time'; seconds: number }

/** One raw exercise line from a `.wtt` template. */
export interface TemplateExercise {
  name: string
  type: ExerciseType
  weight?: number
  restSeconds?: number
  muscleGroup?: string
}

/** Raw parse result for a `.wtt` template file. */
export interface Template {
  name: string
  unit?: string
  /** `description:` metadata line. */
  description?: string
  /** `notes:` metadata line (alias/companion of `description`). */
  notes?: string
  /** `tags:` metadata line, split on commas. */
  tags?: string[]
  exercises: TemplateExercise[]
}

/** One logged set following a session exercise line. */
export interface SessionSet {
  label: string // "W" for warm-up, "1", "2", ... for working sets
  weight: number
  reps: number
}

/** One raw exercise line from a `.wts` session, with its logged sets. */
export interface SessionExercise {
  name: string
  sets: number
  reps: number
  weight: number
  note?: string
  loggedSets: SessionSet[]
}

/** Raw parse result for a `.wts` session file. */
export interface Session {
  name: string
  date: string
  /** `template:` metadata line — the `.wtt` file this session followed. */
  template?: string
  unit?: string
  /** `description:` metadata line. */
  description?: string
  /** `notes:` metadata line (alias/companion of `description`). */
  notes?: string
  exercises: SessionExercise[]
}
