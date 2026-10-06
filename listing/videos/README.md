# WTX — Promotional Videos

Motion-graphics launch videos built around **real recordings of the app**,
rendered frame-by-frame so every render is identical. Specs, sources and the
reasoning behind every choice: [`../research/06-video-specs.md`](../research/06-video-specs.md).

## Deliverables (`out/`)

| File | Where it goes | Format |
|---|---|---|
| `youtube/wtx-promo-16x9.mp4` | YouTube channel video **and** the Google Play promo video (Play takes the YouTube URL) | 1920×1080, 30 s, H.264 High 12 Mbps, AAC 384k, −14 LUFS |
| `app-store/wtx-app-preview-886x1920.mp4` | App Store Connect → iPhone App Previews (covers 6.9"/6.5"/6.3"/6.1") | 886×1920, 28 s, H.264 High L4.0 11 Mbps CBR, AAC 256k, −16 LUFS |
| `social/wtx-reel-pr.mp4` | TikTok, Reels, Shorts — hook: *"POV: you just hit a bench PR"* | 1080×1920, 18 s, 10 Mbps, AAC 320k, −14 LUFS |
| `social/wtx-reel-plaintext.mp4` | same — hook: *"What if your workout was just text?"* | ″ |
| `social/wtx-reel-streak.mp4` | same — hook: *"Don't break the streak."* | ″ |
| `covers/youtube-thumbnail.jpg` | YouTube custom thumbnail | 1280×720 |
| `covers/reel-*-cover.jpg` | Reels/TikTok cover image | 1080×1920 |
| `covers/app-preview-poster-0m05s.jpg` | What Apple shows at the default poster frame (0:05) | 886×1920 |

`node scripts/verify.mjs` re-checks every file against its platform spec
(codec, profile/level, size, fps, duration, bitrate, audio, loudness,
faststart). All pass.

## Uploading

**Google Play**
1. Upload `wtx-promo-16x9.mp4` to YouTube as **Unlisted** or Public, with **monetization off** and not age-restricted.
2. In Play Console → Store listing → Preview video, paste the plain watch URL (no `&t=` or playlist parameters).

**App Store**
1. App Store Connect → the version → iPhone → App Previews → drop in `wtx-app-preview-886x1920.mp4`.
2. Leave the poster frame at 0:05 (or pick it again there).

**TikTok / Reels / Shorts**
- Post one hook per day and compare 3-second hold and completion rates. The winner is the one to put ad budget behind.
- Pick the matching `covers/*.jpg` as the cover. Put the app name in the caption ("WTX: free workout log — link in bio / search WTX").
- To ride a trending sound, post the file from `social/no-music/` (sound design only) and add the track in the app. These files are rendered locally and not committed; regenerate them with `pnpm render reel-pr reel-plaintext reel-streak`.

**YouTube** — same 16:9 file. Use `covers/youtube-thumbnail.jpg`. The reels double as Shorts.

## Daily reels

Short vertical reels come from a spec. Copy `compositions/_daily-template.html`
to `compositions/daily-YYYY-MM-DD-<slug>.html`, then set the tone (hype, clean,
tutorial or story), hook, beats and optional voice-over. Output goes to
`out/daily/`, which is re-renderable and not committed. Posts are tracked in
`daily-log.md`.

**Spanish.** Set `lang: 'es'` in the spec: the reel then uses the takes
recorded with the app in Spanish (`WTX_LOCALE=es node scripts/capture-app.mjs`
→ `build/clips-es/`) and Spanish built-in text ("Paso 1", the end card).
`daily-2026-10-02-es-*` are the Spanish launch set. Before the stores are
live, set `end.pill` to the web address.

**Slideshows.** `node scripts/slideshow.mjs <name>` renders
`slideshows/<name>.json` to 1080×1920 PNG slides in `out/slideshows/<name>/`,
for TikTok photo mode and Instagram carousels. App slides are frames of the
recorded takes (`scripts/clips.mjs`). Spec format at the top of the script.

**Fast-cut variations.** `daily-2026-10-03-es-v01…v10-*` are ten reels built
on what holds attention (`../research/08-hooks-and-retention.md`): the hook
on frame 1, a change every few seconds, one open loop, no end card. They
fill the frame with the recording and move a camera over it, using the
blocks in `lib/cuts.js` (shots and cuts, punch-in framing, text labels,
stopwatch, progress bar, countdown, chat). New reels should start from one
of these.

The whole routine is written up as a Claude Code skill in
`.claude/skills/daily-reel/SKILL.md`. Just ask for "today's reel", or "this
week's posts" for a batch of seven.

## Animated reels (no app footage)

`daily-2026-10-06-{es,en}-a01…a12-*` are twelve pure-animation reels built from
the research in [`../research/09-animation-viral-and-sound.md`](../research/09-animation-viral-and-sound.md):
a stick figure, a plate mascot, kinetic typography, a satisfying loop, a
marimba ball run, a Wrapped-style data story, paper cut-out, glitch/code, an
8-bit boss fight, a "dumb ways" bean list, a parallax night gym and a
whiteboard doodle. Each is one module in `compositions/src/aNN-*.js` with an
`{ es, en }` string table; `scripts/new-page.sh <slug>` makes the two pages.

Shared pieces: `lib/art.js` + `lib/art.css` (stick-figure rig, plate mascot,
discs, confetti, hand-drawn line boil, marker text, bubbles, the WTX sonic-logo
`sting`). New sound in `scripts/music.mjs`: styles `phonk`, `cartoon`, `uke`,
`lofi`, `chip`, `pop`, `synth`, `ambient`, `doodle` and ~25 effects (`boing`,
`clank`, `cowbell`, `stinger`, `note` …). All original and synthesized, so
there is nothing to license; each reel also exports an SFX-only cut.

## How it's made

```
scripts/capture-app.mjs   drives the production build in headless Chrome and records
                          each scene (886×1920, ~45 painted fps) + every tap's time/position
scripts/seed.mjs          8 weeks of Push/Pull/Leg history in the app's own storage format,
                          so the app itself computes the PR (72.5 kg), 9-week streak, 25th workout
compositions/*.html       one GSAP timeline per video (lib/engine.js: paused, seeked per frame;
                          lib/kit.js: phone, callouts, type, wipes, logo; lib/reel.js: 9:16 layout)
scripts/music.mjs         original 120 BPM soundtrack + sound design, synthesized (no samples)
scripts/render.mjs        parallel frame capture → lossless master → one encode per preset
scripts/targets.mjs       platform encode presets
scripts/verify.mjs        spec checks on the delivered files
```

120 BPM means one beat is exactly 15 frames at 30 fps. Cuts, text hits and
sound cues all sit on whole frames.

### Re-rendering

```sh
cd listing/videos && pnpm install
# 1. production build of the app, served locally (the dev build shows the Vue DevTools pill)
(cd ../.. && pnpm build-only && npx vite preview --port 5191) &
# 2. record the app (only needed after UI changes)
pnpm capture
# 3. render + encode everything, then check it
pnpm render promo-16x9 app-preview reel-pr reel-plaintext reel-streak
pnpm verify
```

Other render options:
- Preview one frame: `node scripts/render.mjs <comp> --still 150 --out f.png`. Several frames: `--still 30,90,150` (tiled into one sheet).
- Re-encode after changing a preset: `--deliver-only`.
- Open `compositions/<comp>.html?preview` through any local static server to scrub in real time.

Compositions look up clip moments by marker name (`m('workout', 'pr-set')`),
not hard-coded times, so a re-capture keeps everything in sync.
