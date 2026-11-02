package com.wtxworkout.wear

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status

/**
 * The rest in progress, visible outside the app: a quiet notification plus an Ongoing
 * Activity, which on Wear OS puts a countdown chip on the watch face and the recents.
 *
 * The countdown is drawn by the system from an end time (a chronometer), so this code posts
 * once per state change, not once per second, and costs nothing while waiting. The sound
 * and vibration at the end are not here: that is [RestAlarms].
 *
 * Without the notification permission (API 33+) nothing is shown; the rest and its alarm
 * keep working, which is why this is never a precondition for them.
 */
object RestNotifier {
    private const val CHANNEL_ID = "wtx_rest"
    private const val NOTIFICATION_ID = 4101
    /** Slack after the end before the system drops it, in case the alarm is late. */
    private const val TIMEOUT_SLACK_MS = 5_000L

    fun canNotify(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    /** Shows or updates the notification for a running rest, or removes it. */
    fun sync(context: Context, host: HostSnapshot?, now: Long) {
        val rest = host?.rest
        if (host == null || host.status != HostStatus.Resting || rest == null || rest.remainingMs(now) <= 0) {
            cancel(context)
            return
        }
        if (!canNotify(context)) return
        ensureChannel(context)

        val remaining = rest.remainingMs(now)
        val endWall = System.currentTimeMillis() + remaining
        val next = host.next
        val text = when {
            next == null || next.isDone -> context.getString(R.string.notif_all_done)
            else -> listOf(next.exercise, next.position).filter { it.isNotBlank() }.joinToString(" · ")
        }
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notif_rest_title))
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(true)
            .setWhen(endWall)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setTimeoutAfter(remaining + TIMEOUT_SLACK_MS)
            .setContentIntent(open)

        val status = Status.Builder()
            .addTemplate("#time#")
            .addPart("time", Status.TimerPart(endWall))
            .build()
        OngoingActivity.Builder(context.applicationContext, NOTIFICATION_ID, builder)
            .setStaticIcon(R.drawable.ic_notification)
            .setTouchIntent(open)
            .setStatus(status)
            .build()
            .apply(context.applicationContext)

        post(context, builder)
    }

    // canNotify() was checked by the only caller; the catch covers the permission being revoked meanwhile.
    @SuppressLint("MissingPermission")
    private fun post(context: Context, builder: NotificationCompat.Builder) {
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
        } catch (e: SecurityException) {
            Log.w("WtxNotifier", "notification not allowed", e)
        }
    }

    fun cancel(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = context.getString(R.string.notif_channel_description)
                setSound(null, null)
                enableVibration(false)
            },
        )
    }
}
