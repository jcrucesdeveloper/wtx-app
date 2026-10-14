/**
 * One workout at a time. A workout on your own and a group workout are the
 * same thing as far as this rule goes: while either is running — or while you
 * are in a group room waiting for one to start — nothing else can be started.
 */

/** What is already going on, on this device. */
export interface RunningState {
  /** The workout being logged right now, if any. */
  session: { routineId: string; roomId?: string } | null
  /** The group room this device is in and still has a workout to do in, if any. */
  openRoomId: string | null
}

/** What the user is trying to start. */
export type StartTarget =
  /** A routine, on their own. */
  | { kind: 'solo'; routineId: string }
  /** Their own workout inside a group room they are in. */
  | { kind: 'group'; roomId: string }
  /** A room they are not in yet: creating one, or joining one by its code. */
  | { kind: 'new-room' }

/** Why something can't be started. Translated as `room.errors.<code>`. */
export type WorkoutConflict = 'workout_in_progress' | 'group_workout_in_progress' | 'in_room'

export type StartVerdict =
  /** Nothing is in the way. */
  | 'start'
  /** This is the workout already running: go back to it. */
  | 'resume'
  /** Another workout of the user's own is running: it can be discarded for this one, if they say so. */
  | 'replace'
  | WorkoutConflict

/**
 * Whether `target` can be started given what is already running.
 *
 * Replacing is only ever offered between two workouts of the user's own. A
 * group workout is never silently dropped for something else, and nothing is
 * dropped to make room for a group one: other people are counting on that
 * state, so the user ends it deliberately first.
 */
export function startVerdict(state: RunningState, target: StartTarget): StartVerdict {
  const { session, openRoomId } = state

  if (session) {
    if (session.roomId) {
      if (target.kind === 'group' && target.roomId === session.roomId) return 'resume'
      return 'group_workout_in_progress'
    }
    if (target.kind !== 'solo') return 'workout_in_progress'
    return target.routineId === session.routineId ? 'resume' : 'replace'
  }

  if (openRoomId && !(target.kind === 'group' && target.roomId === openRoomId)) return 'in_room'
  return 'start'
}

export function isConflict(verdict: StartVerdict): verdict is WorkoutConflict {
  return verdict !== 'start' && verdict !== 'resume' && verdict !== 'replace'
}
