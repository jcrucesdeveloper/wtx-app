package com.wtxworkout.wear

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class WatchModelTest {
    private val next = NextAction("set", "Bench Press", "Set 2 of 3", "60 kg × 8")

    private fun resting(
        revision: Long,
        remainingMs: Long = 90_000,
        restId: String = "r-1",
        hostId: String = "h-1",
        inReplyTo: String? = null,
        vibrate: Boolean = true,
    ) = WireState(
        hostId = hostId,
        revision = revision,
        inReplyTo = inReplyTo,
        status = HostStatus.Resting,
        sessionId = "s-1",
        endedReason = null,
        rest = WireRest(restId, remainingMs, 90_000),
        stepSeconds = 15,
        vibrate = vibrate,
        sessionName = "Push day",
        next = next,
    )

    private fun active(revision: Long, hostId: String = "h-1") =
        resting(revision, hostId = hostId).copy(status = HostStatus.Active, rest = null)

    /** A watch that has been in sync with the phone. */
    private fun synced(state: WireState = resting(10), at: Long = 1_000, latency: Long = 0): WatchModel =
        WatchReducer.acceptState(WatchModel(link = Link.Connected), state, at, latency, answered = true)

    // --- Ordering of states ---

    @Test
    fun `a newer state replaces the held one`() {
        val model = WatchReducer.acceptState(synced(resting(10)), active(11), 2_000, 0)
        assertEquals(11L, model.host!!.revision)
        assertEquals(HostStatus.Active, model.host!!.status)
        assertNull(model.host!!.rest)
    }

    @Test
    fun `an older state that arrives late is ignored`() {
        val held = synced(active(12))
        val model = WatchReducer.acceptState(held, resting(11), 2_000, 0)
        assertSame(held, model)
    }

    @Test
    fun `states in a shuffled order end on the highest revision`() {
        var model = synced(resting(10))
        for (revision in listOf(14L, 12L, 15L, 11L, 13L)) {
            model = WatchReducer.acceptState(model, resting(revision, remainingMs = revision * 1_000), 2_000, 0)
        }
        assertEquals(15L, model.host!!.revision)
        assertEquals(2_000 + 15_000L, model.host!!.rest!!.deadlineMs)
    }

    @Test
    fun `an equal revision that nobody asked for changes nothing`() {
        val held = synced(resting(10))
        assertSame(held, WatchReducer.acceptState(held, resting(10, remainingMs = 5_000), 3_000, 0))
    }

    @Test
    fun `an equal revision that answers a request refreshes the time and the sync`() {
        val stale = WatchReducer.linkChanged(synced(resting(10, remainingMs = 90_000), at = 1_000), false)
        val reconnected = WatchReducer.linkChanged(stale, true)
        assertFalse(reconnected.fresh)
        val answered = WatchReducer.acceptState(reconnected, resting(10, remainingMs = 40_000, inReplyTo = "q"), 9_000, 0)
        assertTrue(answered.fresh)
        assertEquals(49_000L, answered.host!!.rest!!.deadlineMs)
        assertEquals(10L, answered.host!!.revision)
    }

    @Test
    fun `a reinstalled phone app is another host and its low revision is not stale`() {
        val model = WatchReducer.acceptState(synced(resting(500, hostId = "old")), active(1, hostId = "new"), 2_000, 0)
        assertEquals("new", model.host!!.hostId)
        assertEquals(1L, model.host!!.revision)
    }

    @Test
    fun `a state nobody asked for, after losing the phone, shows but is not trusted until answered`() {
        val lost = WatchReducer.linkChanged(synced(resting(10)), false)
        val model = WatchReducer.acceptState(lost, resting(11, remainingMs = 60_000), 5_000, 0)
        assertEquals(11L, model.host!!.revision)
        assertFalse(model.fresh)
        assertEquals(Link.Unreachable, model.link)
        assertFalse(WatchReducer.canAdjust(model, 5_001))
    }

    // --- The countdown ---

    @Test
    fun `the deadline discounts the time the state spent travelling`() {
        assertEquals(1_000 + 89_850L, WatchReducer.deadlineFor(90_000, 1_000, 150))
    }

    @Test
    fun `an absurd latency cannot eat the rest and the deadline is never before arrival`() {
        assertEquals(1_000 + 98_000L, WatchReducer.deadlineFor(100_000, 1_000, 60_000))
        assertEquals(1_000L, WatchReducer.deadlineFor(500, 1_000, 2_000))
        assertEquals(1_000L, WatchReducer.deadlineFor(0, 1_000, 150))
    }

    @Test
    fun `the remaining time is never negative and rounds up like the phone`() {
        val rest = RestInfo("r", 90_000, deadlineMs = 10_000)
        assertEquals(10_000L, rest.remainingMs(0))
        assertEquals(10, rest.remainingSeconds(0))
        assertEquals(10, rest.remainingSeconds(1))
        assertEquals(1, rest.remainingSeconds(9_001))
        assertEquals(0L, rest.remainingMs(10_000))
        assertEquals(0L, rest.remainingMs(99_999))
        assertEquals(0, rest.remainingSeconds(99_999))
    }

    @Test
    fun `no per-second messages are needed to count down`() {
        val model = synced(resting(10, remainingMs = 90_000), at = 1_000)
        val at = { now: Long -> (WatchScreens.from(model, now) as WatchScreenState.Resting).remainingSeconds }
        assertEquals(90, at(1_000))
        assertEquals(60, at(31_000))
        assertEquals(1, at(90_999))
    }

    @Test
    fun `the latency estimate follows the round trips and ignores nonsense`() {
        val estimator = LatencyEstimator()
        assertEquals(LatencyEstimator.DEFAULT_LATENCY_MS, estimator.oneWayMs)
        repeat(30) { estimator.addRoundTrip(400) }
        assertEquals(200, estimator.oneWayMs, 5.0)
        val settled = estimator.oneWayMs
        estimator.addRoundTrip(-5)
        estimator.addRoundTrip(60_000)
        assertEquals(settled, estimator.oneWayMs)
    }

    private fun assertEquals(expected: Long, actual: Long, delta: Double) =
        org.junit.Assert.assertEquals(expected.toDouble(), actual.toDouble(), delta)

    // --- Commands ---

    @Test
    fun `two legitimate taps before a new revision are both allowed`() {
        var model = synced()
        assertTrue(WatchReducer.canAdjust(model, 1_001))
        model = WatchReducer.commandSent(model, "c-1")
        assertTrue(WatchReducer.canAdjust(model, 1_002))
        model = WatchReducer.commandSent(model, "c-2")
        assertEquals(setOf("c-1", "c-2"), model.pending)
        assertTrue(WatchReducer.canAdjust(model, 1_003))
    }

    @Test
    fun `a runaway number of taps in flight disables the buttons`() {
        var model = synced()
        repeat(WatchReducer.MAX_PENDING) { model = WatchReducer.commandSent(model, "c-$it") }
        assertFalse(WatchReducer.canAdjust(model, 1_001))
    }

    @Test
    fun `an accepted result clears its command and brings the new state`() {
        var model = WatchReducer.commandSent(synced(resting(10)), "c-1")
        val result = WireResult("c-1", true, null, false, resting(11, remainingMs = 75_000))
        model = WatchReducer.acceptResult(model, result, 2_000, 0)
        assertTrue(model.pending.isEmpty())
        assertEquals(77_000L, model.host!!.rest!!.deadlineMs)
        assertNull(model.notice)
    }

    @Test
    fun `a rejected result shows why and still takes the phone's state`() {
        var model = WatchReducer.commandSent(synced(resting(10)), "c-1")
        val result = WireResult("c-1", false, WearProtocol.REASON_REST_ENDED, false, active(11))
        model = WatchReducer.acceptResult(model, result, 2_000, 0)
        assertEquals(Notice.Rejected(WearProtocol.REASON_REST_ENDED), model.notice)
        assertTrue(model.pending.isEmpty())
        assertEquals(HostStatus.Active, model.host!!.status)
    }

    @Test
    fun `a late result with an older state does not move the countdown backwards`() {
        var model = WatchReducer.commandSent(WatchReducer.commandSent(synced(resting(10)), "c-1"), "c-2")
        model = WatchReducer.acceptResult(model, WireResult("c-2", true, null, false, resting(12, remainingMs = 60_000)), 2_000, 0)
        model = WatchReducer.acceptResult(model, WireResult("c-1", true, null, false, resting(11, remainingMs = 75_000)), 2_100, 0)
        assertEquals(12L, model.host!!.revision)
        assertEquals(62_000L, model.host!!.rest!!.deadlineMs)
        assertTrue(model.pending.isEmpty())
    }

    @Test
    fun `a failed command is forgotten and reported, not retried silently`() {
        var model = WatchReducer.commandSent(synced(), "c-1")
        model = WatchReducer.commandFailed(model, "c-1", Notice.NoAnswer)
        assertTrue(model.pending.isEmpty())
        assertEquals(Notice.NoAnswer, model.notice)
        assertNull(WatchReducer.clearNotice(model).notice)
    }

    @Test
    fun `adjusting is not offered once the countdown reached zero here`() {
        val model = synced(resting(10, remainingMs = 5_000), at = 1_000)
        assertTrue(WatchReducer.canAdjust(model, 5_999))
        assertFalse(WatchReducer.canAdjust(model, 6_000))
    }

    // --- Disconnection ---

    @Test
    fun `losing the phone keeps the last confirmed countdown but marks it and blocks taps`() {
        var model = WatchReducer.commandSent(synced(resting(10, remainingMs = 90_000), at = 1_000), "c-1")
        model = WatchReducer.linkChanged(model, false)
        assertTrue(model.pending.isEmpty())
        val screen = WatchScreens.from(model, 11_000) as WatchScreenState.Resting
        assertTrue(screen.unsynced)
        assertFalse(screen.canAdjust)
        assertEquals(80, screen.remainingSeconds)
    }

    @Test
    fun `reconnecting does not trust the held state until the phone answers`() {
        val model = WatchReducer.linkChanged(WatchReducer.linkChanged(synced(), false), true)
        assertEquals(Link.Connected, model.link)
        assertFalse(model.fresh)
        assertFalse(WatchReducer.canAdjust(model, 1_001))
    }

    @Test
    fun `coming back to a phone that is still in sync does not drop the sync`() {
        val model = WatchReducer.linkChanged(synced(), true)
        assertTrue(model.fresh)
    }

    // --- Screens ---

    @Test
    fun `before any state, looking and not finding are different screens`() {
        assertEquals(WatchScreenState.Searching, WatchScreens.from(WatchModel(), 0))
        assertEquals(WatchScreenState.NoHost, WatchScreens.from(WatchModel(link = Link.Unreachable), 0))
    }

    @Test
    fun `each phone status has its screen`() {
        fun screen(state: WireState) = WatchScreens.from(synced(state), 1_001)
        val base = active(1)
        assertEquals(WatchScreenState.Idle, screen(base.copy(status = HostStatus.Idle, sessionId = null, next = null)))
        assertEquals(WatchScreenState.NotReady, screen(base.copy(status = HostStatus.NotReady, sessionId = null)))
        assertTrue(screen(base) is WatchScreenState.Active)
        assertTrue(screen(resting(2)) is WatchScreenState.Resting)
        assertEquals(
            WatchScreenState.Ended("discarded"),
            screen(base.copy(status = HostStatus.Ended, endedReason = "discarded")),
        )
    }

    @Test
    fun `a rest that ran out here shows the session, not a frozen zero`() {
        val model = synced(resting(10, remainingMs = 5_000), at = 1_000)
        assertTrue(WatchScreens.from(model, 5_999) is WatchScreenState.Resting)
        assertTrue(WatchScreens.from(model, 6_000) is WatchScreenState.Active)
    }
}
