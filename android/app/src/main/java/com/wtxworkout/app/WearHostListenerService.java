package com.wtxworkout.app;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

/**
 * Receives the watch's messages (a state request, a rest adjustment). Declared in the
 * manifest, so the system starts it for a message even when the activity is closed: the
 * commands are not tied to a screen. It does nothing more than hand them to {@link WearHost}.
 */
public class WearHostListenerService extends WearableListenerService {

    @Override
    public void onMessageReceived(MessageEvent event) {
        WearHost host = WearHost.get(this);
        switch (event.getPath()) {
            case WearProtocol.PATH_REQUEST:
                host.handleRequest(event.getData(), event.getSourceNodeId());
                break;
            case WearProtocol.PATH_ADJUST:
                host.handleAdjust(event.getData(), event.getSourceNodeId());
                break;
            default:
                super.onMessageReceived(event);
        }
    }
}
