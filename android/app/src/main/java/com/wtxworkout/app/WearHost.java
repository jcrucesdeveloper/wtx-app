package com.wtxworkout.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.util.Log;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;
import java.util.UUID;
import org.json.JSONObject;

/**
 * The phone as the Wear OS app's host: it joins {@link RestHostCore} (the rules) to the
 * Wearable Data Layer. It publishes the state as a DataItem whenever it changes, answers
 * the watch's state requests, applies its rest adjustments and answers each with a result
 * message. It runs from {@link WearHostListenerService}, which the system starts for a
 * watch message, so none of it depends on the activity or the web view being alive.
 *
 * One instance per process. What the web view tells it (session, rest, what to show) arrives
 * through {@link SessionNotificationPlugin}; whatever it changes on its own is handed back to
 * JS and to the notification through {@link SessionNotificationPlugin#onHostChanged()}.
 */
final class WearHost {

    private static final String TAG = "WtxWearHost";
    private static final String PREFS = "wtx_wear_host";

    private static WearHost instance;

    static synchronized WearHost get(Context context) {
        if (instance == null) instance = new WearHost(context.getApplicationContext());
        return instance;
    }

    private final Context app;
    private final SharedPreferences prefs;
    private final String hostId;
    final RestHostCore core;
    private long publishedRevision = -1;

    private WearHost(Context app) {
        this.app = app;
        this.prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String id = prefs.getString("hostId", null);
        if (id == null) {
            id = UUID.randomUUID().toString();
            prefs.edit().putString("hostId", id).apply();
        }
        this.hostId = id;
        // The revision survives the process: after a restart the watch must still see it grow.
        this.core = new RestHostCore(prefs.getLong("revision", 0));
    }

    /** The clock the rest's deadline is kept on: the one the notification's chronometer counts on. */
    static long now() {
        return SystemClock.elapsedRealtime();
    }

    /** Epoch milliseconds for a deadline on {@link #now()}'s clock; 0 stays 0 (no deadline). */
    static long toEpoch(long elapsedMs) {
        return elapsedMs == 0 ? 0 : System.currentTimeMillis() + (elapsedMs - now());
    }

    // --- From the web view (via the plugin, on the main thread) ---

    /** @return whether JS's copy of the rest is older than the host's and must reconcile. */
    boolean onJsShow(JSONObject data, long jsRestEndsAtElapsed) {
        JSONObject wear = data.optJSONObject("wear");
        RestHostCore.Projection projection = wear == null ? null : new RestHostCore.Projection(
            wear.optString("sessionName", ""),
            next(wear.optJSONObject("afterRest")),
            next(wear.optJSONObject("working")),
            wear.optInt("stepSeconds", 15),
            wear.optBoolean("vibrate", true)
        );
        boolean stale = core.syncFromJs(
            data.optString("sessionId", ""),
            data.optString("restId", ""),
            data.optLong("restRev", 0),
            jsRestEndsAtElapsed,
            data.optLong("restDurationMs", 0),
            projection,
            now()
        );
        afterChange();
        return stale;
    }

    private static RestHostCore.NextAction next(JSONObject json) {
        if (json == null) return null;
        return new RestHostCore.NextAction(
            json.optString("kind", "done"),
            json.optString("exercise", ""),
            json.optString("position", ""),
            json.optString("load", "")
        );
    }

    /** The workout ended; {@code reason} is "finished" or "discarded", or null when there is just none. */
    void onJsStop(String reason) {
        core.endSession("finished".equals(reason) || "discarded".equals(reason) ? reason : null, now());
        afterChange();
    }

    /** The rest panel's −/+, as a command from this phone: the same rule as a watch command. */
    RestHostCore.Outcome adjust(String commandId, String sessionId, String restId, int deltaSeconds) {
        RestHostCore.Outcome outcome = core.adjust(commandId, sessionId, restId, deltaSeconds, now());
        afterChange();
        return outcome;
    }

