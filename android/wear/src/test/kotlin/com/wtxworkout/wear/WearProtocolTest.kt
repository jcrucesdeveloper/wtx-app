package com.wtxworkout.wear

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The watch's reading of the contract. The same android/protocol/wear-v1.json is read by the
 * TypeScript and the Java tests: if one side drifts, one of the three fails.
 */
class WearProtocolTest {
    private val fixtures = JSONObject(File("../protocol/wear-v1.json").readText())

    private fun bytes(json: JSONObject) = json.toString().toByteArray()

    @Test
    fun `paths, capability and version match the contract`() {
        val paths = fixtures.getJSONObject("paths")
        assertEquals(fixtures.getInt("version"), WearProtocol.VERSION)
        assertEquals(fixtures.getString("capability"), WearProtocol.CAPABILITY_HOST)
        assertEquals(paths.getString("state"), WearProtocol.PATH_STATE)
        assertEquals(paths.getString("request"), WearProtocol.PATH_REQUEST)
        assertEquals(paths.getString("adjust"), WearProtocol.PATH_ADJUST)
        assertEquals(paths.getString("result"), WearProtocol.PATH_RESULT)
    }

    @Test
    fun `reads a resting state with its next action`() {
        val state = WearProtocol.parseState(bytes(fixtures.getJSONObject("state").getJSONObject("resting")))!!
        assertEquals(HostStatus.Resting, state.status)
        assertEquals("host-1", state.hostId)
        assertEquals(42L, state.revision)
        assertEquals("req-1", state.inReplyTo)
        assertEquals(WireRest("r-1", 90_000, 90_000), state.rest)
        assertEquals(15, state.stepSeconds)
        assertEquals(NextAction("set", "Bench Press", "Set 2 of 3", "60 kg × 8"), state.next)
    }

    @Test
    fun `reads idle and ended states, whose null fields are absent not blank`() {
        val states = fixtures.getJSONObject("state")
        val idle = WearProtocol.parseState(bytes(states.getJSONObject("idle")))!!
        assertEquals(HostStatus.Idle, idle.status)
        assertNull(idle.sessionId)
        assertNull(idle.rest)
        assertNull(idle.next)
        val ended = WearProtocol.parseState(bytes(states.getJSONObject("ended")))!!
        assertEquals(HostStatus.Ended, ended.status)
        assertEquals("finished", ended.endedReason)
    }

    @Test
    fun `rejects every invalid state in the contract`() {
        val invalid = fixtures.getJSONObject("state").getJSONArray("invalid")
        for (i in 0 until invalid.length()) {
            val case = invalid.getJSONObject(i)
            assertNull(case.getString("name"), WearProtocol.parseState(bytes(case.getJSONObject("payload"))))
        }
    }

    @Test
    fun `rejects text that is not a state`() {
        assertNull(WearProtocol.parseState("nope".toByteArray()))
        assertNull(WearProtocol.parseState("[]".toByteArray()))
        assertNull(WearProtocol.parseState("{}".toByteArray()))
    }

    @Test
    fun `a revision with a fraction or as text is not a revision`() {
        val base = fixtures.getJSONObject("state").getJSONObject("idle")
        assertNull(WearProtocol.parseState(bytes(JSONObject(base.toString()).put("revision", 1.5))))
        assertNull(WearProtocol.parseState(bytes(JSONObject(base.toString()).put("revision", "7"))))
        assertNull(WearProtocol.parseState(bytes(JSONObject(base.toString()).put("revision", -1))))
    }

    @Test
    fun `reads accepted and rejected results with their state`() {
        val results = fixtures.getJSONObject("result")
        val accepted = WearProtocol.parseResult(bytes(results.getJSONObject("accepted")))!!
        assertTrue(accepted.accepted)
        assertEquals("c-1", accepted.commandId)
        assertNull(accepted.reason)
        assertEquals(75_000L, accepted.state.rest!!.remainingMs)

        val rejected = WearProtocol.parseResult(bytes(results.getJSONObject("rejected")))!!
        assertFalse(rejected.accepted)
        assertEquals(WearProtocol.REASON_REST_MISMATCH, rejected.reason)
        assertEquals(HostStatus.Active, rejected.state.status)
        assertNull(rejected.state.rest)
    }

    @Test
    fun `a result without a valid state or id is not a result`() {
        val accepted = fixtures.getJSONObject("result").getJSONObject("accepted")
        assertNull(WearProtocol.parseResult(bytes(JSONObject(accepted.toString()).put("commandId", ""))))
        assertNull(WearProtocol.parseResult(bytes(JSONObject(accepted.toString()).put("state", JSONObject.NULL))))
        assertNull(WearProtocol.parseResult(bytes(JSONObject(accepted.toString()).put("v", 2))))
    }

    @Test
    fun `the commands the watch builds are what the contract accepts`() {
        val adjust = JSONObject(String(WearProtocol.adjustJson("c-1", "s-1", "r-1", -15)))
        val expected = fixtures.getJSONObject("adjust").getJSONArray("valid").getJSONObject(0).getJSONObject("payload")
        assertEquals(expected.getInt("v"), adjust.getInt("v"))
        for (key in listOf("commandId", "sessionId", "restId", "deltaSeconds")) {
            assertEquals(key, expected.get(key), adjust.get(key))
        }
        val request = JSONObject(String(WearProtocol.requestJson("req-1")))
        val validRequest = fixtures.getJSONObject("request").getJSONArray("valid").getJSONObject(0)
        assertEquals(validRequest.getString("requestId"), request.getString("requestId"))
        assertNotNull(request.get("v"))
    }
}
