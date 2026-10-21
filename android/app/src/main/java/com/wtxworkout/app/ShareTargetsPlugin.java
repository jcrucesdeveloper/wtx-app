package com.wtxworkout.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Sends a workout card straight to one app — Instagram or WhatsApp — instead
 * of through the system share sheet, so posting it is one tap. The image is a
 * file JS already wrote to the app's cache; it is handed over through the
 * FileProvider with a read grant for that one app, never made public.
 *
 * Instagram's story editor (com.instagram.share.ADD_TO_STORY) only opens for
 * an app that passes a Facebook App ID. Without one, or if the editor can't be
 * reached, the image goes to Instagram as a plain share, where Instagram asks
 * Story, Feed or Chat itself. The package names are declared under
 * {@code <queries>} in the manifest so they can be seen on Android 11+.
 */
@CapacitorPlugin(name = "WtxShareTargets")
public class ShareTargetsPlugin extends Plugin {

    static final String INSTAGRAM = "com.instagram.android";
    static final String[] WHATSAPP = { "com.whatsapp", "com.whatsapp.w4b" };
    static final String ADD_TO_STORY = "com.instagram.share.ADD_TO_STORY";

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("instagram", isInstalled(INSTAGRAM));
        result.put("whatsapp", firstInstalled(WHATSAPP) != null);
        call.resolve(result);
    }

    /**
     * Options: {@code target} ("instagram" | "whatsapp"), {@code file} (a
     * file:// URI in the cache), {@code mimeType}, and optionally {@code text}
     * (a caption, WhatsApp only), {@code clipboard} (text to copy first),
     * {@code appId} (Facebook App ID, for the story editor), {@code sticker}
     * (the file is a sticker to place over a background) and
     * {@code topColor} / {@code bottomColor} (that background).
     *
     * Resolves with {@code route}: "story" (Instagram's story editor) or
     * "send". Rejects with code "UNAVAILABLE" when the app can't be opened.
     */
    @PluginMethod
    public void share(PluginCall call) {
        String target = call.getString("target", "");
        String file = call.getString("file");
        String mimeType = call.getString("mimeType", "image/png");
        Activity activity = getActivity();
        if (file == null || activity == null) {
            call.reject("No image to share");
            return;
        }

        Uri uri;
        try {
            String path = Uri.parse(file).getPath();
            uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                new File(path != null ? path : file)
            );
        } catch (IllegalArgumentException e) {
            call.reject("The image can't be shared", e);
            return;
        }

        String pkg = "instagram".equals(target) ? INSTAGRAM : "whatsapp".equals(target) ? firstInstalled(WHATSAPP) : null;
        if (pkg == null || !isInstalled(pkg)) {
            call.reject("App not installed", "UNAVAILABLE");
            return;
        }

        String clipboard = call.getString("clipboard");
        String appId = call.getString("appId");
        String text = call.getString("text");
        boolean sticker = Boolean.TRUE.equals(call.getBoolean("sticker", false));
        String topColor = call.getString("topColor");
        String bottomColor = call.getString("bottomColor");

        activity.runOnUiThread(() -> {
            if (clipboard != null && !clipboard.isEmpty()) copy(clipboard);

            if (INSTAGRAM.equals(pkg) && appId != null && !appId.isEmpty()) {
                Intent story = new Intent(ADD_TO_STORY);
                story.setPackage(INSTAGRAM);
                story.putExtra("source_application", appId);
                if (sticker) {
                    story.setType(mimeType);
                    story.putExtra("interactive_asset_uri", uri);
                    if (topColor != null) story.putExtra("top_background_color", topColor);
                    if (bottomColor != null) story.putExtra("bottom_background_color", bottomColor);
                } else {
                    story.setDataAndType(uri, mimeType);
                }
                story.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                activity.grantUriPermission(INSTAGRAM, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (start(activity, story)) {
                    resolve(call, "story");
                    return;
                }
            }

            Intent send = new Intent(Intent.ACTION_SEND);
            send.setPackage(pkg);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            // Instagram drops a caption; WhatsApp puts it under the image.
            if (text != null && !text.isEmpty() && !INSTAGRAM.equals(pkg)) send.putExtra(Intent.EXTRA_TEXT, text);
            send.setClipData(ClipData.newRawUri("", uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (start(activity, send)) resolve(call, "send");
            else call.reject("App can't be opened", "UNAVAILABLE");
        });
    }

    private static void resolve(PluginCall call, String route) {
        JSObject result = new JSObject();
        result.put("route", route);
        call.resolve(result);
    }

    private static boolean start(Activity activity, Intent intent) {
        try {
            activity.startActivity(intent);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }

    private void copy(String text) {
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) clipboard.setPrimaryClip(ClipData.newPlainText("WTX", text));
    }

    private String firstInstalled(String[] packages) {
        for (String pkg : packages) if (isInstalled(pkg)) return pkg;
        return null;
    }

    @SuppressWarnings("deprecation")
    private boolean isInstalled(String pkg) {
        try {
            getContext().getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
}
