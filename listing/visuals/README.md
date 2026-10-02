# WTX — Store Visuals

HTML/CSS source for every image asset needed to submit WTX to Google Play
and the App Store, plus already-exported PNGs at exact store dimensions.
Dark, Signal-Red-accented design using WTX's real palette
(`src/config/theme.ts`), wrapping **literal captures of the running app**
(`screens/<lang>/*.png`) — not illustrated recreations. Per current App
Store/Play ASO guidance, real product UI converts better than stock-photo-style
marketing art, and screenshots should make the actual UI large and dominant
rather than small inside decorative padding.

Open `index.html` in a browser for a gallery of everything below.

## What's here

```
visuals/
  styles.css              shared design system (colors, type, components)
  icon.html                1024×1024 app icon — flat barbell mark
  icon-foreground.html    transparent, safe-zone-sized mark for the Android adaptive icon
  feature-graphic.html     1024×500 Google Play feature graphic
  splash.html             native app splash screen, rendered per target size
  shots.mjs                the screenshot set: order, screen, headline per language
  targets.mjs              the two store sizes
  src/_shot.html           the one screenshot template
  generate.mjs             copies each shot's screen from the recorded app, stamps the template
  export.mjs               renders every generated page to an exact-size PNG
  screens/<lang>/          the real app captures each shot wraps (generated)
  play-store/<lang>/       generated pages, 1080×1920 (Google Play)
  app-store/<lang>/        generated pages, 1290×2796 (App Store, 6.9")
  png/                     exported PNGs, ready to upload — see below
  index.html               preview gallery of every asset
```

## The screenshots, and which feature each one sells

Six shots, in English and Spanish, each with the app itself in that language
(`shots.mjs`). Order follows `../research/01-aso-strategy.md`: logging and
the finish screen first.

| # | Shot | English headline | Screen |
|---|---|---|---|
| 1 | `01-log` | Log every set in *one tap*. | A workout in progress, four sets logged with last time's values |
| 2 | `02-records` | See what you *beat*. | The finish screen: a personal record, volume vs. last time, streak, milestone |
| 3 | `03-streak` | Don't break the *streak*. | Sessions: a month of training on the calendar, the session list |
| 4 | `04-routines` | Your routines, *ready to go*. | A routine's detail with exercise images |
| 5 | `05-text` | Your workout is *just text*. | The same routine's `.wtt` source |
| 6 | `06-share` | Share it with a *scan*. | The share sheet with a real, scannable QR on the production domain |

Group workouts aren't in the set yet: recording them needs two signed-in test
accounts against a real backend (see `../assets/checklist.md`).

## Regenerating

The screens come from the video pipeline's recordings of the production
build with seeded history, so they never drift from the app:

```sh
# 1. record the app in both languages (listing/videos, with a production build served — see its README)
cd ../videos && node scripts/capture-app.mjs && WTX_LOCALE=es node scripts/capture-app.mjs
# 2. copy the screens, stamp the pages, export the PNGs
cd ../visuals && node generate.mjs && node export.mjs
```

Build the app with `VITE_PUBLIC_URL` set to the production domain before
recording, so the QR in `06-share` encodes a real link. To change a headline,
edit `shots.mjs` and run `node generate.mjs --no-screens && node export.mjs`.
Don't hand-edit `play-store/`, `app-store/` or `screens/`: they're
generated.

Every size in `styles.css` is in **container query units** (`cqw`/`cqh`)
against a `.canvas` with `container-type: size`, so the one template adapts
to both aspect ratios; only the width, height and phone-frame width
(`targets.mjs`) change per store.

## Exporting the icon and feature graphic

`export.mjs` covers the screenshots. The other assets are exported the same
way, with headless Chrome:

```sh
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"   # adjust for your machine

# Icon (design once at 1024, downscale for Play's 512 requirement)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/icon.png" --window-size=1024,1024 "file:///$PWD/icon.html"

# Feature graphic (Play only)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/feature-graphic.png" --window-size=1024,500 "file:///$PWD/feature-graphic.html"
```

`--force-device-scale-factor=1` and `--hide-scrollbars` are what make the
output exactly W×H pixels with no OS scaling or scrollbar artifacts —
without them the PNG dimensions won't match the store spec exactly. Any
Chromium-based browser (Chrome, Edge) works the same way; adjust the binary
path for your OS.

`png/icon-512.png` is a high-quality downscale of `png/icon.png`, not a
separate render — Google Play wants 512×512, Apple wants 1024×1024, and
designing once at the larger size and resizing down is the standard,
correct approach (never the reverse).

