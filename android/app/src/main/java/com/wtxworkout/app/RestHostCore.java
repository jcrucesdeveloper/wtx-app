package com.wtxworkout.app;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The session's rest, as the phone hosts it: the one place its deadline is changed
 * once the rest is running, whoever asks (the rest panel, the notification's −/+, the
 * watch). Pure Java with no Android types, so every rule here is unit-tested.
 *
 * JavaScript (Pinia) still starts a rest and owns everything else about the session;
 * it tells this class about it with {@link #syncFromJs}. From then on a change to the
 * running rest goes through {@link #adjust} or {@link #skip}, which work while the web
 * view is paused. JS is told what was confirmed and adopts it (it does not re-apply a
 * delta), and a JS copy older than this one never overwrites it: every rest carries a
 * {@code restRev} that grows with each change, and {@link #syncFromJs} refuses a lower one.
 *
 * All methods are synchronized: the web view's calls, the notification's actions and the
 * watch's messages arrive on different threads, and two taps must both apply, in turn.
 * Times are milliseconds on one monotonic clock (the caller's {@code SystemClock.elapsedRealtime()});
 * they are passed in, never read here.
 */
final class RestHostCore {

    enum Status {
        /** The app's process just started and the web view has not said anything yet. */
        NOT_READY,
        IDLE,
        ACTIVE,
        RESTING,
        ENDED
    }

    /** A "next set / next exercise" line as the watch shows it. */
    static final class NextAction {
        final String kind;
        final String exercise;
        final String position;
        final String load;

        NextAction(String kind, String exercise, String position, String load) {
            this.kind = kind;
            this.exercise = exercise;
            this.position = position;
            this.load = load;
        }

        String key() {
            return kind + "|" + exercise + "|" + position + "|" + load;
        }
    }

    /** What the web view sends for the watch: the next action in each case, and the settings. */
    static final class Projection {
        final String sessionName;
        final NextAction afterRest;
        final NextAction working;
        final int stepSeconds;
        final boolean vibrate;

        Projection(String sessionName, NextAction afterRest, NextAction working, int stepSeconds, boolean vibrate) {
            this.sessionName = sessionName;
            this.afterRest = afterRest;
            this.working = working;
            this.stepSeconds = stepSeconds;
            this.vibrate = vibrate;
        }

        String key() {
            return sessionName + "#" + (afterRest == null ? "" : afterRest.key()) + "#"
                + (working == null ? "" : working.key()) + "#" + stepSeconds + "#" + vibrate;
        }
    }

    /** The state a watch is shown. {@code remainingMs} is as of the {@code now} it was taken at. */
    static final class Snapshot {
        final long revision;
        final Status status;
        final String sessionId;
        final String endedReason;
        final String restId;
        final long remainingMs;
        final long durationMs;
        final int stepSeconds;
        final boolean vibrate;
        final String sessionName;
        final NextAction next;

        Snapshot(
            long revision,
            Status status,
            String sessionId,
            String endedReason,
            String restId,
            long remainingMs,
            long durationMs,
            int stepSeconds,
            boolean vibrate,
            String sessionName,
            NextAction next
        ) {
            this.revision = revision;
            this.status = status;
            this.sessionId = sessionId;
            this.endedReason = endedReason;
            this.restId = restId;
            this.remainingMs = remainingMs;
            this.durationMs = durationMs;
            this.stepSeconds = stepSeconds;
            this.vibrate = vibrate;
            this.sessionName = sessionName;
            this.next = next;
        }
    }

    /** The rest after a change, in the units JS and the notification use. */
    static final class RestState {
        final String sessionId;
        final String restId;
        final long restRev;
        /** Deadline on the caller's clock; 0 when that rest is over. */
        final long endsAt;
        final long durationMs;

        RestState(String sessionId, String restId, long restRev, long endsAt, long durationMs) {
            this.sessionId = sessionId;
            this.restId = restId;
            this.restRev = restRev;
            this.endsAt = endsAt;
            this.durationMs = durationMs;
        }
    }

    /** Why a command was not applied. These strings are the protocol's `reason` values. */
    static final String NOT_READY = "not_ready";
    static final String NO_SESSION = "no_session";
    static final String SESSION_MISMATCH = "session_mismatch";
    static final String REST_MISMATCH = "rest_mismatch";
    static final String REST_ENDED = "rest_ended";
    static final String INVALID_PAYLOAD = "invalid_payload";

    /** How the rest ended, when {@link Outcome#restEnded}. */
    static final class Outcome {
        final boolean accepted;
        final String reason;
        final boolean duplicate;
        /** The rest after the command, or the one the host holds when it was refused; null if none. */
        final RestState rest;
        /** The command moved the rest's deadline or ended it. */
        final boolean changed;

        Outcome(boolean accepted, String reason, boolean duplicate, RestState rest, boolean changed) {
            this.accepted = accepted;
            this.reason = reason;
            this.duplicate = duplicate;
            this.rest = rest;
            this.changed = changed;
        }

        Outcome asDuplicate(RestState current) {
            return new Outcome(accepted, reason, true, current, false);
        }
    }

    /** How many decided commands are remembered, to answer a retry with the same decision. */
    static final int DECIDED_COMMANDS = 64;

    private boolean ready = false;
    private boolean sessionActive = false;
    private String endedReason = null;
    private String sessionId = null;
    private String restId = null;
    private long restRev = 0;
    private long endsAt = 0;
    private long durationMs = 0;
    private Projection projection = null;

    private long revision;
    private String publishedKey = "";

    private final Map<String, Outcome> decided = new LinkedHashMap<String, Outcome>() {
        @Override
        protected boolean removeEldestEntry(Entry<String, Outcome> eldest) {
            return size() > DECIDED_COMMANDS;
        }
    };

    RestHostCore(long revision) {
        this.revision = revision;
    }

    /**
     * What the web view says about the session. Returns whether the web view's copy of the
     * rest is older than this host's (so it must adopt the host's, not the other way round).
     *
     * @param jsRestId  the running rest's id, or empty when JS holds none
     * @param jsRestEndsAt deadline JS holds, on the caller's clock; ignored without a rest
     */
    synchronized boolean syncFromJs(
        String jsSessionId,
        String jsRestId,
        long jsRestRev,
        long jsRestEndsAt,
        long jsDurationMs,
        Projection newProjection,
        long now
    ) {
        ready = true;
        sessionActive = true;
        endedReason = null;
        if (!jsSessionId.equals(sessionId)) {
            sessionId = jsSessionId;
            restId = null;
            restRev = 0;
            endsAt = 0;
            durationMs = 0;
            decided.clear();
        }
        boolean stale = false;
        if (jsRestId.isEmpty()) {
            // JS holds no rest at all: it skipped it, or ended it after hearing this host. Over here too.
            endsAt = 0;
        } else if (jsRestId.equals(restId)) {
            // The same rest. Whoever changed it last (the higher revision) is right, whatever
            // deadline each holds: a JS copy older than the host's must not overwrite it.
            if (jsRestRev > restRev) {
                endsAt = jsRestEndsAt > now ? jsRestEndsAt : 0;
                durationMs = jsDurationMs;
                restRev = jsRestRev;
            } else if (jsRestRev < restRev) {
                stale = true;
            }
        } else {
            // A rest JS started (or restarted): the host takes it as it is.
            restId = jsRestId;
            restRev = jsRestRev;
            endsAt = jsRestEndsAt > now ? jsRestEndsAt : 0;
            durationMs = jsDurationMs;
        }
        projection = newProjection;
        bumpIfChanged(now);
        return stale;
    }

    /** The session ended (finished or discarded); {@code reason} null means there is simply none. */
    synchronized void endSession(String reason, long now) {
        ready = true;
        sessionActive = false;
        endedReason = reason;
        if (reason == null) sessionId = null;
        restId = null;
        restRev = 0;
        endsAt = 0;
        durationMs = 0;
        projection = null;
        decided.clear();
        bumpIfChanged(now);
    }

    /**
     * Moves the running rest by {@code deltaSeconds}, if the command is about it. The same
     * rule as the phone's own controls: the result is never earlier than {@code now}, the
     * rest's length moves with the deadline, and nothing is written back to the routine.
     * Reaching zero ends the rest.
     *
     * A {@code commandId} already decided gets the same decision again and changes nothing;
     * a different id is a different tap, so two taps made before either was answered both apply.
     */
    synchronized Outcome adjust(String commandId, String cmdSessionId, String cmdRestId, int deltaSeconds, long now) {
        Outcome earlier = decided.get(commandId);
        if (earlier != null) return earlier.asDuplicate(currentRest());
        if (!ready) return refuse(null, NOT_READY, false);
        if (!sessionActive || sessionId == null) return refuse(commandId, NO_SESSION, true);
        if (!sessionId.equals(cmdSessionId)) return refuse(commandId, SESSION_MISMATCH, true);
        if (restId == null || !restId.equals(cmdRestId)) return refuse(commandId, REST_MISMATCH, true);
        if (endsAt <= now) return refuse(commandId, REST_ENDED, true);

        long before = endsAt;
        endsAt = Math.max(now, before + deltaSeconds * 1000L);
        durationMs = Math.max(0, durationMs + (endsAt - before));
        restRev += 1;
        boolean ended = endsAt <= now;
        if (ended) endsAt = 0;
        bumpIfChanged(now);
        Outcome outcome = new Outcome(true, null, false, currentRest(), true);
        decided.put(commandId, outcome);
        return outcome;
    }

    /** The notification's skip action: ends the running rest. Nothing happens without one. */
    synchronized Outcome skip(long now) {
        if (!ready || !sessionActive || restId == null || endsAt <= now) {
            return new Outcome(false, REST_ENDED, false, currentRest(), false);
        }
        endsAt = 0;
        restRev += 1;
        bumpIfChanged(now);
        return new Outcome(true, null, false, currentRest(), true);
    }

    private Outcome refuse(String commandId, String reason, boolean remember) {
        Outcome outcome = new Outcome(false, reason, false, currentRest(), false);
        if (remember && commandId != null) decided.put(commandId, outcome);
        return outcome;
    }

    /** The rest the host holds (running or just ended), or null when it holds none. */
    synchronized RestState currentRest() {
        if (sessionId == null || restId == null) return null;
        return new RestState(sessionId, restId, restRev, endsAt, durationMs);
    }

    /** The deadline of the running rest, or 0. */
    synchronized long restEndsAt(long now) {
        return endsAt > now ? endsAt : 0;
    }

    synchronized Snapshot snapshot(long now) {
        Status status = statusAt(now);
        boolean resting = status == Status.RESTING;
        NextAction next = null;
        if (projection != null) {
            if (status == Status.RESTING) next = projection.afterRest;
            else if (status == Status.ACTIVE) next = projection.working;
        }
        return new Snapshot(
            revision,
            status,
            status == Status.NOT_READY || status == Status.IDLE ? null : sessionId,
            status == Status.ENDED ? endedReason : null,
            resting ? restId : null,
            resting ? endsAt - now : 0,
            resting ? durationMs : 0,
            projection != null ? projection.stepSeconds : 15,
            projection == null || projection.vibrate,
            projection != null ? projection.sessionName : "",
            next
        );
    }

    private Status statusAt(long now) {
        if (!ready) return Status.NOT_READY;
        if (sessionActive) return endsAt > now ? Status.RESTING : Status.ACTIVE;
        return endedReason != null ? Status.ENDED : Status.IDLE;
    }

    /** The revision last handed out; grows by one for every change worth telling the watch about. */
    synchronized long revision() {
        return revision;
    }

    /**
     * Bumps the revision when what a watch would be shown changed (not merely because time
     * passed: the watch counts down on its own).
     */
    private void bumpIfChanged(long now) {
        String key = statusAt(now) + "|" + sessionId + "|" + endedReason + "|" + restId + "|" + restRev + "|" + endsAt
            + "|" + durationMs + "|" + (projection == null ? "" : projection.key());
        if (!key.equals(publishedKey)) {
            publishedKey = key;
            revision += 1;
        }
    }
}
