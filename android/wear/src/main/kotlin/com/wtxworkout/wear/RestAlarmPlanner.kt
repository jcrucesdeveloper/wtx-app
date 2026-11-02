package com.wtxworkout.wear

import kotlin.math.abs

/**
 * Decides what the one end-of-rest alarm on the watch should do after the phone's state
 * changes. Pure, so the cases that cause double or missing vibrations are unit-tested.
 *
 * There is at most one alarm. It exists only for a rest the phone confirmed is running, and
 * the end-of-rest vibration is decided here and by the receiver, never by a message "at
 * zero" (which could not arrive when the phone is away, or asleep).
 *
 * When it vibrates (the receiver, see [RestAlarms.fire]):
 * - Natural end of the countdown: yes, once per restId.
 * - The user cut the rest to zero (-15 s with less than 15 s left, or skip): no. The phone
 *   confirms a new revision with no rest, so the alarm is cancelled before it fires; the
 *   user caused it and is looking at the screen. Only a cut in the last ~1.5 s is taken for
 *   a natural end (see [NATURAL_END_WINDOW_MS]).
 * - Session ended, discarded, or a new rest started: cancelled, or replaced by a new alarm.
 * - The phone's "vibrate on rest end" setting is off: no alarm at all.
 */
object RestAlarmPlanner {
    /**
     * State reconstructed from estimates differs by a few tens of ms between messages
     * (latency jitter). Moving the alarm for that would reschedule on every message.
     */
    const val DEADLINE_TOLERANCE_MS = 750L

    /**
     * A rest the phone reports over within this long of the alarm's time ended on its own.
     * A cut made in the very last moments is indistinguishable from it, and vibrates too
     * (the user sees the time was almost up anyway).
     */
    const val NATURAL_END_WINDOW_MS = 1_500L

    /** An alarm currently set. */
    data class Scheduled(val restId: String, val deadlineMs: Long)

    sealed interface Plan {
        data object None : Plan
        data object Keep : Plan
        data object Cancel : Plan
        /** The rest ended naturally a moment before the alarm: vibrate now, once, and clear it. */
        data class FireNow(val restId: String) : Plan
        data class Schedule(val restId: String, val deadlineMs: Long) : Plan
    }

    /**
     * @param vibratedRestId the rest whose end already vibrated: never vibrate it twice, even
     *   if the same state is delivered again (screen, background service, a resend).
     */
    fun plan(scheduled: Scheduled?, host: HostSnapshot?, vibratedRestId: String?, now: Long): Plan {
        val rest = host?.rest
        val wanted = host != null &&
            host.status == HostStatus.Resting &&
            host.vibrate &&
            rest != null &&
            rest.deadlineMs > now &&
            rest.restId != vibratedRestId
        if (!wanted) {
            if (scheduled == null) return Plan.None
            // The phone reports the rest over a little before this watch's own estimate of its
            // end (latency, jitter). That is still the natural end, not the user cutting it.
            val naturalEnd = host != null &&
                host.status == HostStatus.Active &&
                host.rest == null &&
                host.vibrate &&
                scheduled.restId != vibratedRestId &&
                scheduled.deadlineMs - now <= NATURAL_END_WINDOW_MS
            return if (naturalEnd) Plan.FireNow(scheduled.restId) else Plan.Cancel
        }
        if (scheduled != null &&
            scheduled.restId == rest!!.restId &&
            abs(scheduled.deadlineMs - rest.deadlineMs) <= DEADLINE_TOLERANCE_MS
        ) {
            return Plan.Keep
        }
        return Plan.Schedule(rest!!.restId, rest.deadlineMs)
    }
}
