package com.wtxworkout.wear

/**
 * What the watch knows, and the rules for changing it. Everything here is pure (no Android,
 * no clock of its own: callers pass `now`) so the rules that matter are unit-tested:
 * out-of-order states, the countdown, and what the screen may offer while out of sync.
 *
 * All times are on the watch's monotonic clock (SystemClock.elapsedRealtime), in ms.
 */

/** A confirmed rest on the phone, converted to this watch's monotonic clock. */
data class RestInfo(val restId: String, val durationMs: Long, val deadlineMs: Long) {
    /** Never negative: a deadline in the past is 0, not a negative countdown. */
    fun remainingMs(now: Long): Long = (deadlineMs - now).coerceAtLeast(0)

    /** Whole seconds, rounded up like the phone's countdown (0 only when it is over). */
    fun remainingSeconds(now: Long): Int = ((remainingMs(now) + 999) / 1000).toInt()
}

/** The last phone state the watch accepted. */
data class HostSnapshot(
    val hostId: String,
    val revision: Long,
    val status: HostStatus,
    val sessionId: String?,
    val endedReason: String?,
    val sessionName: String,
    val next: NextAction?,
    val stepSeconds: Int,
    val vibrate: Boolean,
    val rest: RestInfo?,
)

/** Where the watch stands with the phone. */
enum class Link {
    /** Looking for the phone for the first time. */
    Searching,
    /** The phone is reachable. */
    Connected,
    /** The phone is not reachable (it may have been, before). */
    Unreachable,
}

/** Why a command did not work. Shown to the user; never retried silently beyond one resend. */
sealed interface Notice {
    data class Rejected(val reason: String) : Notice
    /** The phone did not confirm in time: the command may or may not have been applied. */
    data object NoAnswer : Notice
    /** The command could not be sent at all. */
    data object NotSent : Notice
}

data class WatchModel(
    val link: Link = Link.Searching,
    val host: HostSnapshot? = null,
    /**
     * True when [host] has been confirmed in this connection: by a live state or by the
     * answer to a request. A state read back from before (or from before a disconnection)
     * is not fresh, and the watch will not let the user act on it.
     */
    val fresh: Boolean = false,
    /** Commands sent and waiting for their confirmation (ids). */
    val pending: Set<String> = emptySet(),
    val notice: Notice? = null,
)

object WatchReducer {
    /** Taps in flight at once. Two quick taps are both legitimate; a runaway queue is not. */
    const val MAX_PENDING = 4

    /**
     * Applies a state from the phone.
     *
     * - Another host (a reinstalled phone app has a new `hostId` and a fresh revision
     *   counter): replaces the old one.
     * - The same host with an older or equal revision is ignored: states can arrive out of
     *   order, and the DataItem and the reply to a request can overtake each other.
     *   Exception: an equal revision that answers a request still proves the state is
     *   current, so it makes the watch fresh again and gives a better time estimate.
     * - Trust: an answer to a request is always current. A state nobody asked for is current
     *   only if the watch was already in sync: after a disconnection the Data Layer delivers
     *   whatever was published meanwhile, and its `remainingMs` is as old as that publication.
     *   Such a state updates what is shown but leaves the watch "not fresh" (nothing can be
     *   adjusted) until [WatchRuntime] gets the phone to answer.
     */
    fun acceptState(
        model: WatchModel,
        state: WireState,
        receivedAt: Long,
        latencyMs: Long,
        answered: Boolean = state.inReplyTo != null,
    ): WatchModel {
        val current = model.host
        val sameHost = current != null && current.hostId == state.hostId
        if (sameHost && state.revision < current!!.revision) return model
        if (sameHost && state.revision == current!!.revision) {
            if (!answered) return model
            val refreshed = current.copy(rest = restOf(state, receivedAt, latencyMs) ?: current.rest)
            return model.copy(host = refreshed, fresh = true, link = Link.Connected)
        }
        val trusted = answered || model.fresh
        return model.copy(
            host = snapshotOf(state, receivedAt, latencyMs),
            fresh = trusted,
            link = if (trusted) Link.Connected else model.link,
        )
    }

    /** The phone answered a command: the result's state goes through the same ordering rules. */
    fun acceptResult(model: WatchModel, result: WireResult, receivedAt: Long, latencyMs: Long): WatchModel {
        val settled = model.copy(pending = model.pending - result.commandId)
        // The result answers our own command, so its state is as good as an answer to a request.
        val withState = acceptState(settled, result.state, receivedAt, latencyMs, answered = true)
        return if (result.accepted) {
            withState.copy(notice = null)
        } else {
            withState.copy(notice = Notice.Rejected(result.reason ?: WearProtocol.REASON_INVALID))
        }
    }

    /** The phone became reachable or unreachable. Unreachable makes the held state stale. */
    fun linkChanged(model: WatchModel, reachable: Boolean): WatchModel =
        if (reachable) {
            // Reachable again, but nothing is confirmed until the phone answers a request.
            model.copy(link = Link.Connected, fresh = model.fresh && model.link == Link.Connected)
        } else {
            model.copy(link = Link.Unreachable, fresh = false, pending = emptySet())
        }

    fun commandSent(model: WatchModel, commandId: String): WatchModel =
        model.copy(pending = model.pending + commandId, notice = null)

    /** A command got no answer (or never left): forget it and say so. */
    fun commandFailed(model: WatchModel, commandId: String, notice: Notice): WatchModel =
        model.copy(pending = model.pending - commandId, notice = notice)

