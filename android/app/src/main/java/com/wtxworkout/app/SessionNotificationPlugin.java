package com.wtxworkout.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The ongoing "workout in progress" notification: the current exercise with
 * its image and next set, or a rest countdown drawn by the system
 * (chronometer), so it keeps counting without the web view running. When the
 * rest ends, a timer here swaps in the "after rest" content JS sent along.
 *
 * Held by {@link SessionNotificationService}, a foreground service, so the
 * process (and that timer) stays alive while the app is in the background.
 */
@CapacitorPlugin(name = "WtxSessionNotification")
public class SessionNotificationPlugin extends Plugin {

    static final String CHANNEL_ID = "wtx_session";
    static final int NOTIFICATION_ID = 4201;
    static final String EXTRA_OPEN_SESSION = "com.wtxworkout.app.OPEN_SESSION";

    /** What the service shows when it starts; the latest posted notification. */
    static volatile Notification current;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable restEnd;
    private boolean serviceStarted = false;
    private String lastIconBase64;
    private Bitmap lastIcon;

    @Override
    public void load() {
        // Cold start from the notification: the event waits for the JS listener.
        Intent intent = getActivity().getIntent();
        if (isOpenSessionIntent(intent)) {
            intent.removeExtra(EXTRA_OPEN_SESSION);
            notifyListeners("tap", new JSObject(), true);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (isOpenSessionIntent(intent)) {
            intent.removeExtra(EXTRA_OPEN_SESSION);
            notifyListeners("tap", new JSObject(), true);
        }
    }

    private static boolean isOpenSessionIntent(Intent intent) {
        return intent != null && intent.getBooleanExtra(EXTRA_OPEN_SESSION, false);
    }

    @PluginMethod
    public void show(PluginCall call) {
        Context context = getContext();
        JSObject data = call.getData();
        ensureChannel(context, data.optString("channelName", "Workout"), data.optString("channelDescription", ""));

        long startedAt = data.optLong("startedAt", System.currentTimeMillis());
        long restEndsAt = data.optLong("restEndsAt", 0);
        long now = System.currentTimeMillis();
        boolean resting = restEndsAt > now;

        Notification notification = build(context, data, resting ? restEndsAt : startedAt, resting);

        cancelRestEnd();
        JSObject afterRest = call.getObject("afterRest");
        if (resting && afterRest != null) {
            final Notification after = build(context, afterRest, startedAt, false);
            restEnd = () -> {
                restEnd = null;
                post(context, after);
            };
            handler.postDelayed(restEnd, restEndsAt - now);
        }

        post(context, notification);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        cancelRestEnd();
        current = null;
        Context context = getContext();
        // Always: after an activity restart this plugin instance may not be the one that started it.
        context.stopService(new Intent(context, SessionNotificationService.class));
        serviceStarted = false;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        cancelRestEnd();
        super.handleOnDestroy();
    }

    private void cancelRestEnd() {
        if (restEnd != null) {
            handler.removeCallbacks(restEnd);
            restEnd = null;
        }
    }

    /** The first post starts the foreground service; later ones update its notification in place. */
    private void post(Context context, Notification notification) {
        current = notification;
        if (!serviceStarted) {
            serviceStarted = true;
            try {
                Intent intent = new Intent(context, SessionNotificationService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
                else context.startService(intent);
                return;
            } catch (RuntimeException e) {
                // Not allowed to start one right now (e.g. app in the background): a plain notification still helps.
                serviceStarted = false;
            }
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification);
    }

    private Notification build(Context context, JSObject face, long when, boolean countDown) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);

        builder
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setContentTitle(face.optString("title", ""))
            .setContentText(face.optString("body", ""))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setWhen(when)
            .setUsesChronometer(true)
            .setChronometerCountDown(countDown)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openSessionIntent(context));

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setPriority(Notification.PRIORITY_LOW);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }

        Bitmap icon = decodeIcon(face.optString("largeIcon", ""));
        if (icon != null) builder.setLargeIcon(icon);

        return builder.build();
    }

    private Bitmap decodeIcon(String base64) {
        if (base64 == null || base64.isEmpty()) return null;
        if (base64.equals(lastIconBase64)) return lastIcon;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            lastIconBase64 = base64;
            lastIcon = bitmap;
            return bitmap;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private PendingIntent openSessionIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra(EXTRA_OPEN_SESSION, true);
        return PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** Low importance: it stays in the shade without sound or a heads-up on every update. */
    private static void ensureChannel(Context context, String name, String description) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW);
        channel.setDescription(description);
        channel.setShowBadge(false);
        // Re-creating an existing channel only updates its name and description (e.g. after a language change).
        manager.createNotificationChannel(channel);
    }
}
