---
name: daily-reel
description: Make today's short vertical promo post for the WTX app from real app footage — a 1080×1920 reel (TikTok / Instagram Reels / YouTube Shorts) or a photo slideshow (TikTok photo mode / Instagram carousel), in Spanish or English, in a chosen tone (hype, clean, tutorial, story) with optional voice-over. Use whenever the user asks for a daily reel, a new TikTok/Reel/Short, a slideshow or carousel, "today's video", "this week's posts", another promo video, or a video about a specific WTX feature.
---

# Daily reel

Produces one 12–30 s vertical reel, or one 4–7 slide slideshow, per run with
the pipeline in `listing/videos/` (read its `README.md` once if you
haven't). Specs, safe zones and platform rules are in
`listing/research/06-video-specs.md`.

**Spanish is the launch market**: default to `lang: 'es'` unless the user asks
for English. The app is recorded in both languages (`build/clips/` and
`build/clips-es/`), so a Spanish post shows the Spanish UI. Until the store
listings are live, end cards and slideshows use `pill: 'wtxworkout.com'`
instead of "Gratis en iOS y Android".

**A weekly batch** ("this week's posts"): make 7 posts in one run, alternating
reels and slideshows, all from angles not used in the last two weeks, and
re-cutting the top two by completion from `daily-log.md` with new hooks.
Skip the questions below unless the user asked for something specific.

## 1. Settle the brief (ask only what the user didn't say)

Use `AskUserQuestion` once, with these questions, skipping any the user
already answered. Always offer defaults.

0. **Format.** `fast-cut` (default), `reel` (the spec-driven phone-and-caption
   template) or `slides`. Fast-cut is the default because the template reels
   read as boring: see "Fast-cut variations" below and the rules in
   `listing/research/08-hooks-and-retention.md`. Slideshows are the cheapest
   to make and the format the closest comparable app grew with; see
   "Slideshows" below.

1. **Angle.** Which feature or story. Read `listing/videos/daily-log.md`
   first and propose 2–3 angles **not used recently**, from the
   [angle bank](#angle-bank). If the log has hold/completion numbers, favour
   re-cutting the best-performing angle with a new hook.
2. **Tone.** `hype` (gym energy, drums from frame 1, slams), `clean`
   (calm/aesthetic, pads, no drums, slow reveals), `tutorial` (how-to, steady
   beat, "Step 1…" captions), or `story` (POV/narrative: quiet build, drop on
   the reveal).
3. **Voice.** One of:
   - **none**: captions carry it (most short-form is watched muted).
   - **your recording**: the user records on their phone; any format works.
     Save it as `listing/videos/assets/voice/<date>-<slug>.<ext>`.
   - **draft voice**: a robotic Windows voice via
     `node scripts/voice.mjs draft "<script>" assets/voice/<name>.wav`. It's for
     timing only; say so, and suggest re-recording or using the in-app
     text-to-speech on the SFX-only cut.

   If they want voice but have no script, write one: ~2.3 words per second,
   hook sentence first, one sentence per beat, ≤ duration − 5 s.

## 2. Write the composition

1. Copy `listing/videos/compositions/_daily-template.html` to
   `compositions/daily-YYYY-MM-DD-<slug>.html`. The `daily-` prefix is what
   routes output to `out/daily/`.
2. Edit only `SPEC`: `lang`, `tone`, `duration` (even seconds; the last 4 s
   are the end card), `hook`, `beats`, `end.tagline`, `end.pill`, `voice`,
   `music`. Write every caption in `lang`. Spanish runs ~20% longer: keep
   lines ≤ ~11 characters at 112 px, ≤ ~13 at 96, ≤ ~15 at 84, or split into
   three lines; a line that doesn't fit breaks mid-word.
3. **Hook (0 → `hook.dur`, 2.5–3.5 s).** It decides retention. Lead with the
   payoff or a pattern-interrupt: a specific number (`number`), a POV line, a
   question, or typed `.wtt` text (`code`). Never open on the logo.
4. **Beats.** Each beat is one segment of a recorded scene. Reference moments
   by **marker names** (the [scene library](#scene-library)), never raw
   seconds, so a re-capture keeps working. Captions: kicker ≤ 4 words;
   `lines` ≤ 2 lines of ≤ ~14 characters each at the default size; wrap the
   accent word in `<em>`.
5. **With voice:** run `node scripts/voice.mjs phrases <file>`, then size each
   beat's `dur` so its caption starts with the matching phrase. Set
   `voice.at` so the first phrase lands on the hook, and choose `duration`
   ≥ voice length + 4.5 s.

## 3. Check, render, verify

```sh
cd listing/videos
node scripts/render.mjs <name> --still 20,80,140,200,260,320,380,440,500 --out <scratchpad>/check.png
```

Look at the sheet before a full render. Check that:
- captions aren't cut mid-word;
- close-ups show the intended UI (not scrolled content);
- nothing falls outside the text safe zone (x 90–900, y 250–1250);
- the hook is readable at 0:00–0:02.

Then run:

```sh
node scripts/render.mjs <name>      # → out/daily/<name>.mp4 + no-music/<name>-sfx-only.mp4
node scripts/verify.mjs <name>      # must print "All deliverables match"
node scripts/render.mjs <name> --still 45 --out out/daily/<name>-cover.jpg   # cover frame
```

## Fast-cut variations

Ten working examples: `compositions/daily-2026-10-03-es-v01…v10-*.html`,
each a different retention mechanism (stopwatch, negative hook, 6-second
loop, countdown list, close-up taps, a guess, a chat, big numbers, an
unpopular opinion, a routine to copy). Ten more, `…v11…v20-*.html`, each a
famous hook formula with its own layout (POV single take, before/after split
screen, diagnosis checklist, tier list, pick-one grid, demonstration tease,
"types of people" cards, a quiet "this is your sign" loop, a macro zoom-out,
a QR you are told not to scan). And ten bilingual ones, `v21…v30`: native
formats (tell-me-without-telling-me, red/green flags, the "Me / Also me"
meme, a search bar, a pause game, a find-it game, a spotlight, vlog
chapters, a receipt, rate-my). Start a new one from the closest example,
and don't reuse one layout twice in a batch; the blocks are in `lib/cuts.js`:

| Block | Use |
|---|---|
| `shot` / `cut` / `cam` / `play` | Full-frame footage; hard cuts between shots; a camera that punches in on a region (`frame('recap-pr')`, `RECTS` lists the regions) |
| `topBand` + `under()` | A solid band for the text, with the app framed below it |
| `pane` + `frameIn` / `still` | Footage in a window (split screens, grids, cards), framed on a region; held on one moment of the take |
| `label` | Text boxes in the platform's style. `at: 0` is on screen in frame 1 |
| `words`, `bigNumber`, `steps`, `countdown` | Word-by-word type, a slammed figure, a stepping counter, 3-2-1 |
| `stopwatch`, `progressBar` | Open loops. The stopwatch is only honest over footage at 1× |
| `chat`, `notes`, `strike` | A generic conversation or note as the "before" (never a real app's look) |
| `brandTag` | The small persistent tag that replaces the end card |

**Both languages from one file.** Write the composition as a module in
`compositions/src/<slug>.js` that exports `run(lang)`, with a `T = { es, en }`
table for every string (see `src/v21-dime.js`; one-off styles go through
`C.style()`). Each language then needs only a page
`compositions/daily-<date>-<lang>-<slug>.html` that imports the module and
calls `run('<lang>')`: copy one of the `v21…v30` pages. Look moments up by
marker, never by seconds: the two takes are not timed identically. There is
no English take of `import`. Check a contact sheet in **each** language:
English lines run shorter, Spanish ones overflow first.

Rules (from the research; check each on the contact sheet):

- **Frame 0 is the hook**, fully readable. Include still `0` in the sheet.
- **Something changes every 2–4 s**: a cut, a punch-in, a label, a sound.
- **One open loop**, closed in the last seconds.
- **No end card.** End on the payoff, a genuine question, or the first frame.
- **A typed number must equal the number on the screen behind it.**
- Keep `duration` even; music is in 2-second bars.
- Use `fill: 1` or less when framing a full-width region, or its text is cropped.

## Comedy reels (no app, no branding)

When the user wants something funny, viral, or "not like an ad", make a
**comedy reel**: one gym joke, 6–10 s, crude hand-drawn characters. Read
`listing/research/11-the-art-of-going-viral.md` first; the twelve examples are
`compositions/src/c01…c12-*.js` and the kit is `lib/toon.js`.

- **One joke**: premise → heighten three times → a twist, a look to camera, or a loop. Pick a premise people already complain about (the bank is in research 11) and be specific.
- **Nothing that smells like an ad**: no brand tag, no logo sting, no CTA, no app feature. `T.sign(ctx)` (a tiny signature) is the only mark. Captions go in the post (`batch-c-posting.md`).
- **The caption on screen is a meme caption** (`T.caption`), ≤ 8 words, on frame 0, the way a person would post it.
- **The face does the acting**: `T.face(ctx, ch, name, at)` and hold on it for the beat. Use `T.pose` with short durations (snap, then hold); do not ease everything smoothly.
- **Speech is gibberish** (`T.say`) with a short bubble, so ES and EN share the picture. Put every string in a `TXT = { es, en }` table.
- **Sound**: a sound and motion at t = 0; `boom` for a realisation, `scratch` for a turn, `crickets` for the silence after, `choir` for false hope. Leave silence before a punchline.
- **Hide the plate** (`T.egg`) somewhere in every scene and have it react.
- Start a new one with `scripts/new-page.sh cNN-slug`, check a contact sheet in both languages, render, and log it. Ask the user to log **sends** as well as hold and completion.

## Slideshows

A photo carousel (`slideshows/<name>.json` → `out/slideshows/<name>/01.png…`).
The pattern that works: **slide 1 is a situation, not the app** (a hook line,
over a gym photo when there is one), the tension builds for a slide or two,
and the app arrives as the answer; end card last. 4–7 slides.

```sh
cd listing/videos
node scripts/slideshow.mjs <name>
```

Slide types are documented at the top of `scripts/slideshow.mjs`: `hook`
(optional `image`, a photo in `assets/photos/` — no faces needed: a barbell,
plates, a gym floor), `text`, `app` (`clip` + `at: 'marker+offset'`, a real
frame of the recording) and `end`. Look at every slide before handing it
over: same line-length limits as the reels. End on a question when it fits
("¿Y tú, cuántas llevas?"); comments push reach.

## 4. Finish

- Add a row to `listing/videos/daily-log.md`: date, composition, format, lang, hook, tone, voice, features shown.
- Commit the composition or slideshow spec, the log row and any voice file.
  **Don't commit `out/daily/` or `out/slideshows/`** (gitignored and
  re-renderable).
- Don't push or merge unless the user asks.
- Tell the user:
  - the file paths;
  - a suggested caption and 3–5 hashtags;
  - that the SFX-only cut is for adding a trending sound or the platform's own text-to-speech;
  - that they should log the 3 s hold % and completion % a day later.

## Scene library

Recorded by `scripts/capture-app.mjs` from the production build with seeded
history (`scripts/seed.mjs`). The clips live in `listing/videos/build/clips/`
(English) and `build/clips-es/` (Spanish), both gitignored. If they're
missing, or the UI changed since the last capture, re-record both:

```sh
(cd ../.. && VITE_PUBLIC_URL=https://wtxworkout.com pnpm build-only && npx vite preview --port 5191)   # in the background; NOT the dev server (it shows a DevTools pill)
node scripts/capture-app.mjs [scene ...]
WTX_LOCALE=es node scripts/capture-app.mjs [scene ...]
```

`node scripts/clips.mjs <lang> <clip> <marker>[+offset] <out.png>` saves a
single frame. **The `history` calendar shows the current month**, which is
nearly empty early in a month: use `prev-month` for a full calendar.

| Scene | Markers (in order) | Shows |
|---|---|---|
| `workout` | `start` · `session` · `weight` · `pr-set` · `set-2`…`set-16` · `bench-done` · `fast-start` · `fast-end` · `finish` · `confirm`/`outro` · `recap` | Push Day: "Let's go" intro, typing 72.5 kg, one-tap sets with ghost values, rest timer, finish review, "Workout logged", recap with PR (72.5, was 70), +20 kg volume, 9-week streak, 25 workouts. **Recap scrolls at `recap`+2.6 s.** |
| `history` | `sessions-tab`/`calendar` · `prev-month` · `next-month` | Sessions tab: current-month calendar with trained days, session list with volume deltas. **List scrolls at `calendar`+2.4 s.** |
| `routine` | `open-routine`/`detail` · `show-source`/`source` · `share`/`qr` | Routine detail with exercise images, raw `.wtt` source, Share sheet with a real QR. |
| `plaintext` | `load` · `textarea`/`typing` · `line`×5 · `typed` · `add`/`added` | Load sheet: a routine pasted line by line, live parsed preview, lands on the new routine. |
| `accent` | `settings-tab`/`settings` · `swatch-1`,`-3`,`-5`,`-6`,`-0` | Accent color cycling through emerald, violet, amber, cyan, back to red. **Before `settings`+1.1 s it shows a price. Never use that part for the App Store.** |
| `import` | `opened` · `add`/`added` | The receiving side of a shared routine: the import screen for "Push Pesado" (not in the library), "Añadir a la biblioteca", then the routine's detail. |

Callout crops (`callouts: [...]` in a beat): `set-row-1` (workout, session),
and on the recap `recap-stats`, `recap-pr`, `recap-volume`, `recap-streak`,
`recap-milestone`; plus `calendar` (history). `lib/daily.js` clamps a beat
with callouts before the take scrolls. Custom crop:
`{ rect: { x, y, w, h } }` in 886×1920 clip pixels.

**Adding a scene** for a feature that isn't recorded yet:
1. Add an async function to `SCENES` in `scripts/capture-app.mjs`, using `tap(selector, { label })`, `scroll`, `sleep` and `mark`.
2. Add assertions that throw if the UI didn't do what the video will claim.
3. Record it, then check a contact sheet of `build/clips/<scene>/preview.mp4`.
4. Add it to the table above.

## Angle bank

Only claim what's on screen and actually shipped.

| Angle | Tone | Scenes |
|---|---|---|
| POV: you just hit a PR | hype / story | workout (`pr-set`, recap) |
| Log a workout in 20 seconds | tutorial | workout |
| Your workout is just text | clean / story | plaintext, routine (source) |
| Share a routine with a scan, no account | tutorial | routine (qr) |
| Don't break the streak | hype | history, workout recap |
| Last time's numbers, pre-filled | tutorial | workout (`session`→`bench-done`) |
| Rest timer that doesn't get in the way | clean | workout (`bench-done`→`fast-end`) |
| Make it yours (accent colors) | clean | accent (from `settings`+1.1) |
| 25 workouts later… (milestones) | story | history, workout recap |
| Needs a new scene first | any | superset / warm-up (W) / drop (D) sets; reorder exercises; export all data; Spanish UI; light theme; workout reminders; group workouts and the social feed (need a signed-in test account; never record real users' data) |

## Rules

- **Real footage only.** Don't mock up or fake UI or numbers. If the app can't show it, don't say it.
- **Music.** Only use `scripts/music.mjs`, which is original and license-free. Never add a copyrighted track to the file; that's what the SFX-only cut is for.
- **No price, no "new", no dates** in anything that might be reused for the stores.
- **Hook in the first 3 s. Captions work muted.** Keep critical text in the safe zone.
- **Timing.** Keep `duration` even and at 120 BPM (one beat = 15 frames), so cuts land on beats.
- **Verify before you hand it over.** `verify.mjs` must pass.
