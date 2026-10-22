package com.wtxworkout.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The ongoing "workout in progress" notification. While resting it reads
 * "Resting" over a big countdown with what comes next, and has −/+/skip
 * actions; otherwise the current exercise and next set over the workout
 * clock. The clock is a system-drawn Chronometer, so it keeps ticking without
 * the web view running; when the rest ends, {@link SessionRestEnd} swaps in
 * the "after rest" face JS sent along (and buzzes, if the setting is on).
 *
 * It can't be dismissed while the workout runs: ongoing, and on Android 14+
 * (where users can swipe ongoing notifications away) posted again from its
 * delete intent by {@link SessionNotificationReceiver}.
 *
 * Held by {@link SessionNotificationService}, a foreground service, so the
 * process (and that timer) stays alive while the app is in the background.
 */
@CapacitorPlugin(name = "WtxSessionNotification")
public class SessionNotificationPlugin extends Plugin {

    /**
     * Default importance without sound or vibration, so it sits with the
     * alerting notifications at the top of the shade instead of under
     * "Silent". A channel's importance can't change once made, hence a new id.
     */
    static final String CHANNEL_ID = "wtx_workout";
    /** The first channel: low importance, so it was filed under "Silent". */
    private static final String OLD_CHANNEL_ID = "wtx_session";
    static final int NOTIFICATION_ID = 4201;
    static final String EXTRA_OPEN_SESSION = "com.wtxworkout.app.OPEN_SESSION";

    /** The app's accent, for the small icon and action labels. */
    private static final int ACCENT = 0xFFE0263A;

    /** What the service shows when it starts, and what a dismissal puts back; `null` once the workout ends. */
    static volatile Notification current;

    /** The live plugin, for the notification's rest actions; `null` while there's no bridge. */
    private static SessionNotificationPlugin instance;

    private boolean serviceStarted = false;

    /** The latest options from JS, so a rest action can redraw without a round trip. */
    private JSObject lastOptions;
    /** The rest deadline currently drawn (epoch ms); 0 when not resting. */
    private long restEndsAt;

    @Override
    public void load() {
        instance = this;
        SessionRestEnd.appInForeground = true;
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

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        SessionRestEnd.appInForeground = true;
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        // Paused also covers a locked screen: the rest-end buzz is the native side's then.
        SessionRestEnd.appInForeground = false;
    }

    private static boolean isOpenSessionIntent(Intent intent) {
        return intent != null && intent.getBooleanExtra(EXTRA_OPEN_SESSION, false);
    }

