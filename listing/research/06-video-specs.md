# Video Specs & Strategy (2026)

Researched 2026-09-28 for the launch video set in `listing/videos/`. Each
platform's own published rules come first; third-party guides only fill gaps
(safe zones, hook data) where the platform publishes nothing.

## What each platform actually requires

### Apple App Store — App Preview
Source: [App preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications), [App previews guidelines](https://developer.apple.com/app-store/app-previews/)

| | Requirement |
|---|---|
| Resolution | **886×1920** portrait for every current iPhone class (6.9", 6.5", 6.3", 6.1"); 1080×1920 only for 5.5"/4" |
| Length | **15–30 s** |
| Video | H.264, High Profile ≤ **Level 4.0**, progressive, **≤ 30 fps**, target **10–12 Mbps** (or ProRes 422 HQ) |
| Audio | **Stereo, 256 kbps AAC, 44.1/48 kHz** — a track is required |
| Container / size | .mov, .m4v or .mp4, ≤ 500 MB, up to 3 previews per locale |
| Poster frame | defaults to **0:05** |
| Content | **Screen capture of the app only.** Text overlays, touch hotspots, voice-over and one music bed are allowed. Not allowed: people/hands/over-the-shoulder footage, content from outside the app, unlicensed music, seasonal/dated references, **specific prices**. Must disclose login/IAP if the video shows it. Autoplays **muted**. |

### Google Play — preview video
Source: [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)

- It's a **YouTube URL** (single video: no playlist or channel URL, no timecode parameters).
- **Ads/monetization must be off**. Copyrighted audio can block it even so, which is why all our music is original.
- Visibility **public or unlisted**, not age-restricted, embeddable.
- Only the **first 30 s autoplay**. **≥80% should be real in-app experience**, with **core features in the first 10 s**.
- Landscape or portrait are both fine (no black bars on portrait). Captions are recommended.

### YouTube upload
Source: [Recommended upload encoding settings](https://support.google.com/youtube/answer/1722171)

MP4 with moov atom first (fast start). H.264 High, progressive, 2 consecutive B-frames, closed GOP of half the frame rate, CABAC. **1080p30: 8 Mbps SDR** (12 Mbps at 60 fps). BT.709. AAC-LC or Opus, stereo, **48 kHz**.

### TikTok / Instagram Reels / YouTube Shorts
Sources: [Kreatli safe-zone guide](https://kreatli.com/guides/safe-zone-guide), [Instagram Reels specs 2026](https://postfa.st/sizes/instagram/reels), [YouTube Shorts length](https://anfx.co/blog/youtube-shorts-tiktok-reels-video-size-guide/)

- **1080×1920, 9:16**, H.264 MP4, 30 fps, AAC 48 kHz. Every platform re-encodes, so upload high-bitrate.
- Shorts: any vertical video **≤ 3 min**. Reels: recommendation reach drops sharply past 3 min.
- **Safe zones** (the platform UI covers the rest):
  - TikTok: ~130–240 px top, ~250–440 px bottom, ~60 px sides, plus the right-hand button column.
  - Reels: 14% top, **35% bottom**, 6% sides.
  - Shorts: keep text out of the bottom 10–15%.
  - Common box used here: text inside **x 90–900, y 250–1250**.

### What earns attention (short-form + stores)
Sources: [TikTok 3-second rule](https://www.teleprompter.com/blog/tiktok-3-second-rule), [TikTok creative best practices](https://www.stackmatix.com/blog/tiktok-creative-best-practices-2026), [App install hooks & CPI](https://vmobify.com/blog/tiktok-app-install-campaigns)

- The first 3 s decide retention. Open on the strongest visual or statement, **never a logo intro**.
- Same demo with different hooks shows **2–4× CPI spread**, so test several hooks.
- Most feeds play **muted**: on-screen text must carry the message.

## Decisions this led to

| Decision | Why |
|---|---|
| Every frame of app UI is a **real recording of the production build** (`scripts/capture-app.mjs`), not a mock-up | Apple allows only in-app capture; Google wants ≥80% real UX |
| Seeded, realistic history so the app itself computes the PR, streak and milestone on screen | Nothing on screen is fabricated; the numbers come from the app's own logic |
| **Original synthesized soundtrack** (`scripts/music.mjs`) | Nothing to license: no Content ID claim on the YouTube/Play video, no Apple rejection for unlicensed music |
| One 30 s 16:9 cut serves YouTube *and* Google Play | Play only autoplays 30 s; core feature (logging a set) lands by 0:05; phone on screen 0:02–0:26 |
| App Store preview = full-bleed screen capture + captions, 28 s, 886×1920 | Fits every current iPhone; no device frame, no prices (Config screen with the remove-ads price is never shown), no "free"/"new" |
| Poster moment at 0:05 is a set being logged | Apple's default poster frame; also what shows when autoplay is off |
| Three 18 s vertical cuts with **different hooks** (PR / plain text / streak) | Hook testing is where the CPI difference is; 18 s keeps completion rate high |
| SFX-only versions of each reel | So a trending sound can be laid under the visuals in-app without clashing music |
| Loudness: −14 LUFS social/YouTube, −16 LUFS App Store, true peak ≤ −1.5 dBTP | Platform playback normalization targets; Apple previews play quietly and muted by default |
| Social features (group workouts, feed) are **not shown** | They need a signed-in account against the real backend; nothing is claimed that isn't on screen |
