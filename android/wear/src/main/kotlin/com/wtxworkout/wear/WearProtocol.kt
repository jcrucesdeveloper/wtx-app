package com.wtxworkout.wear

import org.json.JSONException
import org.json.JSONObject

/**
 * The watch side of the phone <-> watch protocol, version 1: paths, and reading and
 * writing the messages. The same contract exists in TypeScript (src/lib/wearProtocol.ts)
 * and Java (WearProtocol, android/app); all three are tested against
 * android/protocol/wear-v1.json. Documented in the README ("Wear OS").
 *
 * Every payload is a UTF-8 JSON object with "v": 1. Times are milliseconds, except
 * `deltaSeconds`. `remainingMs` is relative to the moment the phone built the state:
 * never an absolute time, because the two clocks are not the same clock.
 */
object WearProtocol {
    const val VERSION = 1

    /** DataItem the phone publishes; also the path of its reply to a request. */
    const val PATH_STATE = "/wtx/v1/session/state"
    /** Watch to phone: send the state now. */
    const val PATH_REQUEST = "/wtx/v1/session/request"
    /** Watch to phone: move the running rest. */
    const val PATH_ADJUST = "/wtx/v1/timer/adjust"
    /** Phone to watch: whether a command was applied, and the state after it. */
    const val PATH_RESULT = "/wtx/v1/command/result"

    /** The capability the phone app declares, so the watch can find a compatible host. */
    const val CAPABILITY_HOST = "wtx_host_v1"

    // Reject reasons the phone may answer with.
    const val REASON_NOT_READY = "not_ready"
    const val REASON_NO_SESSION = "no_session"
    const val REASON_SESSION_MISMATCH = "session_mismatch"
    const val REASON_REST_MISMATCH = "rest_mismatch"
    const val REASON_REST_ENDED = "rest_ended"
    const val REASON_INVALID = "invalid_payload"
    const val REASON_UNSUPPORTED_VERSION = "unsupported_version"

    fun requestJson(requestId: String): ByteArray =
        JSONObject().put("v", VERSION).put("requestId", requestId).toString().toByteArray()

    fun adjustJson(commandId: String, sessionId: String, restId: String, deltaSeconds: Int): ByteArray =
        JSONObject()
            .put("v", VERSION)
            .put("commandId", commandId)
            .put("sessionId", sessionId)
            .put("restId", restId)
            .put("deltaSeconds", deltaSeconds)
            .toString()
            .toByteArray()

    /** The phone's state; `null` when the payload is not a valid version-1 state. */
    fun parseState(bytes: ByteArray): WireState? = try {
        stateFrom(JSONObject(String(bytes, Charsets.UTF_8)))
    } catch (e: JSONException) {
        null
    }

    /** The phone's answer to a command; `null` when it is not a valid version-1 result. */
    fun parseResult(bytes: ByteArray): WireResult? = try {
        val json = JSONObject(String(bytes, Charsets.UTF_8))
        val state = json.optJSONObject("state")?.let(::stateFrom)
        val commandId = json.optStringOrNull("commandId")
        if (json.optInt("v", -1) != VERSION || commandId == null || state == null || !json.has("accepted")) {
            null
        } else {
            WireResult(
                commandId = commandId,
                accepted = json.optBoolean("accepted", false),
                reason = json.optStringOrNull("reason"),
                duplicate = json.optBoolean("duplicate", false),
                state = state,
            )
        }
    } catch (e: JSONException) {
        null
    }

    private fun JSONObject.optStringOrNull(key: String): String? {
        val value = opt(key)
        return if (value is String && value.isNotEmpty()) value else null
    }

    private fun JSONObject.optWholeNumber(key: String): Long? {
        val value = opt(key)
        return if (value is Int || value is Long) (value as Number).toLong() else null
    }

    private fun stateFrom(json: JSONObject): WireState? {
        if (json.optWholeNumber("v") != VERSION.toLong()) return null
        val hostId = json.optStringOrNull("hostId") ?: return null
        val revision = json.optWholeNumber("revision")?.takeIf { it >= 0 } ?: return null
        val status = HostStatus.fromWire(json.optStringOrNull("status")) ?: return null
        val rest = json.optJSONObject("rest")?.let { r ->
            val restId = r.optStringOrNull("restId") ?: return null
            val remaining = r.optWholeNumber("remainingMs")?.takeIf { it >= 0 } ?: return null
            val duration = r.optWholeNumber("durationMs")?.takeIf { it >= 0 } ?: return null
            WireRest(restId, remaining, duration)
        }
        if (status == HostStatus.Resting && rest == null) return null
        val step = json.optWholeNumber("stepSeconds")?.takeIf { it in 1..MAX_STEP_SECONDS } ?: return null
        val next = json.optJSONObject("next")?.let { n ->
            NextAction(
                kind = n.optString("kind", "done"),
                exercise = n.optString("exercise", ""),
                position = n.optString("position", ""),
                load = n.optString("load", ""),
            )
        }
        return WireState(
            hostId = hostId,
            revision = revision,
            inReplyTo = json.optStringOrNull("inReplyTo"),
            status = status,
            sessionId = json.optStringOrNull("sessionId"),
            endedReason = json.optStringOrNull("endedReason"),
            rest = rest,
            stepSeconds = step.toInt(),
            vibrate = json.optBoolean("vibrate", true),
            sessionName = json.optString("sessionName", ""),
            next = next,
        )
    }

    private const val MAX_STEP_SECONDS = 60L
}

enum class HostStatus(val wire: String) {
    /** The phone app's process just started and its screen has not loaded the session yet. */
    NotReady("not_ready"),
    Idle("idle"),
    Active("active"),
    Resting("resting"),
    Ended("ended");

    companion object {
        fun fromWire(value: String?): HostStatus? = entries.firstOrNull { it.wire == value }
    }
}

/** The next set or exercise, in the phone's language and units; the watch only lays it out. */
data class NextAction(val kind: String, val exercise: String, val position: String, val load: String) {
    val isDone: Boolean get() = kind == "done"
}

data class WireRest(val restId: String, val remainingMs: Long, val durationMs: Long)

data class WireState(
    val hostId: String,
    val revision: Long,
    val inReplyTo: String?,
    val status: HostStatus,
    val sessionId: String?,
    val endedReason: String?,
    val rest: WireRest?,
    val stepSeconds: Int,
    val vibrate: Boolean,
    val sessionName: String,
    val next: NextAction?,
)

data class WireResult(
    val commandId: String,
    val accepted: Boolean,
    val reason: String?,
    val duplicate: Boolean,
    val state: WireState,
)
