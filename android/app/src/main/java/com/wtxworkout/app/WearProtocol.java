package com.wtxworkout.app;

import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The phone side of the Wear OS protocol, version 1: paths, and reading and writing the
 * messages. The same contract exists in TypeScript (src/lib/wearProtocol.ts) and Kotlin
 * (android/wear, WearProtocol.kt); all three are tested against android/protocol/wear-v1.json.
 * Documented in the README ("Wear OS").
 *
 * Every payload is a UTF-8 JSON object with {@code "v": 1}. Times are milliseconds, except
 * {@code deltaSeconds}.
 */
final class WearProtocol {

    static final int VERSION = 1;

    /** DataItem the phone publishes; also the path of its reply to a request. */
    static final String PATH_STATE = "/wtx/v1/session/state";
    /** Watch to phone: send the state now. */
    static final String PATH_REQUEST = "/wtx/v1/session/request";
    /** Watch to phone: move the running rest. */
    static final String PATH_ADJUST = "/wtx/v1/timer/adjust";
    /** Phone to watch: whether a command was applied, and the state after it. */
    static final String PATH_RESULT = "/wtx/v1/command/result";

    /** The capability the phone app declares (res/values/wear.xml), so the watch can find it. */
    static final String CAPABILITY_HOST = "wtx_host_v1";

    /** The biggest move one command may ask for, in seconds. */
    static final int MAX_DELTA_SECONDS = 60;
    /** Longest id accepted, so a malformed message cannot fill the memory of decided commands. */
    private static final int MAX_ID_LENGTH = 64;

    static final String UNSUPPORTED_VERSION = "unsupported_version";

    private WearProtocol() {}

    /** A message that is not valid version-1 protocol; {@code reason} is the protocol's reject reason. */
    static final class InvalidMessage extends Exception {
        final String reason;
        /** The command's id when it could be read, so the answer can name it; else empty. */
        final String commandId;

        InvalidMessage(String reason, String commandId) {
            super(reason);
            this.reason = reason;
            this.commandId = commandId;
        }
    }

    static final class AdjustCommand {
        final String commandId;
        final String sessionId;
        final String restId;
        final int deltaSeconds;

        AdjustCommand(String commandId, String sessionId, String restId, int deltaSeconds) {
            this.commandId = commandId;
            this.sessionId = sessionId;
            this.restId = restId;
            this.deltaSeconds = deltaSeconds;
        }
    }

    private static JSONObject object(byte[] data) throws InvalidMessage {
        try {
            return new JSONObject(new String(data, StandardCharsets.UTF_8));
        } catch (JSONException | NullPointerException e) {
            throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, "");
        }
    }

    private static String id(JSONObject json, String key, String commandId) throws InvalidMessage {
        Object value = json.opt(key);
        if (!(value instanceof String)) throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, commandId);
        String text = (String) value;
        if (text.isEmpty() || text.length() > MAX_ID_LENGTH) throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, commandId);
        return text;
    }

    private static void checkVersion(JSONObject json, String commandId) throws InvalidMessage {
        Object v = json.opt("v");
        if (!(v instanceof Integer) && !(v instanceof Long)) throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, commandId);
        if (((Number) v).intValue() != VERSION) throw new InvalidMessage(UNSUPPORTED_VERSION, commandId);
    }

    /** The {@code requestId} of a state request. */
    static String parseRequestId(byte[] data) throws InvalidMessage {
        JSONObject json = object(data);
        checkVersion(json, "");
        return id(json, "requestId", "");
    }

    /** A rest adjustment: ids present, and a non-zero whole number of seconds within the limit. */
    static AdjustCommand parseAdjust(byte[] data) throws InvalidMessage {
        JSONObject json = object(data);
        Object rawId = json.opt("commandId");
        String commandId = rawId instanceof String && ((String) rawId).length() <= MAX_ID_LENGTH ? (String) rawId : "";
        checkVersion(json, commandId);
        id(json, "commandId", commandId);
        String sessionId = id(json, "sessionId", commandId);
        String restId = id(json, "restId", commandId);
        Object delta = json.opt("deltaSeconds");
        if (!(delta instanceof Integer) && !(delta instanceof Long)) throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, commandId);
        long seconds = ((Number) delta).longValue();
        if (seconds == 0 || Math.abs(seconds) > MAX_DELTA_SECONDS) throw new InvalidMessage(RestHostCore.INVALID_PAYLOAD, commandId);
        return new AdjustCommand(commandId, sessionId, restId, (int) seconds);
    }

    /** The host's state as sent to the watch ({@code inReplyTo} null for a published state). */
    static JSONObject stateJson(String hostId, RestHostCore.Snapshot s, String inReplyTo) {
        try {
            JSONObject json = new JSONObject();
            json.put("v", VERSION);
            json.put("hostId", hostId);
            json.put("revision", s.revision);
            if (inReplyTo != null) json.put("inReplyTo", inReplyTo);
            json.put("status", s.status.name().toLowerCase(java.util.Locale.ROOT));
            json.put("sessionId", s.sessionId == null ? JSONObject.NULL : s.sessionId);
            if (s.endedReason != null) json.put("endedReason", s.endedReason);
            if (s.restId == null) {
                json.put("rest", JSONObject.NULL);
            } else {
                JSONObject rest = new JSONObject();
                rest.put("restId", s.restId);
                rest.put("remainingMs", s.remainingMs);
                rest.put("durationMs", s.durationMs);
                json.put("rest", rest);
            }
            json.put("stepSeconds", s.stepSeconds);
            json.put("vibrate", s.vibrate);
            json.put("sessionName", s.sessionName);
            if (s.next == null) {
                json.put("next", JSONObject.NULL);
            } else {
                JSONObject next = new JSONObject();
                next.put("kind", s.next.kind);
                next.put("exercise", s.next.exercise);
                next.put("position", s.next.position);
                next.put("load", s.next.load);
                json.put("next", next);
            }
            return json;
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
    }

    /** The answer to a command: whether it was applied, why not, and the state after it. */
    static JSONObject resultJson(String commandId, boolean accepted, String reason, boolean duplicate, JSONObject state) {
        try {
            JSONObject json = new JSONObject();
            json.put("v", VERSION);
            json.put("commandId", commandId);
            json.put("accepted", accepted);
            json.put("reason", reason == null ? JSONObject.NULL : reason);
            json.put("duplicate", duplicate);
            json.put("state", state);
            return json;
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
    }

    static byte[] bytes(JSONObject json) {
        return json.toString().getBytes(StandardCharsets.UTF_8);
    }
}