## Regenerating the native app icons (iOS/Android)

`icon.html`/`icon-foreground.html` are also the source of truth for the
actual on-device launcher icon, not just the store listing PNG — keep them
in sync.

- **iOS**: just re-render `icon.html` at 1024×1024 (see above) and copy it
  over `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`.
  Xcode/App Store Connect handles corner masking.
- **Android** uses an adaptive icon (background layer + foreground layer,
  composited and masked by the launcher at runtime):
  - `icon.html` and `icon-foreground.html` both hardcode their canvas size in
    CSS (`html, body { width/height: 1024px / 432px }`), so headless
    Chrome's `--window-size` does **not** rescale their content — a smaller
    window only crops the fixed-size render instead of shrinking it. Always
    render at the file's native size (1024 for `icon.html`, 432 for
    `icon-foreground.html`) and downscale from there with Pillow
    (`Image.resize(..., Image.LANCZOS)`, keeping the alpha channel for the
    foreground), never with a smaller `--window-size`.
  - `icon-foreground.html` renders *only* the mark, transparent background,
    sized to fit inside the adaptive-icon safe zone (inner 66/108 of the
    canvas) so it survives circle/squircle/rounded-square launcher masks.
    Render it once at 432×432 with `--default-background-color=00000000`
    (see `--screenshot` flags above), then downscale to 108/162/216/324 and
    copy each into
    `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png`.
  - The background layer is the flat color in
    `android/app/src/main/res/values/ic_launcher_background.xml`
    (`#181818`, matching `icon.html`'s background) — edit it directly if the
    palette changes, no image export needed.
  - The legacy (pre-Android-8, non-adaptive) launcher icons still need full
    flat PNGs: render `icon.html` once at 1024×1024, downscale to
    48/72/96/144/192px into each density's `ic_launcher.png`, then circle-crop
    those into `ic_launcher_round.png` (e.g. via Pillow — paste through an
    ellipse mask). Both `mipmap-anydpi-v26/ic_launcher*.xml` already point at
    `@color/ic_launcher_background` + `@mipmap/ic_launcher_foreground`.

## Browser favicon (`public/favicon.ico`)

`icon.html`'s composition (mark filling ~41%×21% of the canvas) reads fine
as an app icon, where OS chrome (rounded corners, shadow, safe zone) adds
visual weight around it, but it's too small and thin to read at 16×16/32×32
in a browser tab. The favicon instead uses the same colors and the same
mark geometry, cropped tighter — viewBox `7 7 86 86` instead of `0 0 100 100`
(no separate HTML file; it's simple enough to draw directly with Pillow
`rounded_rectangle`, scaling each rect's viewBox coordinates by
`size / 86`). Regenerate at 16/32/48/64px and save as a single multi-size
`.ico` (`Image.save(..., sizes=[(16,16),(32,32),(48,48),(64,64)])`).

| Store | File | Target |
|---|---|---|
| Google Play | `png/icon-512.png` | App icon (512×512) |
| Google Play | `png/feature-graphic.png` | Feature graphic (1024×500) |
| Google Play | `png/play-store/<lang>/*.png` | Phone screenshots, one set per listing language (6 of the allowed 2–8) |
| App Store | `png/icon.png` | App icon (1024×1024, Xcode/App Store Connect handles the mask) |
| App Store | `png/app-store/<lang>/*.png` | 6.9" iPhone screenshot set, one per localization |

App Store also wants a 6.5" set and, if iPad is supported, a 13" iPad set —
neither is generated here since they're additional aspect ratios beyond the
two this pass covers. If needed, add target entries to `targets.mjs` (same
pattern as the existing two) and re-run; the `cqw`/`cqh` system in
`styles.css` should adapt cleanly to those sizes too without further
content changes.

## Design notes

- **No network dependencies.** Fonts are the system stack
  (`-apple-system`/`Segoe UI`/Roboto/etc.) and `Consolas`/`SF Mono`/`Menlo`
  for the code block — no Google Fonts, no CDN. Renders identically offline
  and won't break if a font host is unreachable at export time.
- **The QR code in `06-share` is real** — a capture of the app's own Share
  sheet, encoding an import link on the domain the app was built with.
- **Every screenshot wraps a literal capture of the running app**, not an
  illustrated recreation — see "Regenerating" above. `styles.css`'s design system (colors, type, the `.device` frame) is
  only the headline/subhead chrome around each real screenshot.
