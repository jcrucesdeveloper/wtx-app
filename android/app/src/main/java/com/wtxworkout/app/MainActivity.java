package com.wtxworkout.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins register before the bridge starts.
        registerPlugin(SessionNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