    fun clearNotice(model: WatchModel): WatchModel = model.copy(notice = null)

    /**
     * Whether the rest can be adjusted from here right now. False unless the phone is
     * reachable, the state is fresh, there is a running rest, and not too many taps are
     * waiting. Disabled buttons, not queued presses: a tap that cannot be confirmed does not
     * pretend to be one.
     */
    fun canAdjust(model: WatchModel, now: Long): Boolean {
        val rest = model.host?.rest ?: return false
        return model.link == Link.Connected &&
            model.fresh &&
            model.host.status == HostStatus.Resting &&
            rest.remainingMs(now) > 0 &&
            model.pending.size < MAX_PENDING
    }

    private fun snapshotOf(state: WireState, receivedAt: Long, latencyMs: Long) = HostSnapshot(
        hostId = state.hostId,
        revision = state.revision,
        status = state.status,
        sessionId = state.sessionId,
        endedReason = state.endedReason,
        sessionName = state.sessionName,
        next = state.next,
        stepSeconds = state.stepSeconds,
        vibrate = state.vibrate,
        rest = restOf(state, receivedAt, latencyMs),
    )

    private fun restOf(state: WireState, receivedAt: Long, latencyMs: Long): RestInfo? {
        val rest = state.rest ?: return null
        if (state.status != HostStatus.Resting) return null
        return RestInfo(rest.restId, rest.durationMs, deadlineFor(rest.remainingMs, receivedAt, latencyMs))
    }

    /**
     * The local deadline for a rest the phone said has `remainingMs` left when it sent it.
     * It travelled for about `latencyMs` since, so that much is already gone. The estimate
     * is capped (a wildly wrong latency must not eat the whole rest) and never lands before
     * the moment of arrival.
     */
    fun deadlineFor(remainingMs: Long, receivedAt: Long, latencyMs: Long): Long {
        val travel = latencyMs.coerceIn(0, LatencyEstimator.MAX_LATENCY_MS)
        return receivedAt + (remainingMs - travel).coerceAtLeast(0)
    }
}

/**
 * Estimates the one-way phone -> watch delay without synchronised clocks: the round trip of
 * a request and its reply, halved, smoothed so one slow Bluetooth hop does not dominate.
 * Live states (not replies) reuse the last estimate.
 */
class LatencyEstimator {
    private var smoothed: Double = DEFAULT_LATENCY_MS.toDouble()

    val oneWayMs: Long get() = smoothed.toLong()

    /** Feeds one request/reply round trip. Implausible values are ignored. */
    fun addRoundTrip(roundTripMs: Long) {
        if (roundTripMs < 0 || roundTripMs > MAX_ROUND_TRIP_MS) return
        smoothed = smoothed * (1 - ALPHA) + (roundTripMs / 2.0) * ALPHA
    }

    companion object {
        const val DEFAULT_LATENCY_MS = 150L
        const val MAX_LATENCY_MS = 2_000L
        private const val MAX_ROUND_TRIP_MS = 4_000L
        private const val ALPHA = 0.3
    }
}

/** What to draw. Derived from the model and the clock; carries no behaviour. */
sealed interface WatchScreenState {
    /** First look for the phone. */
    data object Searching : WatchScreenState
    /** No phone with WTX reachable, and nothing known from before. */
    data object NoHost : WatchScreenState
    /** The phone's app is up but still loading. */
    data object NotReady : WatchScreenState
    /** Phone found, no session. */
    data object Idle : WatchScreenState
    data class Active(val sessionName: String, val next: NextAction?, val unsynced: Boolean) : WatchScreenState
    data class Resting(
        val remainingSeconds: Int,
        val stepSeconds: Int,
        val next: NextAction?,
        val unsynced: Boolean,
        val canAdjust: Boolean,
        val pending: Boolean,
        val notice: Notice?,
    ) : WatchScreenState
    data class Ended(val reason: String?) : WatchScreenState
}

object WatchScreens {
    fun from(model: WatchModel, now: Long): WatchScreenState {
        val host = model.host
            ?: return if (model.link == Link.Searching) WatchScreenState.Searching else WatchScreenState.NoHost
        // A held state is shown with an "unsynced" mark when the phone cannot confirm it.
        val unsynced = !model.fresh
        return when (host.status) {
            HostStatus.NotReady -> WatchScreenState.NotReady
            HostStatus.Idle -> WatchScreenState.Idle
            HostStatus.Ended -> WatchScreenState.Ended(host.endedReason)
            HostStatus.Active -> WatchScreenState.Active(host.sessionName, host.next, unsynced)
            HostStatus.Resting -> {
                val rest = host.rest
                // The countdown ran out here: the rest is over even if the phone's word has not
                // arrived yet (or cannot), so show the plain "active" face. A 0:00 countdown
                // that stays on screen would claim a rest is still running.
                if (rest == null || rest.remainingMs(now) <= 0) {
                    WatchScreenState.Active(host.sessionName, host.next, unsynced)
                } else {
                    WatchScreenState.Resting(
                        remainingSeconds = rest.remainingSeconds(now),
                        stepSeconds = host.stepSeconds,
                        next = host.next,
                        unsynced = unsynced,
                        canAdjust = WatchReducer.canAdjust(model, now),
                        pending = model.pending.isNotEmpty(),
                        notice = model.notice,
                    )
                }
            }
        }
    }
}
