package com.wtxworkout.wear

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private val runtime by lazy { WatchRuntime.get(this) }

    // The notification (and the Ongoing Activity chip) needs this permission on API 33+. The rest
    // alarm and the vibration do not: refusing only hides the visible countdown outside the app.
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) runtime.reapplyEffects()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WtxTheme {
                WatchRoot(runtime)
            }
        }
        if (!RestNotifier.canNotify(this) && !wasAsked()) {
            markAsked()
            askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    override fun onStart() {
        super.onStart()
        runtime.attach()
    }

    override fun onStop() {
        runtime.detach()
        super.onStop()
    }

    private fun wasAsked() = getSharedPreferences("wtx_prompts", MODE_PRIVATE).getBoolean("notifications", false)

    private fun markAsked() {
        getSharedPreferences("wtx_prompts", MODE_PRIVATE).edit().putBoolean("notifications", true).apply()
    }
}
