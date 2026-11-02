import type { ActiveSession } from '@/stores/activeSession'
import {
  currentExerciseIndex,
  nextAfterRest,
  nextSetLine,
  setLine,
  type Translate,
} from '@/lib/sessionNextAction'

export type { Translate }

/**
 * One state of the ongoing workout notification: `title` first, `body` under
 * it, `detail` under that when expanded. While resting the native side draws
 * the countdown big under the title; otherwise the workout time goes small
 * right after the title (the exercise), so only a rest gets a big number.
 */
export interface NotificationFace {
  title: string
  body: string
  /** A quieter third line; empty for none. */
  detail: string
}

/** What the native side needs to draw the ongoing notification. */
export interface SessionNotificationContent extends NotificationFace {
  /**
   * Workout start, for the count-up clock shown outside rest. Never later
   * than now: a start in the future (a clock set back since) would count up
   * from below zero.
   */
  startedAt: number
  /** Rest deadline (epoch ms) for a native countdown; `null` when not resting. */
  restEndsAt: number | null
  /** What to switch to when the rest ends, so it changes without JS running. */
  afterRest: NotificationFace | null
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
 * exercise, else that everything is logged (see {@link nextAfterRest}).
 */
function restFace(session: ActiveSession, t: Translate): NotificationFace {
  const unit = session.draft.unit ?? ''
  const title = t('sessionNotification.resting')
  const next = nextAfterRest(session)
  if (next.kind === 'set') {
    return {
      title,
      body: t('sessionNotification.next', { next: setLine(next.exercise, next.set, unit, t) }),
      detail: next.exercise.name,
    }
  }
  if (next.kind === 'exercise') {
    return {
      title,
      body: t('sessionNotification.next', { next: next.exercise.name }),
      detail: setLine(next.exercise, next.set, unit, t),
    }
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
  const base = { startedAt: Math.min(session.startedAt, now) }
  const restEndsAt = session.restEndsAt
  // A rest that is over (or ends this instant) is not drawn: a countdown to a past deadline would read negative.
  if (!restEndsAt || restEndsAt <= now) {
    return { ...base, ...working, restEndsAt: null, afterRest: null }
  }
  return { ...base, ...restFace(session, t), restEndsAt, afterRest: working }
}
