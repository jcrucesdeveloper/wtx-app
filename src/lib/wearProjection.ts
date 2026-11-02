import type { ActiveSession } from '@/stores/activeSession'
import { REST_STEP_SECONDS } from '@/lib/restTime'
import {
  describeNext,
  nextAfterRest,
  nextWhileWorking,
  type Translate,
} from '@/lib/sessionNextAction'
import type { WearProjection } from '@/lib/wearProtocol'

/**
 * What the watch shows about the session, from the same rules as the ongoing
 * notification (`sessionNextAction`). The watch gets this and the rest's timing,
 * never the session: it has no exercise logic of its own.
 *
 * @param exerciseName Display name of an exercise, as the app shows it in the current language.
 * @param vibrate The "vibrate when the rest ends" setting; it applies to the watch too.
 */
export function buildWearProjection(
  session: ActiveSession,
  t: Translate,
  exerciseName: (name: string) => string,
  vibrate: boolean,
): WearProjection {
  const unit = session.draft.unit ?? ''
  return {
    sessionName: session.draft.name,
    afterRest: describeNext(nextAfterRest(session), unit, t, exerciseName),
    working: describeNext(nextWhileWorking(session), unit, t, exerciseName),
    stepSeconds: REST_STEP_SECONDS,
    vibrate,
  }
}
