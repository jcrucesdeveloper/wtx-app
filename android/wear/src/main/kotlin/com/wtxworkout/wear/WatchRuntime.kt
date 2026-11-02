package com.wtxworkout.wear

import android.content.Context
import android.os.SystemClock
import android.util.Log
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull

/** The two things the watch asks of the Wearable Data Layer, so the runtime is not tied to it. */
interface HostTransport {
    /** Node id of a reachable phone that declares the WTX host capability, or null. */
    suspend fun findHost(): String?

    /** Sends a message to [nodeId]. Throws if it cannot be queued for delivery. */
    suspend fun send(nodeId: String, path: String, payload: ByteArray)
}

/** MessageClient and CapabilityClient on the real Data Layer. */
class WearTransport(context: Context) : HostTransport {
    private val appContext = context.applicationContext
    private val capabilities = Wearable.getCapabilityClient(appContext)
    private val messages = Wearable.getMessageClient(appContext)

    override suspend fun findHost(): String? {
        val info = withTimeout(SEND_TIMEOUT_MS) {
            capabilities.getCapability(WearProtocol.CAPABILITY_HOST, CapabilityClient.FILTER_REACHABLE).await()
        }
        return pick(info.nodes)
    }

    override suspend fun send(nodeId: String, path: String, payload: ByteArray) {
        // A send into a Data Layer that is down can wait forever instead of failing.
        withTimeout(SEND_TIMEOUT_MS) { messages.sendMessage(nodeId, path, payload).await() }
    }

    fun listen(listener: CapabilityClient.OnCapabilityChangedListener) {
        capabilities.addListener(listener, WearProtocol.CAPABILITY_HOST)
    }

    fun stopListening(listener: CapabilityClient.OnCapabilityChangedListener) {
        capabilities.removeListener(listener)
    }

    companion object {
        private const val SEND_TIMEOUT_MS = 3_000L

        /** The phone itself if it is directly connected, otherwise any node that qualifies. */
        fun pick(nodes: Set<Node>): String? = (nodes.firstOrNull { it.isNearby } ?: nodes.firstOrNull())?.id
    }
}

/**
 * The watch is a client: it never decides the rest. This holds what the phone last confirmed,
 * sends the user's taps as commands, and runs the side effects of a state change (the end
 * alarm and the notification). It lives in the app process and is reachable from the
 * Activity and from the listener service, which is how background states are handled with no
 * screen open.
 */
