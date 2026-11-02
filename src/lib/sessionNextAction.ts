import type { ActiveSession } from '@/stores/activeSession'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'
import { formatClock } from '@/lib/format'

/** The vue-i18n `t` subset this needs, so the projection stays pure and testable. */
export type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * What comes next in a session, decided in one place. The ongoing notification and
 * the watch both read it, so they can never disagree about the next set.
 *
 * - `set`: another set of `exercise`.
 * - `exercise`: `exercise` is the one to do next, starting at `set`.
 * - `done`: everything is logged.
 */
export type NextTarget =
  | { kind: 'set' | 'exercise'; exercise: SessionExerciseDraft; set: SessionSetDraft }
  | { kind: 'done' }

/** An exercise with at least one set, all of them logged. */
export function isDone(exercise: SessionExerciseDraft): boolean {
  return exercise.loggedSets.length > 0 && exercise.loggedSets.every((s) => s.completed)
}

/** Same rule as FocusSession: the first exercise with a set left, else the last one. */
export function currentExerciseIndex(exercises: SessionExerciseDraft[]): number {
  const open = exercises.findIndex((e) => !isDone(e))
  return open === -1 ? exercises.length - 1 : open
}

function firstOpenSet(exercise: SessionExerciseDraft | undefined): SessionSetDraft | undefined {
  return exercise?.loggedSets.find((s) => !s.completed)
}

/** Outside rest: the current exercise and the set to do next in it. */
export function nextWhileWorking(session: ActiveSession): NextTarget {
  const { exercises } = session.draft
  const exercise = exercises[currentExerciseIndex(exercises)]
  const set = firstOpenSet(exercise)
  return exercise && set ? { kind: 'set', exercise, set } : { kind: 'done' }
}

/**
 * While resting: the rested exercise's next set if it has one, else the next
 * exercise (and its first set), else that everything is logged.
 */
export function nextAfterRest(session: ActiveSession): NextTarget {
  const { exercises } = session.draft
  const rested =
    session.restExerciseIndex !== null ? exercises[session.restExerciseIndex] : undefined
  const sameExerciseSet = firstOpenSet(rested)
  if (rested && sameExerciseSet) return { kind: 'set', exercise: rested, set: sameExerciseSet }
  const upcoming = exercises[currentExerciseIndex(exercises)]
  const upcomingSet = firstOpenSet(upcoming)
  if (upcoming && upcomingSet) return { kind: 'exercise', exercise: upcoming, set: upcomingSet }
  return { kind: 'done' }
}

/** "Set 2 of 3" among working sets; warm-ups and drop sets are counted among their own kind. */
export function setPosition(
  exercise: SessionExerciseDraft,
  set: SessionSetDraft,
  t: Translate,
): string {
  const sameType = exercise.loggedSets.filter((s) => s.type === set.type)
  const n = sameType.indexOf(set) + 1
  if (set.type === 'number') return t('workout.setOf', { n, total: sameType.length })
  const type = t(`workout.setType.${set.type}`)
  return sameType.length > 1 ? t('workout.typedSetOf', { type, n, total: sameType.length }) : type
}

/** What the set will be logged as: typed value, else last time's, else the plan. */
export function setLoad(
  exercise: SessionExerciseDraft,
  set: SessionSetDraft,
  unit: string,
  t: Translate,
): string {
  const weight = set.weight ?? set.ghostWeight ?? exercise.weight
  const reps = set.reps ?? set.ghostReps ?? exercise.reps
  const amount = exercise.kind === 'time' ? formatClock(reps) : String(reps)
  if (!weight) return amount
  const w = unit ? `${weight} ${unit}` : String(weight)
  return t('sessionNotification.load', { weight: w, amount })
}

/**
 * "Set 3 of 4 · 80 kg × 8" for a set. A timed exercise is logged once, so it is
 * just its time: "1:30".
 */
export function setLine(
  exercise: SessionExerciseDraft,
  set: SessionSetDraft,
  unit: string,
  t: Translate,
): string {
  if (exercise.kind === 'time') return setLoad(exercise, set, unit, t)
  return t('sessionNotification.setLine', {
    position: setPosition(exercise, set, t),
    load: setLoad(exercise, set, unit, t),
  })
}

/** The set line of the exercise's next unlogged set, or `null` when it has none left. */
export function nextSetLine(
  exercise: SessionExerciseDraft,
  unit: string,
  t: Translate,
): string | null {
  const set = firstOpenSet(exercise)
  return set ? setLine(exercise, set, unit, t) : null
}

/** A next action as the watch shows it: separate parts, so the screen can lay them out. */
export interface NextActionView {
  kind: NextTarget['kind']
  /** Display name of the exercise; empty for `done`. */
  exercise: string
  /** "Set 2 of 3"; empty for `done` and for a timed exercise. */
  position: string
  /** "60 kg × 8" for reps, "1:30" for a timed exercise; empty for `done`. */
  load: string
}

export function describeNext(
  target: NextTarget,
  unit: string,
  t: Translate,
  exerciseName: (name: string) => string = (name) => name,
): NextActionView {
  if (target.kind === 'done') return { kind: 'done', exercise: '', position: '', load: '' }
  const { exercise, set } = target
  return {
    kind: target.kind,
    exercise: exerciseName(exercise.name),
    position: exercise.kind === 'time' ? '' : setPosition(exercise, set, t),
    load: setLoad(exercise, set, unit, t),
  }
}
