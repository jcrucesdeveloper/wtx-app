package com.wtx.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android WebView does not implement the CSS `env(safe-area-inset-*)`
        // variables (that's a WebKit/iOS-only feature), so the page has no
        // way to learn the bottom system-bar inset (gesture nav / 3-button
        // bar) on its own. We need that value in JS: on Android 15+,
        // @capacitor-community/admob's BannerExecutor adds this same inset a
        // second time as extra margin on the native banner view (see its
        // showBanner's `Build.VERSION.SDK_INT >= VANILLA_ICE_CREAM` branch),
        // on top of the inset Capacitor's own WebView padding already
        // accounts for — so AdBanner/AppTabBar need the raw inset to cancel
        // out that double-count. Forward it as a CSS custom property.
        final WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(
            webView,
            new OnApplyWindowInsetsListener() {
                @Override
                public WindowInsetsCompat onApplyWindowInsets(android.view.View v, WindowInsetsCompat insets) {
                    int bottomInset = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
                    webView.evaluateJavascript(
                        "document.documentElement.style.setProperty('--native-bottom-inset', '" + bottomInset + "px')",
                        null
                    );
                    return insets;
                }
            }
        );
    }
}
