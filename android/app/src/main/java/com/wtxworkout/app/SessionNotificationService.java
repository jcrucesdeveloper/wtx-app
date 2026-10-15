package com.wtxworkout.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Keeps the app's process alive while a workout runs, holding the ongoing
 * notification {@link SessionNotificationPlugin} posts. It does no work of its
 * own: the plugin updates the notification in place by its id.
 */
public class SessionNotificationService extends Service {

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = SessionNotificationPlugin.current;
        if (notification == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    SessionNotificationPlugin.NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                );
            } else {
                startForeground(SessionNotificationPlugin.NOTIFICATION_ID, notification);
            }
        } catch (RuntimeException e) {
            // Couldn't go foreground: still show the notification, just without the service.
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.notify(SessionNotificationPlugin.NOTIFICATION_ID, notification);
            stopSelf();
        }
        // Not restarted after the process dies: the session comes back from storage when the app opens.
        return START_NOT_STICKY;
    }

    /** Swiping the app away from recents ends the notification with it; the session itself is kept. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        SessionNotificationPlugin.current = null;
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
