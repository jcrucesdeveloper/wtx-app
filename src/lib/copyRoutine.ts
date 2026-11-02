import { parseTemplateText } from '@/lib/parseRoutine'
import {
  draftFromTemplate,
  serializeTemplate,
  type RoutineDraft,
  type RoutineDraftExercise,
} from '@/lib/serializeRoutine'
import { isTimeExercise } from '@/lib/sessionTime'
import { ROUTINE_FILENAME_MAX } from '@/lib/supabase/limits'
import type { SharedRoutine } from '@/lib/feedSnapshot'
import type { WorkoutSession } from '@/lib/wtx'

const EXTENSION = '.wtt'

/** Characters, not UTF-16 units — what Postgres' char_length counts, and never half an emoji. */
function chars(text: string): string[] {
  return Array.from(text)
}

/**
 * The copy's name: `<name><suffix>` (the suffix is the localized
 * " (from @friend)"), short enough that `<name>.wtt` fits
 * ROUTINE_FILENAME_MAX. The base name gives way first so the suffix stays
 * whole; only a suffix too long on its own gets cut.
 */
export function copiedRoutineName(name: string, suffix: string, max = ROUTINE_FILENAME_MAX): string {
  const room = max - EXTENSION.length
  const base = chars(name.trim().replace(/\s+/g, ' ') || 'Routine')
  const tail = chars(suffix.replace(/\s+/g, ' '))
  if (tail.length >= room) return tail.slice(0, room).join('').trim()
  return base.slice(0, room - tail.length).join('').trimEnd() + tail.join('')
}

/** The file name a copy is stored under. */
export function copiedRoutineFilename(name: string): string {
  return `${name}${EXTENSION}`
}

/**
 * A routine rebuilt from a logged workout, for a post that carries no
 * routine: each exercise with as many working sets as were done, the reps
 * and weight of the top set. Rest times aren't in a `.wts`, so there are none.
 */
export function routineDraftFromLoggedSession(session: WorkoutSession): RoutineDraft {
  const exercises = session.exercises.map((exercise): RoutineDraftExercise => {
    const top = exercise.topSet
    if (isTimeExercise(exercise.note)) {
      return {
        name: exercise.name,
        kind: 'time',
        sets: 1,
        reps: 10,
        durationSeconds: top?.reps || exercise.reps || 60,
        weight: top?.weight || undefined,
      }
    }
    return {
      name: exercise.name,
      kind: 'reps',
      sets: exercise.workingSets.length || exercise.sets || 3,
      reps: top?.reps || exercise.reps || 10,
      durationSeconds: 60,
      weight: top?.weight ?? (exercise.weight || undefined),
    }
  })
  return {
    name: session.name,
    unit: session.unit ?? 'kg',
    notes: '',
    tags: [],
    exercises,
  }
}

export interface RoutineCopy {
  /** The new routine's `.wtt` text, renamed. */
  rawText: string
  filename: string
  name: string
  /** The section the friend filed it under, to file the copy under one of the same name. */
  sectionName?: string
  /** False when it was rebuilt from the logged workout, which has no rest times. */
  fromRoutine: boolean
}

/**
 * The routine to save from a friend's post: the routine they followed when
 * the post carries it (rest times, per-set plan, section and all), else one
 * rebuilt from what they logged. Named `<name><suffix>`; see {@link copiedRoutineName}.
 */
export function routineCopyFromPost(
  post: { session: WorkoutSession; snapshot: { routine?: SharedRoutine } | null },
  suffix: string,
): RoutineCopy {
  const shared = post.snapshot?.routine
  const parsed = shared ? parseTemplateText(shared.wtt) : undefined
  const fromRoutine = parsed?.ok === true
  const draft = parsed?.ok ? draftFromTemplate(parsed.template) : routineDraftFromLoggedSession(post.session)

  const name = copiedRoutineName(draft.name, suffix)
  const rawText = serializeTemplate({ ...draft, name })
  return {
    rawText,
    filename: copiedRoutineFilename(name),
    name,
    ...(fromRoutine && shared?.section ? { sectionName: shared.section } : {}),
    fromRoutine,
  }
}

/**
 * Whether the library has room for one more routine.
 *
 * TODO(routine-limit): workstream H is adding a per-user routine cap
 * (`ROUTINE_MAX` or similar in src/lib/supabase/limits.ts). Wire it here at
 * merge — `return count < ROUTINE_MAX` — and the "Save to my library" action
 * already shows `social.copyRoutine.limitReached` when this returns false.
 */
export function canCreateRoutine(count: number): boolean {
  void count
  return true
}