    /** The notification's −/+ actions: the same rule as a watch command. */
    RestHostCore.Outcome adjustFromNotification(int deltaSeconds) {
        RestHostCore.RestState rest = core.currentRest();
        if (rest == null) return new RestHostCore.Outcome(false, RestHostCore.REST_ENDED, false, null, false);
        RestHostCore.Outcome outcome = core.adjust(
            UUID.randomUUID().toString(),
            rest.sessionId,
            rest.restId,
            deltaSeconds,
            now()
        );
        afterChange();
        return outcome;
    }

    RestHostCore.Outcome skipFromNotification() {
        RestHostCore.Outcome outcome = core.skip(now());
        afterChange();
        return outcome;
    }

    /** What JS needs to adopt for a rest, as plugin data. */
    static JSONObject restJson(RestHostCore.RestState rest) {
        JSONObject json = new JSONObject();
        if (rest == null) return json;
        try {
            json.put("sessionId", rest.sessionId);
            json.put("restId", rest.restId);
            json.put("restRev", rest.restRev);
            if (rest.endsAt != 0) json.put("restEndsAt", toEpoch(rest.endsAt));
            json.put("restDurationSeconds", Math.round(rest.durationMs / 1000.0));
        } catch (org.json.JSONException e) {
            throw new IllegalStateException(e);
        }
        return json;
    }

    // --- From the watch (WearHostListenerService, on a worker thread) ---

    void handleRequest(byte[] data, String nodeId) {
        String requestId;
        try {
            requestId = WearProtocol.parseRequestId(data);
        } catch (WearProtocol.InvalidMessage e) {
            Log.w(TAG, "Ignoring a state request: " + e.reason);
            return;
        }
        JSONObject state = WearProtocol.stateJson(hostId, core.snapshot(now()), requestId);
        send(nodeId, WearProtocol.PATH_STATE, state);
    }

    void handleAdjust(byte[] data, String nodeId) {
        RestHostCore.Outcome outcome;
        String commandId;
        try {
            WearProtocol.AdjustCommand command = WearProtocol.parseAdjust(data);
            commandId = command.commandId;
            outcome = core.adjust(command.commandId, command.sessionId, command.restId, command.deltaSeconds, now());
        } catch (WearProtocol.InvalidMessage e) {
            commandId = e.commandId;
            outcome = new RestHostCore.Outcome(false, e.reason, false, core.currentRest(), false);
        }
        afterChange();
        if (outcome.changed) SessionNotificationPlugin.onHostChanged();
        JSONObject state = WearProtocol.stateJson(hostId, core.snapshot(now()), null);
        send(
            nodeId,
            WearProtocol.PATH_RESULT,
            WearProtocol.resultJson(commandId, outcome.accepted, outcome.reason, outcome.duplicate, state)
        );
    }

    // --- Publishing ---

    /** Saves the revision and publishes the state when it moved. */
    private void afterChange() {
        long revision = core.revision();
        synchronized (this) {
            if (revision == publishedRevision) return;
            publishedRevision = revision;
        }
        prefs.edit().putLong("revision", revision).apply();
        publish();
    }

    private void publish() {
        JSONObject state = WearProtocol.stateJson(hostId, core.snapshot(now()), null);
        try {
            PutDataRequest request = PutDataRequest.create(WearProtocol.PATH_STATE);
            request.setData(WearProtocol.bytes(state));
            request.setUrgent();
            Wearable.getDataClient(app).putDataItem(request).addOnFailureListener(e -> Log.w(TAG, "Publishing the state failed", e));
        } catch (RuntimeException e) {
            Log.w(TAG, "Publishing the state failed", e);
        }
    }

    private void send(String nodeId, String path, JSONObject json) {
        try {
            Wearable.getMessageClient(app)
                .sendMessage(nodeId, path, WearProtocol.bytes(json))
                .addOnFailureListener(e -> Log.w(TAG, "Sending " + path + " failed", e));
        } catch (RuntimeException e) {
            Log.w(TAG, "Sending " + path + " failed", e);
        }
    }
}
