# WTX — Store Visuals

HTML/CSS source for every image asset needed to submit WTX to Google Play
and the App Store, plus already-exported PNGs at exact store dimensions.
Dark, Signal-Red-accented design using WTX's real palette
(`src/config/theme.ts`), wrapping **literal screenshots of the running app**
(`screens/*.png`) — not illustrated recreations. Per current App Store/Play
ASO guidance, real product UI converts better than stock-photo-style
marketing art, and screenshots should make the actual UI large and
dominant rather than small inside decorative padding.

Open `index.html` in a browser for a live gallery of everything below.

## What's here

```
visuals/
  styles.css              shared design system (colors, type, components)
  icon.html                1024×1024 app icon — flat barbell mark
  icon-foreground.html    transparent, safe-zone-sized mark for the Android adaptive icon
  feature-graphic.html     1024×500 Google Play feature graphic
  splash.html             native app splash screen, rendered per target size
  screens/                real PNG captures of the running app (see below)
  src/                     3 screenshot templates ({{WIDTH}}/{{HEIGHT}} placeholders)
  generate.mjs             stamps src/ templates into both store sizes
  play-store/              3 generated screenshots, 1080×1920 (Google Play)
  app-store/               3 generated screenshots, 1290×2796 (App Store, 6.9")
  png/                     exported PNGs, ready to upload — see below
  index.html               live preview gallery of every asset
```

## The 3 screenshots, and which feature each one sells

| # | File | Headline | Real screen captured |
|---|---|---|---|
| 1 | `01-routines-library` | "Every routine, one tap away." | Routines list — the default seeded library (push/pull/leg day), real computed exercise/time/volume stats |
| 2 | `02-local-first` | "Nothing leaves your phone." | Configuration → Data — export/import/delete, no account UI anywhere in the app |
| 3 | `03-share-via-qr` | "Share it with a scan." | The real Share sheet, with an actual scannable QR (not a decorative pattern) |

The "routines with friends" idea was dropped: Social is a "Coming soon" stub
with nothing real to screenshot yet. Add it back here once it ships.

### Recapturing a screen after an app change

The `screens/*.png` files are plain screenshots, not something this repo can
regenerate on its own — recapture manually when the underlying screen
changes:

1. Run the app (`pnpm dev`), open the target screen in a phone-width window
   (`#app` caps at 480px — anything ≤480px wide renders edge-to-edge like a
   device).
2. Screenshot it (a fresh/incognito profile gets the seeded default data
   instead of your local dev state) and crop to just the app column.
3. Save over the matching file in `screens/`, then re-run `node
   generate.mjs` and re-export the PNGs (see below).

## Why one template works for both store sizes

Google Play screenshots are 1080×1920 (9:16); App Store 6.9" screenshots are
1290×2796 — a meaningfully different aspect ratio, not just a scale. Instead
of hand-tuning two layouts per screen, every size in `styles.css` is
expressed in **container query units** (`cqw`/`cqh`) against a `.canvas`
element with `container-type: size`. That means the *same* HTML in `src/`
adapts its own type scale and spacing proportionally no matter what pixel
box it's dropped into — `generate.mjs` only ever changes two numbers
(width/height) per target. If you edit a screenshot's content, edit the file
in `src/`, then re-run:

```sh
node generate.mjs
```

This regenerates every file in `play-store/` and `app-store/` from `src/`.
Don't hand-edit files inside those two folders — they're build output and
will be overwritten.

## Exporting to PNG

`png/` already has every asset exported once (via headless Chrome, see
below) — those are the files to actually upload. To regenerate them after
an edit:

```sh
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"   # adjust for your machine

# Icon (design once at 1024, downscale for Play's 512 requirement)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/icon.png" --window-size=1024,1024 "file:///$PWD/icon.html"

# Feature graphic (Play only)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/feature-graphic.png" --window-size=1024,500 "file:///$PWD/feature-graphic.html"

# One screenshot, Play size
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/play-store/01-routines-library.png" --window-size=1080,1920 \
  "file:///$PWD/play-store/01-routines-library.html"

# Same screenshot, App Store size
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/app-store/01-routines-library.png" --window-size=1290,2796 \
  "file:///$PWD/app-store/01-routines-library.html"
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
| Google Play | `png/play-store/*.png` | Phone screenshots (pick at least 2 — all 3 are provided) |
| App Store | `png/icon.png` | App icon (1024×1024, Xcode/App Store Connect handles the mask) |
| App Store | `png/app-store/*.png` | 6.9" iPhone screenshot set |

App Store also wants a 6.5" set and, if iPad is supported, a 13" iPad set —
neither is generated here since they're additional aspect ratios beyond the
two this pass covers. If needed, add target entries to `generate.mjs` (same
pattern as the existing two) and re-run; the `cqw`/`cqh` system in
`styles.css` should adapt cleanly to those sizes too without further
content changes.

## Design notes

- **No network dependencies.** Fonts are the system stack
  (`-apple-system`/`Segoe UI`/Roboto/etc.) and `Consolas`/`SF Mono`/`Menlo`
  for the code block — no Google Fonts, no CDN. Renders identically offline
  and won't break if a font host is unreachable at export time.
- **The QR code in `03-share-via-qr` is real** — `screens/03-share-qr.png` is
  a literal capture of the app's own Share sheet (`uqr`-rendered, scans to
  a real `?r=`-encoded import link), not a decorative pattern. Don't
  recapture it against a `localhost` dev URL for an actual store submission —
  recapture against the production domain first.
- **Every screenshot wraps a literal capture of the running app**, not an
  illustrated recreation — see "Recapturing a screen after an app change"
  above. `styles.css`'s design system (colors, type, the `.device` frame) is
  only the headline/subhead chrome around each real screenshot.
