import type { ActiveSession } from '@/stores/activeSession'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'
import { formatClock } from '@/lib/format'

/** The vue-i18n `t` subset this needs, so the builder stays pure and testable. */
export type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * One state of the ongoing workout notification. The native side draws the
 * clock (rest countdown or workout time) big, with these lines around it:
 * `title` above, `body` under it, `detail` under that when expanded.
 */
export interface NotificationFace {
  title: string
  body: string
  /** A quieter third line; empty for none. */
  detail: string
}

/** What the native side needs to draw the ongoing notification. */
export interface SessionNotificationContent extends NotificationFace {
  /** Workout start, for the count-up clock shown outside rest. */
  startedAt: number
  /** Rest deadline (epoch ms) for a native countdown; `null` when not resting. */
  restEndsAt: number | null
  /** What to switch to when the rest ends, so it changes without JS running. */
  afterRest: NotificationFace | null
}

function isDone(exercise: SessionExerciseDraft): boolean {
  return exercise.loggedSets.length > 0 && exercise.loggedSets.every((s) => s.completed)
}

/** Same rule as FocusSession: the first exercise with a set left, else the last one. */
function currentExerciseIndex(exercises: SessionExerciseDraft[]): number {
  const open = exercises.findIndex((e) => !isDone(e))
  return open === -1 ? exercises.length - 1 : open
}

/** "Set 2 of 3" among working sets; warm-ups and drop sets are counted among their own kind. */
function setPosition(exercise: SessionExerciseDraft, set: SessionSetDraft, t: Translate): string {
  const sameType = exercise.loggedSets.filter((s) => s.type === set.type)
  const n = sameType.indexOf(set) + 1
  if (set.type === 'number') return t('workout.setOf', { n, total: sameType.length })
  const type = t(`workout.setType.${set.type}`)
  return sameType.length > 1 ? t('workout.typedSetOf', { type, n, total: sameType.length }) : type
}

/** What the set will be logged as: typed value, else last time's, else the plan. */
function setLoad(exercise: SessionExerciseDraft, set: SessionSetDraft, unit: string, t: Translate) {
  const weight = set.weight ?? set.ghostWeight ?? exercise.weight
  const reps = set.reps ?? set.ghostReps ?? exercise.reps
  const amount = exercise.kind === 'time' ? formatClock(reps) : String(reps)
  if (!weight) return amount
  const w = unit ? `${weight} ${unit}` : String(weight)
  return t('sessionNotification.load', { weight: w, amount })
}

/** "Set 3 of 4 · 80 kg × 8" for the exercise's next set, or `null` when it has none left. */
function nextSetLine(exercise: SessionExerciseDraft, unit: string, t: Translate): string | null {
  const set = exercise.loggedSets.find((s) => !s.completed)
  if (!set) return null
  return t('sessionNotification.setLine', {
    position: setPosition(exercise, set, t),
    load: setLoad(exercise, set, unit, t),
  })
}

/** The face outside rest: the current exercise, the set to do next, and the workout. */
function workingFace(session: ActiveSession, t: Translate): NotificationFace {
  const { exercises, name } = session.draft
  const unit = session.draft.unit ?? ''
  const exercise = exercises[currentExerciseIndex(exercises)]
  if (!exercise) return { title: name, body: '', detail: '' }
  return {
    title: exercise.name,
    body: nextSetLine(exercise, unit, t) ?? t('sessionNotification.allDone'),
    detail: name,
  }
}

/**
 * The face while resting: "Resting" first (the countdown is the point), then
 * what comes after it — the rested exercise's next set, else the next
 * exercise, else that everything is logged.
 */
function restFace(session: ActiveSession, t: Translate): NotificationFace {
  const { exercises } = session.draft
  const unit = session.draft.unit ?? ''
  const title = t('sessionNotification.resting')
  const rested =
    session.restExerciseIndex !== null ? exercises[session.restExerciseIndex] : undefined
  const sameExerciseNext = rested ? nextSetLine(rested, unit, t) : null
  if (rested && sameExerciseNext) {
    return { title, body: t('sessionNotification.next', { next: sameExerciseNext }), detail: rested.name }
  }
  const upcoming = exercises[currentExerciseIndex(exercises)]
  const upcomingSet = upcoming ? nextSetLine(upcoming, unit, t) : null
  if (upcoming && upcomingSet) {
    return { title, body: t('sessionNotification.next', { next: upcoming.name }), detail: upcomingSet }
  }
  return { title, body: t('sessionNotification.allDone'), detail: '' }
}

/**
 * Builds the ongoing notification for a live session: the current exercise
 * and its next set under the workout clock, or — while resting — "Resting"
 * over the countdown with what comes next, plus the deadline the native side
 * counts down to on its own.
 *
 * @returns `null` when there's no session (the notification should go away).
 */
export function buildSessionNotification(
  session: ActiveSession | null,
  t: Translate,
  now: number = Date.now(),
): SessionNotificationContent | null {
  if (!session) return null
  const working = workingFace(session, t)
  const base = { startedAt: session.startedAt }
  const restEndsAt = session.restEndsAt
  if (!restEndsAt || restEndsAt <= now) {
    return { ...base, ...working, restEndsAt: null, afterRest: null }
  }
  return { ...base, ...restFace(session, t), restEndsAt, afterRest: working }
}
