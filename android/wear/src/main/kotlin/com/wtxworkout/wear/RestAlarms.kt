package com.wtxworkout.wear

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.SystemClock
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log

/**
 * The watch's own end-of-rest alarm: an AlarmManager alarm that wakes a manifest receiver, so
 * it works with the screen off, the app closed, and after the process was killed. The state it
 * needs (which rest, when) is kept in SharedPreferences, not in memory.
 *
 * Why AlarmManager and not a foreground service or a wake lock (the phone keeps a wake lock):
 * a rest is a short wait the user spends looking elsewhere, and the watch has a small battery.
 * An alarm costs nothing while waiting and wakes the device for one vibration; a service
 * would keep the process alive for the whole rest. The Ongoing Activity notification is only
 * the visible countdown, drawn by the system (a chronometer), not by this app.
 *
 * Limits (documented in the README): the alarm is exact only if the user allows exact
 * alarms for the app; otherwise it is inexact and Android may delay it by seconds to
 * minutes. A force stop and a reboot clear alarms; once the app is woken again (boot receiver,
 * or the Data Layer reconnecting) the runtime asks the phone for the state and re-arms the
 * alarm if the rest is still running. Nothing wakes it if the link never changes.
 */
object RestAlarms {
    private const val TAG = "WtxRestAlarms"
    private const val PREFS = "wtx_rest_alarm"
    private const val KEY_REST_ID = "scheduledRestId"
    private const val KEY_DEADLINE = "scheduledDeadline"
    private const val KEY_BOOT = "scheduledBoot"
    private const val KEY_VIBRATED = "vibratedRestId"
    private const val REQUEST_CODE = 7001

    /** An alarm intent that arrives this much before the stored deadline is a stale one. */
    private const val EARLY_TOLERANCE_MS = 1_000L

    private val lock = Any()

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun bootCount(context: Context): Int =
        Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, 0)

    /**
     * The alarm that is set now, or null. One set before the last reboot no longer exists, and
     * neither does one whose PendingIntent was dropped (a force stop cancels them without
     * touching our SharedPreferences), so both are reported as "none" and get re-armed.
     */
    fun scheduled(context: Context): RestAlarmPlanner.Scheduled? = synchronized(lock) {
        val p = prefs(context)
        val restId = p.getString(KEY_REST_ID, null) ?: return null
        if (p.getInt(KEY_BOOT, -1) != bootCount(context)) return null
        if (!pendingIntentExists(context)) return null
        RestAlarmPlanner.Scheduled(restId, p.getLong(KEY_DEADLINE, 0))
    }

    fun vibratedRestId(context: Context): String? = synchronized(lock) {
        prefs(context).getString(KEY_VIBRATED, null)
    }

    /** Applies what [RestAlarmPlanner] decided. */
    fun apply(context: Context, plan: RestAlarmPlanner.Plan) {
        when (plan) {
            RestAlarmPlanner.Plan.None, RestAlarmPlanner.Plan.Keep -> Unit
            RestAlarmPlanner.Plan.Cancel -> cancel(context)
            is RestAlarmPlanner.Plan.Schedule -> schedule(context, plan.restId, plan.deadlineMs)
            is RestAlarmPlanner.Plan.FireNow -> fire(context, plan.restId, early = true)
        }
    }

    private fun pendingIntent(context: Context, restId: String?): PendingIntent {
        val intent = Intent(context, RestEndReceiver::class.java)
            .setPackage(context.packageName)
            .putExtra(RestEndReceiver.EXTRA_REST_ID, restId)
        return PendingIntent.getBroadcast(
            context.applicationContext,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    private fun pendingIntentExists(context: Context): Boolean {
        val intent = Intent(context, RestEndReceiver::class.java).setPackage(context.packageName)
        return PendingIntent.getBroadcast(
            context.applicationContext,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
        ) != null
    }

    private fun schedule(context: Context, restId: String, deadlineMs: Long) = synchronized(lock) {
        val manager = context.getSystemService(AlarmManager::class.java)
        val target = pendingIntent(context, restId)
        // elapsedRealtime-based types: immune to wall-clock changes and time zone, and they
        // count the time the watch is asleep.
        val triggerAt = deadlineMs.coerceAtLeast(SystemClock.elapsedRealtime())
        try {
            if (manager.canScheduleExactAlarms()) {
                manager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, target)
            } else {
                // Not allowed to be exact: the system may delay it. We do not promise otherwise.
                manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, target)
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "alarm not allowed", e)
            return@synchronized
        }
        prefs(context).edit()
            .putString(KEY_REST_ID, restId)
            .putLong(KEY_DEADLINE, triggerAt)
            .putInt(KEY_BOOT, bootCount(context))
            .apply()
    }

    private fun cancel(context: Context) = synchronized(lock) {
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, null))
        prefs(context).edit().remove(KEY_REST_ID).remove(KEY_DEADLINE).remove(KEY_BOOT).apply()
        RestNotifier.cancel(context)
    }

    /**
     * Vibrates for the end of [restId], at most once per rest, and only if that rest is still
     * the one the alarm was set for (a cancelled or replaced alarm may still deliver an
     * intent that was already on its way).
     *
     * @param early true when called because the phone reported the end a moment before the
     *   alarm, so the deadline check is skipped.
     * @return whether it vibrated.
     */
    fun fire(context: Context, restId: String, early: Boolean = false): Boolean {
        synchronized(lock) {
            val p = prefs(context)
            val storedRest = p.getString(KEY_REST_ID, null)
            if (storedRest != restId) return false
            val deadline = p.getLong(KEY_DEADLINE, 0)
            val stale = !early && SystemClock.elapsedRealtime() + EARLY_TOLERANCE_MS < deadline
            if (stale || p.getString(KEY_VIBRATED, null) == restId) {
                if (!stale) p.edit().remove(KEY_REST_ID).remove(KEY_DEADLINE).remove(KEY_BOOT).apply()
                return false
            }
            context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, null))
            p.edit()
                .putString(KEY_VIBRATED, restId)
                .remove(KEY_REST_ID).remove(KEY_DEADLINE).remove(KEY_BOOT)
                .apply()
        }
        vibrate(context)
        RestNotifier.cancel(context)
        return true
    }

    private fun vibrate(context: Context) {
        val vibrator = context.getSystemService(VibratorManager::class.java)?.defaultVibrator ?: return
        if (!vibrator.hasVibrator()) return
        // Three pulses, the last long: noticeable on the wrist, short enough not to startle.
        val effect = VibrationEffect.createWaveform(longArrayOf(0, 250, 120, 250, 120, 500), -1)
        // Alarm usage so it is felt even if the watch is in do-not-disturb with alarms allowed.
        vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM))
    }
}

/** Receives the alarm. Declared in the manifest, not tied to any Activity or the runtime. */
class RestEndReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val restId = intent.getStringExtra(EXTRA_REST_ID) ?: return
        RestAlarms.fire(context, restId)
    }

    companion object {
        const val EXTRA_REST_ID = "restId"
    }
}

/** After a reboot all alarms are gone: ask the phone for the state and arm again if still resting. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        WatchRuntime.get(context).refresh()
    }
}