class WatchRuntime(
    private val app: Context,
    private val transport: HostTransport,
    private val clock: () -> Long = SystemClock::elapsedRealtime,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
    private val state = MutableStateFlow(WatchModel())
    val model: StateFlow<WatchModel> = state

    private val latency = LatencyEstimator()
    private val requestSentAt = ConcurrentHashMap<String, Long>()
    private val lock = Any()

    @Volatile private var hostNode: String? = null

    private val capabilityListener = CapabilityClient.OnCapabilityChangedListener { info: CapabilityInfo ->
        onHostNode(WearTransport.pick(info.nodes))
    }

    @Volatile private var linkWatch: Job? = null

    /** The UI is visible: watch the link and ask the phone for the state. */
    fun attach() {
        (transport as? WearTransport)?.listen(capabilityListener)
        refresh()
        linkWatch?.cancel()
        linkWatch = scope.launch {
            // The capability list says who is *registered*, not who answers (a phone that walked
            // away can still be listed through the cloud route). So while the screen is on: retry
            // until the phone answers, and while resting, ask now and then to notice silence.
            var sinceAsked = 0L
            while (true) {
                delay(WATCH_STEP_MS)
                sinceAsked += WATCH_STEP_MS
                val current = state.value
                if (!current.fresh) {
                    refresh()
                    sinceAsked = 0
                } else if (current.host?.status == HostStatus.Resting && sinceAsked >= KEEPALIVE_MS) {
                    hostNode?.let { requestState(it) }
                    sinceAsked = 0
                }
            }
        }
    }

    fun detach() {
        linkWatch?.cancel()
        linkWatch = null
        (transport as? WearTransport)?.stopListening(capabilityListener)
    }

    /** Looks for the phone and asks for its state. Also used after a reboot. */
    fun refresh() {
        scope.launch {
            val node = try {
                transport.findHost()
            } catch (e: Exception) {
                Log.w(TAG, "capability lookup failed", e)
                null
            }
            onHostNode(node, force = true)
        }
    }

    /**
     * The phone's availability changed (also delivered to the manifest-declared listener with no
     * screen). When it is reachable and nothing is confirmed, ask: this is what re-arms the alarm
     * after a reboot, once the Data Layer reconnects.
     */
    fun onCapability(node: String?) = onHostNode(node)

    /** Re-runs the alarm and notification for the current state, e.g. after a permission is granted. */
    fun reapplyEffects() {
        synchronized(lock) { applyEffects(state.value.host) }
    }

    // --- Inbound (listener service) ---

    fun onStateBytes(bytes: ByteArray) {
        val parsed = WearProtocol.parseState(bytes)
        if (parsed == null) {
            Log.w(TAG, "ignoring an invalid state payload")
            return
        }
        val now = clock()
        val sentAt = parsed.inReplyTo?.let { requestSentAt.remove(it) }
        if (sentAt != null) latency.addRoundTrip(now - sentAt)
        mutate { WatchReducer.acceptState(it, parsed, now, latency.oneWayMs) }
        // Not confirmed by an answer (see WatchReducer.acceptState): get the phone to confirm it.
        if (!state.value.fresh) refresh()
    }

    fun onResultBytes(bytes: ByteArray) {
        val parsed = WearProtocol.parseResult(bytes)
        if (parsed == null) {
            Log.w(TAG, "ignoring an invalid result payload")
            return
        }
        val now = clock()
        mutate { WatchReducer.acceptResult(it, parsed, now, latency.oneWayMs) }
        parsed.reason?.let { if (!parsed.accepted) clearNoticeLater(Notice.Rejected(it)) }
    }

    // --- Outbound ---

    /**
     * The user tapped -step (direction -1) or +step (direction +1). Does nothing if the phone
     * cannot confirm it right now; the buttons are disabled in that case, so this is a guard
     * for a tap that raced with the state changing.
     */
    fun adjust(direction: Int) {
        val now = clock()
        val current = state.value
        val host = current.host
        val rest = host?.rest
        val sessionId = host?.sessionId
        if (host == null || rest == null || sessionId == null || !WatchReducer.canAdjust(current, now)) return
        val commandId = UUID.randomUUID().toString()
        val payload = WearProtocol.adjustJson(commandId, sessionId, rest.restId, direction * host.stepSeconds)
        mutate { WatchReducer.commandSent(it, commandId) }
        scope.launch { deliver(commandId, payload) }
    }

    /** Sends [payload] and waits for the phone's answer: one resend with the same id, then gives up. */
    private suspend fun deliver(commandId: String, payload: ByteArray) {
        suspend fun attempt(): Boolean {
            val node = hostNode ?: runCatching { transport.findHost() }.getOrNull()
            if (node == null) return false
            hostNode = node
            return try {
                transport.send(node, WearProtocol.PATH_ADJUST, payload)
                true
            } catch (e: Exception) {
                Log.w(TAG, "send failed", e)
                false
            }
        }

        fun settled() = commandId !in state.value.pending

        if (!attempt()) return fail(commandId, Notice.NotSent)
        withTimeoutOrNull(RESEND_AFTER_MS) { state.first { commandId !in it.pending } }
        if (settled()) return
        // No answer yet. The phone remembers command ids, so sending again cannot apply it twice.
        if (!attempt()) return fail(commandId, Notice.NotSent)
        withTimeoutOrNull(GIVE_UP_AFTER_MS) { state.first { commandId !in it.pending } }
        if (settled()) return
        fail(commandId, Notice.NoAnswer)
        // The tap may have been applied. Ask for the truth instead of guessing.
        hostNode?.let { requestState(it) }
    }

    private fun fail(commandId: String, notice: Notice) {
        mutate { WatchReducer.commandFailed(it, commandId, notice) }
        clearNoticeLater(notice)
    }

    private fun clearNoticeLater(notice: Notice) {
        scope.launch {
            delay(NOTICE_MS)
            mutate { if (it.notice == notice) WatchReducer.clearNotice(it) else it }
        }
    }

    /** @param force ask the phone even if the state looks fresh (the UI just opened). */
    private fun onHostNode(node: String?, force: Boolean = false) {
        hostNode = node
        val before = state.value
        mutate { WatchReducer.linkChanged(it, node != null) }
        // Ask whenever the phone is (again) reachable and nothing is confirmed yet.
        if (node != null && (force || before.link != Link.Connected || !before.fresh)) {
            scope.launch { requestState(node) }
        }
    }

    private suspend fun requestState(node: String) {
        val now = clock()
        requestSentAt.entries.removeIf { now - it.value > REQUEST_TTL_MS }
        val id = UUID.randomUUID().toString()
        requestSentAt[id] = now
        // Queued is not delivered: if nothing answers soon, the phone is not really there. Started
        // before sending because a send into a dead Data Layer can hang instead of failing.
        scope.launch {
            delay(REPLY_TIMEOUT_MS)
            if (requestSentAt.remove(id) != null) mutate { WatchReducer.linkChanged(it, false) }
        }
        try {
            transport.send(node, WearProtocol.PATH_REQUEST, WearProtocol.requestJson(id))
        } catch (e: Exception) {
            requestSentAt.remove(id)
            Log.w(TAG, "state request failed", e)
            mutate { WatchReducer.linkChanged(it, false) }
        }
    }

    // --- State and effects ---

    /** Serialises changes so two inbound messages cannot interleave their effects. */
    private fun mutate(change: (WatchModel) -> WatchModel) {
        synchronized(lock) {
            val before = state.value
            val after = change(before)
            if (after == before) return
            state.value = after
            if (after.link != before.link || after.fresh != before.fresh || after.host?.revision != before.host?.revision) {
                Log.i(TAG, "link=${after.link} fresh=${after.fresh} rev=${after.host?.revision} status=${after.host?.status} pending=${after.pending.size}")
            }
            if (after.host != before.host) applyEffects(after.host)
        }
    }

    private fun applyEffects(host: HostSnapshot?) {
        val now = clock()
        try {
            val plan = RestAlarmPlanner.plan(RestAlarms.scheduled(app), host, RestAlarms.vibratedRestId(app), now)
            RestAlarms.apply(app, plan)
            RestNotifier.sync(app, host, now)
        } catch (e: Exception) {
            Log.w(TAG, "could not apply the rest alarm/notification", e)
        }
    }

    companion object {
        private const val TAG = "WtxWatch"
        private const val RESEND_AFTER_MS = 1_500L
        private const val GIVE_UP_AFTER_MS = 2_500L
        private const val NOTICE_MS = 3_000L
        private const val REQUEST_TTL_MS = 10_000L
        private const val REPLY_TIMEOUT_MS = 3_000L
        private const val WATCH_STEP_MS = 5_000L
        private const val KEEPALIVE_MS = 10_000L

        @Volatile private var instance: WatchRuntime? = null

        fun get(context: Context): WatchRuntime =
            instance ?: synchronized(this) {
                instance ?: WatchRuntime(context.applicationContext, WearTransport(context)).also { instance = it }
            }
    }
}
