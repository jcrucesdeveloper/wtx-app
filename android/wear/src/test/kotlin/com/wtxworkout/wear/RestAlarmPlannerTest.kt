package com.wtxworkout.wear

import com.wtxworkout.wear.RestAlarmPlanner.Plan
import com.wtxworkout.wear.RestAlarmPlanner.Scheduled
import org.junit.Assert.assertEquals
import org.junit.Test

class RestAlarmPlannerTest {
    private val now = 10_000L

    private fun host(
        status: HostStatus = HostStatus.Resting,
        restId: String? = "r-1",
        deadline: Long = now + 60_000,
        vibrate: Boolean = true,
    ) = HostSnapshot(
        hostId = "h",
        revision = 1,
        status = status,
        sessionId = "s",
        endedReason = null,
        sessionName = "",
        next = null,
        stepSeconds = 15,
        vibrate = vibrate,
        rest = restId?.let { RestInfo(it, 60_000, deadline) },
    )

    private fun plan(scheduled: Scheduled?, host: HostSnapshot?, vibrated: String? = null, at: Long = now) =
        RestAlarmPlanner.plan(scheduled, host, vibrated, at)

    @Test
    fun `a running rest with nothing set schedules the alarm at its deadline`() {
        assertEquals(Plan.Schedule("r-1", now + 60_000), plan(null, host()))
    }

    @Test
    fun `the same rest and deadline is left alone`() {
        assertEquals(Plan.Keep, plan(Scheduled("r-1", now + 60_000), host()))
    }

    @Test
    fun `jitter in the estimated deadline does not reschedule`() {
        assertEquals(Plan.Keep, plan(Scheduled("r-1", now + 60_000 - 300), host()))
    }

    @Test
    fun `adding 15 seconds moves the alarm and subtracting moves it back`() {
        assertEquals(Plan.Schedule("r-1", now + 75_000), plan(Scheduled("r-1", now + 60_000), host(deadline = now + 75_000)))
        assertEquals(Plan.Schedule("r-1", now + 45_000), plan(Scheduled("r-1", now + 60_000), host(deadline = now + 45_000)))
    }

    @Test
    fun `a new rest replaces the old alarm even with the same deadline`() {
        assertEquals(Plan.Schedule("r-2", now + 60_000), plan(Scheduled("r-1", now + 60_000), host(restId = "r-2")))
    }

    @Test
    fun `cutting the rest short, skipping or ending the session cancels the alarm`() {
        val scheduled = Scheduled("r-1", now + 60_000)
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Active, restId = null)))
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Ended, restId = null)))
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Idle, restId = null)))
        assertEquals(Plan.Cancel, plan(scheduled, null))
    }

    @Test
    fun `without an alarm there is nothing to cancel`() {
        assertEquals(Plan.None, plan(null, host(status = HostStatus.Active, restId = null)))
        assertEquals(Plan.None, plan(null, null))
    }

    @Test
    fun `the phone's vibration setting off means no alarm, and turning it off cancels the one set`() {
        assertEquals(Plan.None, plan(null, host(vibrate = false)))
        assertEquals(Plan.Cancel, plan(Scheduled("r-1", now + 60_000), host(vibrate = false)))
    }

    @Test
    fun `a rest that already vibrated is never armed again, however often its state arrives`() {
        assertEquals(Plan.None, plan(null, host(), vibrated = "r-1"))
        assertEquals(Plan.None, plan(null, host(deadline = now + 60_000), vibrated = "r-1"))
    }

    @Test
    fun `a rest whose deadline is already in the past is not armed`() {
        assertEquals(Plan.None, plan(null, host(deadline = now - 1)))
        assertEquals(Plan.None, plan(null, host(deadline = now)))
    }

    @Test
    fun `the phone reporting the end just before the alarm is a natural end and vibrates now`() {
        val scheduled = Scheduled("r-1", now + 800)
        assertEquals(Plan.FireNow("r-1"), plan(scheduled, host(status = HostStatus.Active, restId = null)))
    }

    @Test
    fun `a rest cut well before its end does not vibrate`() {
        val scheduled = Scheduled("r-1", now + 20_000)
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Active, restId = null)))
    }

    @Test
    fun `the session ending in the last second is not taken for a natural end`() {
        val scheduled = Scheduled("r-1", now + 500)
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Ended, restId = null)))
    }

    @Test
    fun `a natural end does not vibrate twice`() {
        val scheduled = Scheduled("r-1", now + 500)
        assertEquals(Plan.Cancel, plan(scheduled, host(status = HostStatus.Active, restId = null), vibrated = "r-1"))
    }

    @Test
    fun `an alarm that was set but whose state never changed again is kept while disconnected`() {
        // The model keeps the last confirmed host when the link drops, so the plan sees the
        // same rest: the alarm stays and the final alert does not depend on a message at zero.
        assertEquals(Plan.Keep, plan(Scheduled("r-1", now + 60_000), host(), at = now + 30_000))
    }
}
