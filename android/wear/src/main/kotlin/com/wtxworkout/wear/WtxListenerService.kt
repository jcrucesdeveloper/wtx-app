package com.wtxworkout.wear

import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * Receives what the phone sends, declared in the manifest: Google Play services starts this
 * service (and the app's process) when the phone publishes a state or answers a command, even
 * with no Activity. It only hands the bytes to [WatchRuntime], which updates the model, the end
 * alarm and the notification; it holds nothing itself.
 */
class WtxListenerService : WearableListenerService() {
    private val runtime get() = WatchRuntime.get(this)

    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type != DataEvent.TYPE_CHANGED) continue
            val item = event.dataItem
            if (item.uri.path != WearProtocol.PATH_STATE) continue
            val payload = item.data ?: continue
            runtime.onStateBytes(payload)
        }
    }

    override fun onCapabilityChanged(info: CapabilityInfo) {
        runtime.onCapability(WearTransport.pick(info.nodes))
    }

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            WearProtocol.PATH_STATE -> runtime.onStateBytes(event.data)
            WearProtocol.PATH_RESULT -> runtime.onResultBytes(event.data)
        }
    }
}
