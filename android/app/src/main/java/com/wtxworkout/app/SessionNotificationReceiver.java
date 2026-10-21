package com.wtxworkout.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * The workout notification's own broadcasts: its rest actions (−, +, skip),
 * and its delete intent. Android 14+ lets users swipe away even ongoing
 * notifications; while the workout runs this posts it straight back, so it
 * only goes away when the workout is finished or discarded.
 */
public class SessionNotificationReceiver extends BroadcastReceiver {

    static final String ACTION_LESS = "less";
    static final String ACTION_MORE = "more";
    static final String ACTION_SKIP = "skip";
    static final String ACTION_DISMISSED = "dismissed";

    private static final String PREFIX = "com.wtxworkout.app.session.";

    static PendingIntent pendingIntent(Context context, String action) {
        Intent intent = new Intent(context, SessionNotificationReceiver.class).setAction(PREFIX + action);
        return PendingIntent.getBroadcast(
            context,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String full = intent.getAction();
        if (full == null || !full.startsWith(PREFIX)) return;
        String action = full.substring(PREFIX.length());
        if (ACTION_DISMISSED.equals(action)) {
            Notification notification = SessionNotificationPlugin.current;
            if (notification == null) return;
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.notify(SessionNotificationPlugin.NOTIFICATION_ID, notification);
            return;
        }
        SessionNotificationPlugin.onRestAction(action);
    }
}
