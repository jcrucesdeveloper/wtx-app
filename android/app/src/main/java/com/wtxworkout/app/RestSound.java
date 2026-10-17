package com.wtxworkout.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.SoundPool;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

/**
 * The rest-end chime (res/raw/rest_end.mp3, the same file the web app plays),
 * played natively so it sounds with the screen locked. It stays quiet unless
 * the ringer is on (silent and vibrate are respected), uses the notification
 * volume, and briefly ducks other audio so music doesn't drown it out.
 */
final class RestSound {

    /** The chime is about a second; give the ducked music back a little after. */
    private static final long DUCK_MS = 1300;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final AudioAttributes attributes = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();
    private SoundPool pool;
    private int soundId;
    private boolean loaded;
    private AudioFocusRequest focusRequest;
    /** Set while the ducking focus is held, so it's given back exactly once. */
    private AudioManager focusOwner;
    private final Runnable abandonFocus = this::abandonFocus;

    /** Loads the sound ahead of time: a SoundPool sound can't play until it has decoded. */
    void prepare(Context context) {
        if (pool != null) return;
        pool = new SoundPool.Builder().setMaxStreams(1).setAudioAttributes(attributes).build();
        pool.setOnLoadCompleteListener((p, id, status) -> loaded = status == 0);
        soundId = pool.load(context, R.raw.rest_end, 1);
    }

    void play(Context context) {
        prepare(context);
        if (!loaded) return;
        AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (audio == null || audio.getRingerMode() != AudioManager.RINGER_MODE_NORMAL) return;
        requestFocus(audio);
        pool.play(soundId, 1f, 1f, 1, 0, 1f);
        handler.removeCallbacks(abandonFocus);
        handler.postDelayed(abandonFocus, DUCK_MS);
    }

    void release() {
        handler.removeCallbacks(abandonFocus);
        abandonFocus();
        if (pool != null) pool.release();
        pool = null;
        loaded = false;
    }

    private void requestFocus(AudioManager audio) {
        focusOwner = audio;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(attributes)
                    .build();
            }
            audio.requestAudioFocus(focusRequest);
        } else {
            audio.requestAudioFocus(null, AudioManager.STREAM_NOTIFICATION, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    private void abandonFocus() {
        AudioManager audio = focusOwner;
        focusOwner = null;
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audio.abandonAudioFocusRequest(focusRequest);
        } else {
            audio.abandonAudioFocus(null);
        }
    }
}
