# WTX — Store Visuals

HTML/CSS source for every image asset needed to submit WTX to Google Play
and the App Store, plus already-exported PNGs at exact store dimensions.
Dark, accent-driven design using WTX's real palette
(`src/config/theme.ts`), built to explain the actual shipped features from
`../play-store/02-full-description.md` and `../app-store/02-description.md`
— not generic stock-photo marketing.

Open `index.html` in a browser for a live gallery of everything below.

## What's here

```
visuals/
  styles.css              shared design system (colors, type, components)
  icon.html                1024×1024 app icon — a bold "W" mark
  feature-graphic.html     1024×500 Google Play feature graphic
  src/                     8 screenshot templates ({{WIDTH}}/{{HEIGHT}} placeholders)
  generate.mjs             stamps src/ templates into both store sizes
  play-store/              8 generated screenshots, 1080×1920 (Google Play)
  app-store/               8 generated screenshots, 1290×2796 (App Store, 6.9")
  png/                     exported PNGs, ready to upload — see below
  index.html               live preview gallery of every asset
```

## The 8 screenshots, and which feature each one sells

| # | File | Headline | Explains (from the store description) |
|---|---|---|---|
| 1 | `01-templates-library` | "Your routines, as text files you own." | Templates library — parsed exercise/set/muscle-group summaries |
| 2 | `02-create-a-routine` | "Build a routine in seconds." | The create-routine form → serializes to `.wtt` |
| 3 | `03-share-via-qr` | "Share it with a scan." | QR share/import, no account either side |
| 4 | `04-load-a-routine` | "Paste it, pick it, or scan it." | The three load methods |
| 5 | `05-wtt-format` | "It's just text." | The `.wtt` format itself — the core differentiator |
| 6 | `06-privacy` | "Nothing leaves your phone." | No account / local-only storage |
| 7 | `07-accent-colors` | "Make it yours." | Configurable accent color |
| 8 | `08-routine-detail` | "Every set, at a glance." | Routine detail view (optional 8th slot) |

Order matches `../assets/checklist.md`'s guidance: the first two/three slides
carry the most conversion weight on both stores, so the differentiator
(plain text, no account) leads rather than gets buried.

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
  --screenshot="png/play-store/01-templates-library.png" --window-size=1080,1920 \
  "file:///$PWD/play-store/01-templates-library.html"

# Same screenshot, App Store size
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot="png/app-store/01-templates-library.png" --window-size=1290,2796 \
  "file:///$PWD/app-store/01-templates-library.html"
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

## Uploading

| Store | File | Target |
|---|---|---|
| Google Play | `png/icon-512.png` | App icon (512×512) |
| Google Play | `png/feature-graphic.png` | Feature graphic (1024×500) |
| Google Play | `png/play-store/*.png` | Phone screenshots (pick at least 2, up to 8 — all 8 are provided) |
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
- **The QR code in `03-share-via-qr` is decorative**, not a functional
  scannable code (generated as a deterministic pseudo-random module pattern
  with correct finder-square positions) — this is a marketing screenshot
  illustrating the feature, not a real generated QR from the app. Don't
  ship it anywhere it could be mistaken for a working import link.
- **Nothing here is a literal screenshot of the running app UI** — these are
  illustrated marketing slides in the app's visual language (colors,
  rounded cards, the same information the real screens show), which is
  standard practice for store screenshots and avoids needing the actual
  Capacitor build running and captured pixel-for-pixel. If you'd rather have
  literal device screenshots of the real app later, that's a separate pass
  (run `pnpm cap:open` / `cap:open:ios` from the main app, capture each
  screen, composite into a device frame) — this folder doesn't block that,
  it's a legitimate alternative or complement to it.
