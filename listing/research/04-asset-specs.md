# Image Asset Specs (2026)

This file is specs only — no image files are produced here. Design work is a
separate pass; `assets/checklist.md` has the shot list to hand to whoever
does it.

## Google Play

| Asset | Spec |
|---|---|
| App icon | 512×512px, 32-bit PNG with alpha, under 1024 KB. Full square — Play masks the shape itself; don't pre-mask. |
| Feature graphic | 1024×500px, JPEG or 24-bit PNG **without** alpha. Shown across the store listing, ads, and promo placements. |
| Phone screenshots | 1080×1920px (9:16) recommended; any side 320–3840px, max aspect ratio 2:1. **Min 2, max 8.** JPEG or 24-bit PNG, no alpha. |
| Tablet screenshots | Optional but recommended if the app is usable on tablets — same format rules. |

## Apple App Store

| Asset | Spec |
|---|---|
| App icon | Single 1024×1024px PNG, no alpha/transparency, no rounded corners (Apple masks it). |
| iPhone screenshots (6.9" set) | 1290×2796 or 1320×2868px portrait — required if the app runs on iPhone. Apple downsamples this set for older/smaller devices if only one set is uploaded. |
| iPhone screenshots (6.5" set) | 1242×2688 or 1284×2778px — upload natively for sharpest display on that device class if possible, otherwise the 6.9" set is auto-scaled. |
| iPad screenshots (13")| 2064×2752 or 2048×2732px portrait — required if the app runs on iPad. |
| Promotional App Icon / App Store icon reused from build | Same 1024×1024 source, no separate asset needed. |

## Practical notes for WTX specifically

- WTX is a Capacitor web app; screenshots should be captured from the actual
  running app (`pnpm cap:open` / `pnpm cap:open:ios` in the main worktree),
  not mockups of the web build, so store review can't flag "doesn't match
  submitted binary."
- Keep device chrome/status bar clean (full battery, no notifications) —
  both stores' review guidelines call out cluttered status bars as a
  rejection-risk quality signal, and it just looks better.
- Feature graphic (Play only) is a huge, mostly-empty 1024×500 canvas — don't
  just crop a screenshot into it. Design it as a small billboard: app name +
  one-line hook + accent-color background using WTX's own palette
  (`src/config/theme.ts`: Emerald `#10b981` default, or Blue `#3b82f6`).

## Sources

- [Google Play App Icon Guidelines 2026](https://theapplaunchpad.com/blog/google-play-app-icon-guidelines/)
- [Google Play Feature Graphic Size 2026 — ScreenKit](https://screenkit.tools/specs/google-play-feature-graphic-size)
- [Google Play Screenshot Sizes 2026 — PicsSizer](https://www.picssizer.com/app-store-sizes/google-play)
- [Apple App Store screenshot sizes & guidelines (2026) — MobileAction](https://www.mobileaction.co/guide/app-screenshot-sizes-and-guidelines-for-the-app-store/)
- [App Store Screenshot Sizes 2026 — AppLaunchFlow](https://www.applaunchflow.com/app-store-screenshot-sizes)
