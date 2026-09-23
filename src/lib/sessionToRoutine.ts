import type { WorkoutTemplate } from '@/lib/wtx'
import type { SessionDraft, SessionExerciseDraft } from '@/lib/serializeSession'
import {
  templateExerciseToDraft,
  type RoutineDraft,
  type RoutineDraftExercise,
} from '@/lib/serializeRoutine'

function normalizedName(name: string): string {
  return name.trim().toLowerCase()
}

/** Sorted lowercase name list — order-insensitive, so pure reordering isn't a "diff". */
function nameMultiset(names: string[]): string[] {
  return names.map(normalizedName).sort()
}

/**
 * True if the session's exercises were structurally edited (added/removed/renamed)
 * relative to the routine it was started from. Reordering, and set/rep/weight
 * edits made while logging, are not a "diff" — only membership changes are.
 */
export function sessionDiffersFromRoutine(draft: SessionDraft, template: WorkoutTemplate): boolean {
  const sessionNames = nameMultiset(draft.exercises.map((e) => e.name))
  const templateNames = nameMultiset(template.exercises.map((e) => e.name))
  if (sessionNames.length !== templateNames.length) return true
  return sessionNames.some((name, i) => name !== templateNames[i])
}

/** Builds a fresh routine exercise row for one added mid-session, from its logged draft. */
function sessionExerciseToDraft(exercise: SessionExerciseDraft): RoutineDraftExercise {
  return {
    name: exercise.name,
    kind: exercise.kind,
    sets: exercise.sets,
    reps: exercise.kind === 'reps' ? exercise.reps : 10,
    durationSeconds: exercise.kind === 'time' ? exercise.reps : 60,
    weight: exercise.weight || undefined,
    restSeconds: exercise.restSeconds,
  }
}

/**
 * Builds the {@link RoutineDraft} to save when the user chooses to sync a
 * routine to a session that diverged from it. Exercises follow the session's
 * current order; any exercise still present in the original template keeps
 * its original prescription (weight/rest/muscle group/per-set overrides) so
 * mid-workout logging never silently overwrites the routine's planned
 * numbers — only newly added exercises get fresh defaults from the session.
 */
export function routineDraftFromSession(
  draft: SessionDraft,
  template: WorkoutTemplate,
  name?: string,
): RoutineDraft {
  const originalByName = new Map(
    template.exercises.map((exercise) => [normalizedName(exercise.name), exercise]),
  )

  const exercises = draft.exercises.map((exercise) => {
    const original = originalByName.get(normalizedName(exercise.name))
    return original ? templateExerciseToDraft(original) : sessionExerciseToDraft(exercise)
  })

  return {
    name: name ?? template.name,
    unit: draft.unit ?? template.unit ?? 'kg',
    notes: template.notes ?? '',
    tags: [...template.tags],
    exercises,
  }
}
