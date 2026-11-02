package com.wtxworkout.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.BeforeClass;
import org.junit.Test;

/** Checks the phone's reading and writing of the protocol against the shared fixtures. */
public class WearProtocolTest {

    private static JSONObject fixtures;

    @BeforeClass
    public static void loadFixtures() throws Exception {
        // Unit tests run with the module as the working directory.
        File file = new File("../protocol/wear-v1.json");
        fixtures = new JSONObject(new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8));
    }

    /** Same keys and values, numbers by value (the SDK's org.json has no `similar`). */
    private static boolean same(Object a, Object b) {
        if (a instanceof JSONObject && b instanceof JSONObject) {
            JSONObject x = (JSONObject) a;
            JSONObject y = (JSONObject) b;
            if (x.length() != y.length()) return false;
            java.util.Iterator<String> keys = x.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                if (!y.has(key) || !same(x.opt(key), y.opt(key))) return false;
            }
            return true;
        }
        if (a instanceof Number && b instanceof Number) return ((Number) a).doubleValue() == ((Number) b).doubleValue();
        if (a == JSONObject.NULL || b == JSONObject.NULL) return a == JSONObject.NULL && b == JSONObject.NULL;
        return a != null && a.equals(b);
    }

    private static void assertSame(JSONObject written, JSONObject expected) {
        assertTrue("written: " + written + " expected: " + expected, same(written, expected));
    }

    private static byte[] bytes(JSONObject json) {
        return WearProtocol.bytes(json);
    }

    @Test
    public void pathsAndCapabilityAreTheSharedOnes() throws Exception {
        JSONObject paths = fixtures.getJSONObject("paths");
        assertEquals(paths.getString("state"), WearProtocol.PATH_STATE);
        assertEquals(paths.getString("request"), WearProtocol.PATH_REQUEST);
        assertEquals(paths.getString("adjust"), WearProtocol.PATH_ADJUST);
        assertEquals(paths.getString("result"), WearProtocol.PATH_RESULT);
        assertEquals(fixtures.getString("capability"), WearProtocol.CAPABILITY_HOST);
        assertEquals(fixtures.getInt("version"), WearProtocol.VERSION);
    }

    @Test
    public void readsValidRequests() throws Exception {
        JSONArray valid = fixtures.getJSONObject("request").getJSONArray("valid");
        for (int i = 0; i < valid.length(); i++) {
            JSONObject payload = valid.getJSONObject(i);
            assertEquals(payload.getString("requestId"), WearProtocol.parseRequestId(bytes(payload)));
        }
    }

    @Test
    public void rejectsInvalidRequests() throws Exception {
        JSONArray invalid = fixtures.getJSONObject("request").getJSONArray("invalid");
        for (int i = 0; i < invalid.length(); i++) {
            JSONObject c = invalid.getJSONObject(i);
            try {
                WearProtocol.parseRequestId(bytes(c.getJSONObject("payload")));
                fail("accepted: " + c.getString("name"));
            } catch (WearProtocol.InvalidMessage e) {
                assertEquals(c.getString("name"), c.getString("reason"), e.reason);
            }
        }
    }

    @Test
    public void readsValidAdjustCommands() throws Exception {
        JSONArray valid = fixtures.getJSONObject("adjust").getJSONArray("valid");
        for (int i = 0; i < valid.length(); i++) {
            JSONObject c = valid.getJSONObject(i);
            JSONObject expect = c.getJSONObject("expect");
            WearProtocol.AdjustCommand command = WearProtocol.parseAdjust(bytes(c.getJSONObject("payload")));
            assertEquals(expect.getString("commandId"), command.commandId);
            assertEquals(expect.getString("sessionId"), command.sessionId);
            assertEquals(expect.getString("restId"), command.restId);
            assertEquals(expect.getInt("deltaSeconds"), command.deltaSeconds);
        }
    }

    @Test
    public void rejectsInvalidAdjustCommands_andNamesThemWhenItCan() throws Exception {
        JSONArray invalid = fixtures.getJSONObject("adjust").getJSONArray("invalid");
        for (int i = 0; i < invalid.length(); i++) {
            JSONObject c = invalid.getJSONObject(i);
            try {
                WearProtocol.parseAdjust(bytes(c.getJSONObject("payload")));
                fail("accepted: " + c.getString("name"));
            } catch (WearProtocol.InvalidMessage e) {
                assertEquals(c.getString("name"), c.getString("reason"), e.reason);
                assertEquals(c.getString("name"), c.getString("commandId"), e.commandId);
            }
        }
    }

    @Test
    public void rejectsPayloadsThatAreNotJsonObjects() throws Exception {
        for (String junk : new String[] { "", "not json", "[1,2]", "null" }) {
            try {
                WearProtocol.parseAdjust(junk.getBytes(StandardCharsets.UTF_8));
                fail("accepted: " + junk);
            } catch (WearProtocol.InvalidMessage e) {
                assertEquals(RestHostCore.INVALID_PAYLOAD, e.reason);
            }
        }
    }

    @Test
    public void writesTheRestingStateAsTheFixtureSays() throws Exception {
        RestHostCore.Snapshot snapshot = new RestHostCore.Snapshot(
            42,
            RestHostCore.Status.RESTING,
            "s-1",
            null,
            "r-1",
            90_000,
            90_000,
            15,
            true,
            "Push day",
            new RestHostCore.NextAction("set", "Bench Press", "Set 2 of 3", "60 kg × 8")
        );
        JSONObject written = WearProtocol.stateJson("host-1", snapshot, "req-1");
        assertSame(written, fixtures.getJSONObject("state").getJSONObject("resting"));
    }

    @Test
    public void writesIdleAndEndedStatesAsTheFixtureSays() throws Exception {
        RestHostCore.Snapshot idle = new RestHostCore.Snapshot(
            43, RestHostCore.Status.IDLE, null, null, null, 0, 0, 15, true, "", null);
        assertSame(WearProtocol.stateJson("host-1", idle, null), fixtures.getJSONObject("state").getJSONObject("idle"));

        RestHostCore.Snapshot ended = new RestHostCore.Snapshot(
            44, RestHostCore.Status.ENDED, "s-1", "finished", null, 0, 0, 15, true, "", null);
        assertSame(WearProtocol.stateJson("host-1", ended, null), fixtures.getJSONObject("state").getJSONObject("ended"));
    }

    @Test
    public void writesAResultAsTheFixtureSays() throws Exception {
        JSONObject accepted = fixtures.getJSONObject("result").getJSONObject("accepted");
        JSONObject written = WearProtocol.resultJson("c-1", true, null, false, accepted.getJSONObject("state"));
        assertSame(written, accepted);

        JSONObject rejected = fixtures.getJSONObject("result").getJSONObject("rejected");
        JSONObject writtenRejected = WearProtocol.resultJson("c-9", false, "rest_mismatch", false, rejected.getJSONObject("state"));
        assertSame(writtenRejected, rejected);
    }
}
