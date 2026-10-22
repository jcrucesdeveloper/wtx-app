package com.wtxworkout.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

/**
 * The end of a rest, kept apart from the plugin so it still happens after
 * the activity is gone (the foreground service keeps the process alive).
 * When the rest runs out it swaps the notification to its "after rest" face,
 * so the countdown never runs past zero, and buzzes if the setting is on and
 * the app isn't on screen (in the app, JS buzzes instead).
 *
 * A Handler alone isn't enough: its delays stop counting while the CPU
 * sleeps (screen locked), so the countdown would read negative until the
 * phone woke. So while a rest runs this holds a partial wake lock (released
 * at the end, and with a timeout as a backstop), and on screen-on it checks
 * the wall clock again in case the deadline slipped by anyway.
 *
 * Main thread only.
 */
final class SessionRestEnd {

    /** Two pulses, like the app's rest-over buzz (HapticsService.restOver): wait, on, off, on. */
    private static final long[] PATTERN = { 0, 400, 200, 400 };
    /** Extra time the wake lock is held past the deadline, in case the end runs a little late. */
    private static final long WAKE_LOCK_SLACK_MS = 10_000;

    private static final Handler handler = new Handler(Looper.getMainLooper());
    private static final Runnable onDeadline = SessionRestEnd::checkNow;

    private static Context appContext;
    /** The pending rest's deadline (epoch ms); 0 when none is pending. */
    private static long endsAt;
    private static Notification after;
    private static boolean vibrate;
    private static PowerManager.WakeLock wakeLock;
    private static BroadcastReceiver screenOn;

    /** Whether the app's activity is on screen; set by the plugin as it resumes and pauses. */
    static volatile boolean appInForeground = true;

    private SessionRestEnd() {}

    /** Arranges for {@code afterRest} to replace the notification at {@code deadline}, replacing any pending rest. */
    static void schedule(Context context, long deadline, Notification afterRest, boolean vibrateAtEnd) {
        cancel();
        appContext = context.getApplicationContext();
        endsAt = deadline;
        after = afterRest;
        vibrate = vibrateAtEnd;
        long delay = Math.max(0, deadline - System.currentTimeMillis());
        acquireWakeLock(delay + WAKE_LOCK_SLACK_MS);
        listenForScreenOn();
        handler.postDelayed(onDeadline, delay);
    }

    /**
     * Before the notification is redrawn: a rest that has already run out
     * still ends properly (its buzz isn't lost to the redraw); one still
     * running is simply dropped, since the redraw schedules its own.
     */
    static void settle() {
        if (endsAt > 0 && System.currentTimeMillis() >= endsAt) end(false);
        else cancel();
    }

    /** Drops the pending rest without ending it (the workout was finished or discarded). */
    static void cancel() {
        handler.removeCallbacks(onDeadline);
        endsAt = 0;
        after = null;
        releaseWakeLock();
        stopListeningForScreenOn();
    }

    /** Ends the rest if its deadline has passed, else waits again for what's left of it. */
    private static void checkNow() {
        if (endsAt == 0) return;
        long left = endsAt - System.currentTimeMillis();
        if (left <= 0) {
            end(true);
        } else {
            handler.removeCallbacks(onDeadline);
            handler.postDelayed(onDeadline, left);
        }
    }

    /** Shows the "after rest" face (when {@code post}) and buzzes, then lets go of everything. */
    private static void end(boolean post) {
        Context context = appContext;
        Notification face = after;
        boolean buzz = vibrate;
        cancel();
        if (context == null) return;
        // `current` is null once the workout ended; then there's nothing to update or buzz for.
        if (SessionNotificationPlugin.current == null) return;
        if (post && face != null) {
            SessionNotificationPlugin.current = face;
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.notify(SessionNotificationPlugin.NOTIFICATION_ID, face);
        }
        if (buzz && !appInForeground) vibrate(context);
    }

    /**
     * Buzzes with alarm usage: what a timer running out is, and a usage
     * Android lets vibrate from the background.
     */
    private static void vibrate(Context context) {
        Vibrator vibrator;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager != null ? manager.getDefaultVibrator() : null;
        } else {
            vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        }
        if (vibrator == null || !vibrator.hasVibrator()) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                vibrator.vibrate(
                    VibrationEffect.createWaveform(PATTERN, -1),
                    VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM)
                );
            } else {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(PATTERN, -1), attributes);
                } else {
                    vibrator.vibrate(PATTERN, -1, attributes);
                }
            }
        } catch (RuntimeException e) {
            // No vibration this time; the notification has still changed.
        }
    }

    private static void acquireWakeLock(long timeoutMs) {
        PowerManager power = (PowerManager) appContext.getSystemService(Context.POWER_SERVICE);
        if (power == null) return;
        try {
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wtx:rest");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(timeoutMs);
        } catch (RuntimeException e) {
            // Without it the end may run late; the screen-on check still keeps the clock honest.
            wakeLock = null;
        }
    }

    private static void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    private static void listenForScreenOn() {
        screenOn = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                checkNow();
            }
        };
        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                appContext.registerReceiver(screenOn, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                appContext.registerReceiver(screenOn, filter);
            }
        } catch (RuntimeException e) {
            screenOn = null;
        }
    }

    private static void stopListeningForScreenOn() {
        if (screenOn == null || appContext == null) return;
        try {
            appContext.unregisterReceiver(screenOn);
        } catch (RuntimeException e) {
            // Already gone.
        }
        screenOn = null;
    }
}
