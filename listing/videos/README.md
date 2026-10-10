# WTX — Store Videos

The two videos the store listings take, ready to upload. Both are built
around real recordings of the app.

| File | Where it goes | Format |
|---|---|---|
| `youtube/wtx-promo-16x9.mp4` | The Google Play promo video (Play takes a YouTube URL) | 1920×1080, 30 s, H.264 High 12 Mbps, AAC 384k, −14 LUFS |
| `app-store/wtx-app-preview-886x1920.mp4` | App Store Connect → iPhone App Previews (covers 6.9"/6.5"/6.3"/6.1") | 886×1920, 28 s, H.264 High L4.0 11 Mbps CBR, AAC 256k, −16 LUFS |
| `covers/youtube-thumbnail.jpg` | YouTube custom thumbnail | 1280×720 |
| `covers/app-preview-poster-0m05s.jpg` | What Apple shows at the default poster frame (0:05) | 886×1920 |

## Uploading

**Google Play**
1. Upload `wtx-promo-16x9.mp4` to YouTube as **Unlisted** or Public, with **monetization off** and not age-restricted.
2. In Play Console → Store listing → Preview video, paste the plain watch URL (no `&t=` or playlist parameters).

**App Store**
1. App Store Connect → the version → iPhone → App Previews → drop in `wtx-app-preview-886x1920.mp4`.
2. Leave the poster frame at 0:05 (or pick it again there).

## Where they come from

The videos are made in a separate project, `wtx-studio`, which also makes the
social media reels. It records the production build of this app and renders
the videos from those recordings; the files here are copies of its output.
After a UI change, re-render them there and replace these files.
