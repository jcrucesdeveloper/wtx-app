package com.wtxworkout.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.startapp.sdk.adsbase.Ad;
import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import com.startapp.sdk.adsbase.adlisteners.AdDisplayListener;
import com.startapp.sdk.adsbase.adlisteners.AdEventListener;

/**
 * Start.io interstitials, the stand-in ad network while AdMob can't serve
 * (VITE_AD_PROVIDER=startio). Same shape as the AdMob plugin: initialize once,
 * preload an interstitial, show it at the end of a workout. No splash ad and
 * no "return" ads: the only ad is the one src/services/ads.ts asks for.
 */
@CapacitorPlugin(name = "WtxStartio")
public class StartioPlugin extends Plugin {

    private StartAppAd interstitial;

    /** Options: {@code appId} (Start.io portal), {@code testing} (test ads only). */
    @PluginMethod
    public void initialize(PluginCall call) {
        String appId = call.getString("appId");
        if (appId == null || appId.isEmpty()) {
            call.reject("Missing Start.io appId");
            return;
        }
        boolean testing = Boolean.TRUE.equals(call.getBoolean("testing", true));
        getActivity().runOnUiThread(() -> {
            StartAppSDK.setTestAdsEnabled(testing);
            StartAppAd.disableSplash();
            StartAppSDK.initParams(getContext(), appId)
                .setReturnAdsEnabled(false)
                .setCallback(call::resolve)
                .init();
        });
    }

    /** Resolves once an interstitial is loaded; rejects on no fill. */
    @PluginMethod
    public void prepareInterstitial(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            StartAppAd ad = new StartAppAd(getContext());
            ad.loadAd(StartAppAd.AdMode.AUTOMATIC, new AdEventListener() {
                @Override
                public void onReceiveAd(Ad loaded) {
                    interstitial = ad;
                    call.resolve();
                }

                @Override
                public void onFailedToReceiveAd(Ad failed) {
                    call.reject("Start.io: no ad (" + (failed != null ? failed.getErrorMessage() : "unknown") + ")");
                }
            });
        });
    }

    /** Shows the loaded interstitial; resolves {@code shown} once it is closed or failed to open. */
    @PluginMethod
    public void showInterstitial(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            StartAppAd ad = interstitial;
            interstitial = null;
            if (ad == null || !ad.isReady()) {
                resolveShown(call, false);
                return;
            }
            ad.showAd(new AdDisplayListener() {
                @Override
                public void adHidden(Ad shown) {
                    resolveShown(call, true);
                }

                @Override
                public void adDisplayed(Ad shown) {}

                @Override
                public void adClicked(Ad shown) {}

                @Override
                public void adNotDisplayed(Ad shown) {
                    resolveShown(call, false);
                }
            });
        });
    }

    private static void resolveShown(PluginCall call, boolean shown) {
        JSObject result = new JSObject();
        result.put("shown", shown);
        call.resolve(result);
    }
}
