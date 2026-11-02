package com.wtxworkout.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

public class RestHostCoreTest {

    private static final long T0 = 1_000_000L;
    private static final String SESSION = "s-1";
    private static final String REST = "r-1";

    private RestHostCore core;

    private static RestHostCore.Projection projection() {
        return new RestHostCore.Projection(
            "Push day",
            new RestHostCore.NextAction("set", "Bench Press", "Set 2 of 3", "60 kg × 8"),
            new RestHostCore.NextAction("set", "Bench Press", "Set 3 of 3", "60 kg × 8"),
            15,
            true
        );
    }

    /** JS says: this session, resting 90 s from T0, revision 0. */
    private void startRest(long now) {
        core.syncFromJs(SESSION, REST, 0, now + 90_000, 90_000, projection(), now);
    }

    @Before
    public void setUp() {
        core = new RestHostCore(10);
    }

    @Test
    public void refusesCommandsUntilTheWebViewHasSpoken_andDoesNotRememberThat() {
        RestHostCore.Outcome early = core.adjust("c-1", SESSION, REST, 15, T0);
        assertFalse(early.accepted);
        assertEquals(RestHostCore.NOT_READY, early.reason);

        startRest(T0);
        // The same id, retried now that the host is ready, is decided on its merits.
        RestHostCore.Outcome later = core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        assertTrue(later.accepted);
        assertFalse(later.duplicate);
    }

    @Test
    public void movesTheDeadlineAndTheLengthTogether() {
        startRest(T0);
        RestHostCore.Outcome out = core.adjust("c-1", SESSION, REST, 15, T0 + 10_000);
        assertTrue(out.accepted);
        assertEquals(T0 + 105_000, out.rest.endsAt);
        assertEquals(105_000, out.rest.durationMs);
        assertEquals(1, out.rest.restRev);
    }

    @Test
    public void twoDifferentTapsBothApply_evenBeforeTheFirstWasAnswered() {
        startRest(T0);
        RestHostCore.Outcome first = core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        RestHostCore.Outcome second = core.adjust("c-2", SESSION, REST, 15, T0 + 1_001);
        assertTrue(first.accepted && second.accepted);
        assertEquals(T0 + 120_000, second.rest.endsAt);
        assertEquals(2, second.rest.restRev);
    }