    @PluginMethod
    public void show(PluginCall call) {
        JSObject data = call.getData();
        ensureChannel(getContext(), data.optString("channelName", "Workout"), data.optString("channelDescription", ""));
        lastOptions = data;
        restEndsAt = data.optLong("restEndsAt", 0);
        render();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        SessionRestEnd.cancel();
        current = null;
        lastOptions = null;
        restEndsAt = 0;
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
        // The rest end is left pending: the service outlives the activity, and the countdown must still stop at zero.
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    /**
     * A rest action from the notification: redraws it at once, then tells JS
     * so the session's rest moves the same way. Ignored once the rest is over.
     */
    static void onRestAction(String action) {
        SessionNotificationPlugin plugin = instance;
        if (plugin != null) plugin.applyRestAction(action);
    }

    private void applyRestAction(String action) {
        if (lastOptions == null) return;
        long now = System.currentTimeMillis();
        if (restEndsAt <= now) return;
        int step = lastOptions.optInt("restStep", 15);
        if (SessionNotificationReceiver.ACTION_SKIP.equals(action)) {
            restEndsAt = 0;
        } else {
            long delta = (SessionNotificationReceiver.ACTION_LESS.equals(action) ? -step : step) * 1000L;
            restEndsAt = Math.max(now, restEndsAt + delta);
            if (restEndsAt <= now) restEndsAt = 0;
        }
        render();

        JSObject event = new JSObject();
        event.put("action", action);
        event.put("seconds", step);
        notifyListeners("restAction", event);
    }

    /** Draws the latest options: the rest face (with its end scheduled) or the working face. */
    private void render() {
        if (lastOptions == null) return;
        Context context = getContext();
        long startedAt = lastOptions.optLong("startedAt", System.currentTimeMillis());
        long now = System.currentTimeMillis();
        boolean resting = restEndsAt > now;
        JSObject afterRest = lastOptions.getJSObject("afterRest");

        SessionRestEnd.settle();
        Notification notification;
        if (resting) {
            notification = build(context, lastOptions, restEndsAt, true);
            Notification after = build(context, afterRest != null ? afterRest : lastOptions, startedAt, false);
            SessionRestEnd.schedule(context, restEndsAt, after, lastOptions.optBoolean("vibrateOnRestEnd", true));
        } else {
            // A rest that ended (or was skipped) natively shows what comes after it.
            JSObject face = lastOptions.optLong("restEndsAt", 0) > 0 && afterRest != null ? afterRest : lastOptions;
            notification = build(context, face, startedAt, false);
        }
        post(context, notification);
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

    /**
     * One face of the notification. {@code when} is the rest deadline when
     * {@code countDown}, else the workout start the clock counts up from.
     */
    private Notification build(Context context, JSObject face, long when, boolean countDown) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);

        String title = face.optString("title", "");
        String body = face.optString("body", "");
        String detail = face.optString("detail", "");

        // The clock runs on elapsed-realtime; a countdown is pushed by just under a second so it
        // reads like the app's (rounded up) and shows 0:00 only as it ends.
        long sinceBoot = SystemClock.elapsedRealtime();
        long now = System.currentTimeMillis();
        long base = countDown ? sinceBoot + (when - now) + 999 : sinceBoot - (now - when);

        RemoteViews collapsed = new RemoteViews(context.getPackageName(), R.layout.notification_session_collapsed);
        RemoteViews expanded = new RemoteViews(context.getPackageName(), R.layout.notification_session_expanded);
        for (RemoteViews views : new RemoteViews[] { collapsed, expanded }) {
            views.setTextViewText(R.id.session_title, title);
            views.setTextViewText(R.id.session_body, body);
            views.setViewVisibility(R.id.session_body, body.isEmpty() ? View.GONE : View.VISIBLE);
            views.setChronometer(R.id.session_clock, base, null, true);
            views.setChronometerCountDown(R.id.session_clock, countDown);
        }
        expanded.setTextViewText(R.id.session_detail, detail);
        expanded.setViewVisibility(R.id.session_detail, detail.isEmpty() ? View.GONE : View.VISIBLE);

        builder
            .setSmallIcon(R.drawable.ic_stat_workout)
            .setColor(ACCENT)
            // Plain text too: what accessibility services, watches and the fallback templates read.
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.DecoratedCustomViewStyle())
            .setCustomContentView(collapsed)
            .setCustomBigContentView(expanded)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            // The clock is in the content; a second one in the header would only compete with it.
            .setShowWhen(false)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openSessionIntent(context))
            .setDeleteIntent(SessionNotificationReceiver.pendingIntent(context, SessionNotificationReceiver.ACTION_DISMISSED));

        builder.setCategory(
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? Notification.CATEGORY_WORKOUT : Notification.CATEGORY_PROGRESS
        );
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Android 7: no channel, so no sound or vibration is set here and it stays quiet.
            builder.setPriority(Notification.PRIORITY_DEFAULT);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }

        if (countDown) {
            builder.addAction(action(context, lastOptions.optString("lessLabel", "−15 s"), SessionNotificationReceiver.ACTION_LESS));
            builder.addAction(action(context, lastOptions.optString("moreLabel", "+15 s"), SessionNotificationReceiver.ACTION_MORE));
            builder.addAction(action(context, lastOptions.optString("skipLabel", "Skip"), SessionNotificationReceiver.ACTION_SKIP));
        }

        Notification notification = builder.build();
        // Ongoing already keeps it out of "Clear all"; say so explicitly for every launcher and OEM shade.
        notification.flags |= Notification.FLAG_NO_CLEAR;
        return notification;
    }

    private static Notification.Action action(Context context, String label, String action) {
        return new Notification.Action.Builder(
            (Icon) null,
            label,
            SessionNotificationReceiver.pendingIntent(context, action)
        ).build();
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

    /** Silent and still: it never makes a sound, buzzes or pops up, it just stays near the top. */
    private static void ensureChannel(Context context, String name, String description) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(OLD_CHANNEL_ID) != null) manager.deleteNotificationChannel(OLD_CHANNEL_ID);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(description);
        channel.setShowBadge(false);
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        // Re-creating an existing channel only updates its name and description (e.g. after a language change).
        manager.createNotificationChannel(channel);
    }
}