    @Test
    public void aRetryIsDecidedOnce_andAppliedOnce() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        RestHostCore.Outcome retry = core.adjust("c-1", SESSION, REST, 15, T0 + 2_000);
        assertTrue(retry.accepted);
        assertTrue(retry.duplicate);
        assertFalse(retry.changed);
        // Still one +15: 90 s + 15 s.
        assertEquals(T0 + 105_000, core.currentRest().endsAt);
        assertEquals(1, core.currentRest().restRev);
    }

    @Test
    public void aRefusedCommandIsRefusedAgainWhenRetried_withoutChangingAnything() {
        startRest(T0);
        RestHostCore.Outcome refused = core.adjust("c-1", SESSION, "other-rest", 15, T0 + 1_000);
        assertEquals(RestHostCore.REST_MISMATCH, refused.reason);
        // The rest it named starting later does not rescue the old command.
        core.syncFromJs(SESSION, "other-rest", 0, T0 + 200_000, 200_000, projection(), T0 + 2_000);
        RestHostCore.Outcome retry = core.adjust("c-1", SESSION, "other-rest", 15, T0 + 3_000);
        assertFalse(retry.accepted);
        assertTrue(retry.duplicate);
        assertEquals(T0 + 200_000, core.currentRest().endsAt);
    }

    @Test
    public void rejectsACommandForAnotherRest() {
        startRest(T0);
        RestHostCore.Outcome out = core.adjust("c-1", SESSION, "an-earlier-rest", 15, T0 + 1_000);
        assertFalse(out.accepted);
        assertEquals(RestHostCore.REST_MISMATCH, out.reason);
        assertEquals(T0 + 90_000, core.currentRest().endsAt);
    }

    @Test
    public void rejectsACommandForAnotherSession() {
        startRest(T0);
        RestHostCore.Outcome out = core.adjust("c-1", "another-session", REST, 15, T0 + 1_000);
        assertEquals(RestHostCore.SESSION_MISMATCH, out.reason);
    }

    @Test
    public void rejectsCommandsOnceTheSessionEnded() {
        startRest(T0);
        core.endSession("finished", T0 + 5_000);
        RestHostCore.Outcome out = core.adjust("c-1", SESSION, REST, 15, T0 + 6_000);
        assertFalse(out.accepted);
        assertEquals(RestHostCore.NO_SESSION, out.reason);
    }

    @Test
    public void cutsBackToZeroAndNoFurther() {
        startRest(T0);
        // 10 s left; −15 would be −5 s.
        RestHostCore.Outcome out = core.adjust("c-1", SESSION, REST, -15, T0 + 80_000);
        assertTrue(out.accepted);
        assertEquals("the rest is over", 0, out.rest.endsAt);
        assertEquals(RestHostCore.Status.ACTIVE, core.snapshot(T0 + 80_000).status);
        assertEquals(0, core.snapshot(T0 + 80_000).remainingMs);
        // And a further tap finds no running rest.
        RestHostCore.Outcome next = core.adjust("c-2", SESSION, REST, 15, T0 + 80_500);
        assertEquals(RestHostCore.REST_ENDED, next.reason);
    }

    @Test
    public void doesNotAdjustARestWhoseDeadlinePassed() {
        startRest(T0);
        RestHostCore.Outcome out = core.adjust("c-1", SESSION, REST, 15, T0 + 91_000);
        assertEquals(RestHostCore.REST_ENDED, out.reason);
    }

    @Test
    public void aJsCopyOlderThanTheHostsNeverOverwritesIt() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 1_000); // host: rev 1, +15 s
        // JS still holds rev 0 with the old deadline, and sends it again (any change makes it).
        boolean stale = core.syncFromJs(SESSION, REST, 0, T0 + 90_000, 90_000, projection(), T0 + 2_000);
        assertTrue("JS is told to adopt the host's", stale);
        assertEquals(T0 + 105_000, core.currentRest().endsAt);
    }

    @Test
    public void anExpiredJsCopyDoesNotEndARestTheHostExtended() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 85_000); // 5 s left became 20 s
        // JS woke with its old deadline already past and rev 0.
        boolean stale = core.syncFromJs(SESSION, REST, 0, T0 + 90_000, 90_000, projection(), T0 + 91_000);
        assertTrue(stale);
        assertEquals(T0 + 105_000, core.restEndsAt(T0 + 91_000));
    }

    @Test
    public void aNewerJsCopyIsAdopted() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        // JS adjusted on its own (the host was unreachable) and is now ahead.
        boolean stale = core.syncFromJs(SESSION, REST, 2, T0 + 130_000, 130_000, projection(), T0 + 2_000);
        assertFalse(stale);
        assertEquals(T0 + 130_000, core.currentRest().endsAt);
        assertEquals(2, core.currentRest().restRev);
    }

    @Test
    public void aRestJsStartedReplacesTheOneBefore() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        core.syncFromJs(SESSION, "r-2", 0, T0 + 70_000, 60_000, projection(), T0 + 10_000);
        assertEquals("r-2", core.currentRest().restId);
        assertEquals(0, core.currentRest().restRev);
        assertEquals(T0 + 70_000, core.currentRest().endsAt);
    }

    @Test
    public void whenJsHasNoRestTheHostsRestIsOver() {
        startRest(T0);
        core.syncFromJs(SESSION, "", 0, 0, 0, projection(), T0 + 5_000);
        assertEquals(RestHostCore.Status.ACTIVE, core.snapshot(T0 + 5_000).status);
        assertEquals(0, core.restEndsAt(T0 + 5_000));
    }

    @Test
    public void skipEndsTheRestAndBumpsItsRevision() {
        startRest(T0);
        RestHostCore.Outcome out = core.skip(T0 + 1_000);
        assertTrue(out.accepted && out.changed);
        assertEquals(0, out.rest.endsAt);
        assertEquals(1, out.rest.restRev);
        assertFalse(core.skip(T0 + 2_000).accepted);
    }

    @Test
    public void theRevisionGrowsWithEachChange_andNotWithTime() {
        assertEquals(10, core.revision());
        startRest(T0);
        long afterStart = core.revision();
        assertTrue(afterStart > 10);

        // The same thing said again, later: nothing for the watch to learn.
        core.syncFromJs(SESSION, REST, 0, T0 + 90_000, 90_000, projection(), T0 + 30_000);
        assertEquals(afterStart, core.revision());

        core.adjust("c-1", SESSION, REST, 15, T0 + 31_000);
        long afterAdjust = core.revision();
        assertTrue(afterAdjust > afterStart);

        core.endSession("discarded", T0 + 40_000);
        assertTrue(core.revision() > afterAdjust);
    }

    @Test
    public void aRefusedCommandDoesNotMoveTheRevision() {
        startRest(T0);
        long revision = core.revision();
        core.adjust("c-1", SESSION, "wrong", 15, T0 + 1_000);
        assertEquals(revision, core.revision());
    }

    @Test
    public void theSnapshotShowsTheNextActionThatMatchesTheState() {
        startRest(T0);
        RestHostCore.Snapshot resting = core.snapshot(T0 + 30_000);
        assertEquals(RestHostCore.Status.RESTING, resting.status);
        assertEquals(60_000, resting.remainingMs);
        assertEquals("Set 2 of 3", resting.next.position);
        assertEquals(REST, resting.restId);

        // The same session once the deadline has passed: no rest, and the set to do now.
        RestHostCore.Snapshot after = core.snapshot(T0 + 95_000);
        assertEquals(RestHostCore.Status.ACTIVE, after.status);
        assertNull(after.restId);
        assertEquals(0, after.remainingMs);
        assertEquals("Set 3 of 3", after.next.position);
    }

    @Test
    public void theSnapshotNamesHowTheSessionEnded() {
        startRest(T0);
        core.endSession("finished", T0 + 5_000);
        RestHostCore.Snapshot ended = core.snapshot(T0 + 5_000);
        assertEquals(RestHostCore.Status.ENDED, ended.status);
        assertEquals("finished", ended.endedReason);
        assertEquals(SESSION, ended.sessionId);
        assertNull(ended.next);

        core.endSession(null, T0 + 6_000);
        RestHostCore.Snapshot idle = core.snapshot(T0 + 6_000);
        assertEquals(RestHostCore.Status.IDLE, idle.status);
        assertNull(idle.sessionId);
        assertNotNull(idle);
    }

    @Test
    public void aNewSessionStartsWithNoMemoryOfTheLast() {
        startRest(T0);
        core.adjust("c-1", SESSION, REST, 15, T0 + 1_000);
        core.syncFromJs("s-2", "", 0, 0, 0, projection(), T0 + 5_000);
        // The old session's command id is not a duplicate in the new one.
        RestHostCore.Outcome out = core.adjust("c-1", "s-2", REST, 15, T0 + 6_000);
        assertFalse(out.duplicate);
        assertEquals(RestHostCore.REST_MISMATCH, out.reason);
    }
}
