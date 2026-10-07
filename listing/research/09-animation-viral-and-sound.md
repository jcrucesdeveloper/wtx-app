# Animated Promo Videos: Styles, What Goes Viral, and Sound (2026)

Researched 2026-10-06 for a batch of purely animated TikTok/Reels/Shorts videos
for WTX (no app footage required). Three questions, about 20 pages read for
each: **(A)** which animation styles exist and which we can make, **(B)** which
animation goes viral and how brands market with it, **(C)** what music and
sound do. Companion to `08-hooks-and-retention.md` (hook and retention rules,
which still apply).

Source quality is marked. "Page" counts below are pages actually read (the
search results alone are not counted). Vendor blogs are directional only.

## A. What animation styles exist (22 pages)

Sources: [Yans Media](https://www.yansmedia.com/blog/best-motion-graphics-styles),
[Moonb](https://www.moonb.io/blog/animation-styles),
[Levitate](https://levitatemedia.com/learn/2d-animation-styles-you-should-know-about),
[VideoExplainers (typography)](https://videoexplainers.com/blog/typography-animation-guide),
[B2W](https://www.b2w.tv/blog/types-of-motion-graphics),
[Pixune](https://pixune.com/blog/types-of-2d-animation),
[ManyPixels](https://www.manypixels.co/blog/motion-design/types),
[Centric DXB](https://www.centricdxb.com/insights/social-media-design-trends),
[Graphic Design Junction](https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/),
[OpusClip: 17 viral styles](https://www.opus.pro/blog/viral-ai-video-styles-2026),
[GarageFarm](https://garagefarm.net/blog/animation-trends-to-watch),
[AutoAE](https://autoae.online/blog/motion-graphics-trends-2026),
[Renderforest](https://www.renderforest.com/blog/logo-animation-trends),
[Creative Review (satisfying loops)](https://www.creativereview.co.uk/meet-the-artists-behind-the-webs-most-satisfying-videos/),
[Design Wanted (Wannerstedt)](https://designwanted.com/andreas-wannerstedt-interview/),
[Yanko Design](https://www.yankodesign.com/2021/05/12/oddly-satisfying-3d-loops-that-are-a-visually-and-audibly-pleasing-alternative-to-asmr/amp/),
[Know Your Meme: Stickman IRL](https://knowyourmeme.com/memes/stickman-irl-tiktok-trend),
[Know Your Meme: 5x30](https://knowyourmeme.com/editorials/guides/what-is-the-5x30-5minday-trend-the-tiktok-fitness-meme-explained),
[Miracamp (fitness formats)](https://www.miracamp.com/learn/content-creation/how-to-create-viral-fitness-content-on-tiktok-instagram),
[Wikipedia: 12 principles](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation),
[Wikipedia: squash and stretch](https://en.wikipedia.org/wiki/Squash_and_stretch),
[Wikipedia: kinetic typography](https://en.wikipedia.org/wiki/Kinetic_typography).

### The catalogue

| Style | What it is | Effort | Fits short social? | Can this pipeline make it? |
|---|---|---|---|---|
| Kinetic typography | Text is the animation, synced to audio | Low | Excellent: most video plays muted, 80% of viral clips have captions, 78.6% animate them (OpusClip) | Yes, native (HTML/GSAP) |
| 2D vector / flat motion graphics | Shapes, icons, type | Low–medium | Excellent | Yes (SVG + GSAP) |
| Character / mascot animation | A personality on screen | Medium | Excellent: "expressive mascots" is a 2026 trend | Yes: rigged SVG puppet, cut-out style |
| Cut-out / paper craft | Flat jointed pieces, handmade texture, stepped motion | Medium | Good; "handmade reads as premium because generative tools can't fake it" | Yes: SVG + stepped timing + paper texture |
| Mixed-media collage | Photo, texture, illustration layered | Medium–high | Strong | Partly (no photo library); texture + shapes only |
| Isometric | Fixed-angle pseudo-3D | Medium | Better for systems/B2B | Possible, low priority |
| Whiteboard / doodle | A hand "draws" the idea | Medium | Good for education; slower pace | Yes: SVG stroke-draw |
| Satisfying loops / simulation | Perfect physics, perfect sync, endless loop | Medium | Excellent: "visual ASMR", made in under a day on Instagram | Yes for 2D physics (bouncing, stacking) |
| Glitch / retro-digital | Distortion, VHS, chrome, pixel | Low | Strong with Gen Z; reaction to polished AI sameness | Yes: CSS/SVG filters |
| Pixel art / game | Retro sprites, HUD, chiptune | Medium | Strong; gaming and gym overlap | Yes: sprite arrays on canvas/CSS |
| Parallax 2.5D | Layered depth with a camera move | Medium | Good for mood pieces | Yes: layered divs |
| Liquid / "liquid glass" | Fluid blobs, refraction | Medium | Emerging, premium | Limited (blur + SVG goo filter) |
| 3D / Pixar-style / claymation | Modelled worlds | High–very high | Overkill or fragile for us | **No** (no 3D toolchain; AI video tools are out of scope) |
| Rotoscope / frame-by-frame cel | Traced or hand-drawn | Very high | Too slow | No |
| AI "brainrot" / talking objects | Generated absurd clips | Tool-dependent | Viral, but 2026 feeds are saturated | No generative tools; the *idea* (objects with faces) is doable in 2D |

### Findings that change how we build

1. **Handmade beats polished in 2026.** Three separate trend reports (Centric,
   AutoAE, GarageFarm) say grain, paper edges, imperfection and "human,
   hand-touched" design are the answer to AI-generated sameness. Declining:
   over-polished gloss, flat design, heavy 2024-25 transition tricks. So:
   texture, slightly uneven timing, stepped (on-twos) motion for craft pieces.
2. **Design vertical-first.** Centred text, closer framing, pop-ups and
   stickers, built for 9:16 from frame 1.
3. **Satisfaction is timing and synchronisation.** Wannerstedt (the
   best-known loop artist): "Timing and precision are key... flawless
   synchronisations between different objects." Coverage of his work calls the
   effect "visual ASMR" and points to the sound of two halves clicking
   together as half of it. Loops are cheap: a day's work.
4. **Kinetic-type rules (VideoExplainers):** one or two fonts; a small,
   consistent set of motions (the most common amateur mistake is animating
   every word differently); sync to the beat or it feels "clunky"; restraint
   is what makes a hit land.
5. **The principles that matter for fast 2D** (Wikipedia, starred): squash and
   stretch ("by far the most important"), follow-through and overlap, slow-in
   /slow-out, arcs, exaggeration. In GSAP terms: `back`/`elastic` eases,
   scale with preserved volume, overshoot then settle, arcs not straight lines.
6. **Stick figures are proven.** Alan Becker's stick-figure shorts: 5.5B views
   on the channel, "Animation vs. Math" 26M+ in a month with no dialogue, an
   escalation structure, and credibility (the maths was checked). "Stickman
   IRL" put crude stick figures into photos: 2.3M → 8.5M views per video in
   days, one sound, a template anyone could copy.
7. **Gym content that travels is absurd and simple.** The "5x30" meme: a
   crude figure doing hip thrusts to a slowed phonk track, copied across
   Roblox/sports edits. Fitness content with the highest engagement is
   educational or inspiring, 7–15 s is the engagement sweet spot (Miracamp,
   vendor).

## B. What goes viral in animation, and how brands market with it (22 pages)

Sources: [Duolingo: ContentGrip](https://www.contentgrip.com/duolingo-viral-strategy),
[Digiday](https://digiday.com/marketing/how-duolingo-is-using-its-unhinged-content-with-duo-the-owl-to-make-people-laugh-on-tiktok/),
[HubSpot](https://blog.hubspot.com/marketing/duolingo-unhinged-content),
[AdRoll](https://www.adroll.com/blog/unrolling-duolingo-how-unhinged-tiktoks-made-the-brand-a-winner),
[Brand24](https://brand24.com/blog/?p=173579);
[Dumb Ways to Die: Campaign Brief](https://campaignbrief.com/?p=180594),
[My Modern Met](https://mymodernmet.com/award-winning-dumb-ways-to-die/),
[SmartCompany](https://www.smartcompany.com.au/?p=40397);
[Amazing Digital Circus: YouTube blog](https://blog.youtube/creator-and-artist-stories/amazing-digital-circus/),
[Know Your Meme](https://knowyourmeme.com/editorials/what-is-the-amazing-digital-circus-the-dark-comedy-youtube-show-explained);
[Skibidi Toilet](https://en.wikipedia.org/wiki/Skibidi_Toilet),
[Cartoon Brew: Animation vs Math](https://www.cartoonbrew.com/shorts/alan-becker-animation-vs-math-short-231255.html);
[Spotify Wrapped: NoGood](https://nogood.io/2025/01/20/spotify-wrapped-marketing-strategy/),
[Spotify Engineering](https://engineering.atspotify.com/2024/1/exploring-the-animation-landscape-of-2023-wrapped),
[Design Compass](https://designcompass.org/en/2023/02/23/2022-wrapped-behind-story/);
[Cal AI: Starter Story](https://www.starterstory.com/cal-ai-breakdown),
[Rayz AI: Shortimize](https://www.shortimize.com/blog/from-zero-to-80k-mrr-in-75-days-how-rayz-ai-mastered-tiktok-marketing);
[Mascots on TikTok: Greenfly](https://www.greenfly.com/blog/tiktok-marketing-strategy-social-media-lessons-from-mascots/);
[LottieFiles](https://lottiefiles.com/blog/tips-and-tutorials/animated-ads-enhancing-marketing-campaigns),
[OpusClip: anatomy of a viral TikTok](https://www.opus.pro/blog/anatomy-of-a-viral-tiktok-2026).
(The IZEA mascot page returned 403 and is not counted. Hevy/Strong searches were
rate-limited; no gym-app case study was read beyond Stronger in 08.)

### Case studies, and the mechanism in each

| Case | What it is | Numbers | Mechanism we can copy |
|---|---|---|---|
| Duolingo (Duo the owl) | A mascot with a *personality* ("pushy friend"), unhinged skits, trend parodies | TikTok 16M+ followers; DAU up 62% in the period; "TikTok made me download it" | **Entertain first, sell second.** Running storylines (feud with Google Translate, the crush on a pop star) make followers insiders. Reply to comments as the character. Ride trends but match them to ideas you already had. Don't post unless the idea is good. |
| Dumb Ways to Die (Metro Trains) | Animated PSA: cute beans die in dumb ways, catchy song, one real warning at the end | 50M+ YouTube views, most-awarded campaign in Cannes history (5 Grand Prix), 21% fewer incidents | **A song + cute characters + dark humour + a list that escalates + the message last.** "People won't share unless it makes them look good." |
| The Amazing Digital Circus | Indie 3D pilot, dark humour, unique voice | 350–450M+ views on the pilot, #tag 1.3B uses on TikTok | **A distinctive visual voice and relatable anxiety**; fans make memes from characters. Not reproducible in 3D by us, but the lesson is a *recognisable character with a flaw*. |
| Skibidi Toilet | Crude Source Filmmaker clips, no dialogue, a meme-song mashup | 65B views by Nov 2023 | **Absurdity, no language barrier, a sticky audio hook, a very high upload cadence.** Simple-but-uncanny design. |
| Alan Becker stick figures | Stick figure vs. its environment, no dialogue | 26M in a month for one short | **Escalation, visual gags, no language, simple character.** |
| Spotify Wrapped | Personal data as an animated, swipeable, 9:16 story | 156M engaged users (2022), 200M in 24 h (2025), +21% app downloads (2020) | **Make the data the star; bold type, gradients, one stat per screen; built for sharing.** Their engineers used Lottie for brand motion. |
| Cal AI / Rayz AI (apps) | Creator/UGC/slideshow TikTok at volume, lots of accounts | 10M downloads; Rayz 40M+ views, $80k MRR in 75 days | **Volume of structurally different tests.** Product *is* the content; hook in 2.5–3 s with a POV caption. |
| Mascot accounts (Colts' "Blue", etc.) | Sports mascots on TikTok | 5–6.5M followers | Surprise, mini-narratives, sync to music and dance, collabs. |
| Animated ads in general (LottieFiles, vendor) | | "~80% more likely to watch to the end" (vendor, unverified) | Treat as direction only. |

### What the viral animations have in common

1. **A character with one clear trait** (Duo is pushy, Pomni is panicked, the
   stick figure is clever, the beans are idiots). Personality is the product.
2. **No language needed**, or text so short it reads in a glance (Skibidi,
   Becker, Dumb Ways). Fits Spanish and English from one file.
3. **A sound that sticks**: a song (Dumb Ways), a mashup (Skibidi), a slowed
   phonk loop (5x30), a trending audio (Duolingo). Sound is half the meme.
4. **Escalation**: each beat is bigger or dumber than the last, the best is last.
5. **Template-ability**: a format others can copy (Stickman IRL, 5x30) spreads
   by imitation, which is free reach.
6. **The brand shows up late and lightly.** (Dumb Ways: the message is the last
   line; Duolingo: the app is incidental; 08: "app after the midpoint".)
7. **Cadence and iteration**: Skibidi 2+ uploads/week at first; Cal/Rayz many
   accounts; Duolingo posts only when the idea is good.

### How this applies to WTX (promote the app without showing it)

WTX's real, shipped selling points (from the angle bank, all on screen in the
footage reels): log a set in one tap with last time's numbers pre-filled; a PR
and volume vs. last time on the recap; streaks; routines are plain text
(`.wtt`) you can paste; share a routine with a QR, no account; a rest timer;
accent colours. Animation lets us dramatise the *problem* (forgetting the
numbers, losing the notebook, the Notes app) with characters, and name WTX as
the quiet answer. Every claim stays one the app really makes.

## C. Music and sound (20 pages)

Sources: [AudioNetwork](https://blog.audionetwork.com/the-edit/music/music-for-vertical-video),
[SocInvestigation](https://www.socinvestigation.com/use-trending-audio-to-gain-more-tiktok-reels-likes/) (no data),
[TikTok: Evolution of Sound](https://ads.tiktok.com/business/it/blog/evolution-of-sound-volume-2),
[Social Media Today: TikTok sound](https://www.socialmediatoday.com/news/tiktok-shares-new-insights-into-the-importance-of-sound-for-marketing-promo/601569),
[Social Media Today: business music rules](https://www.socialmediatoday.com/news/tiktok-changes-rules-on-music-usage-by-businesses/577734/),
[TikTok Commercial Music Library](https://ads.tiktok.com/business/en-US/blog/audio-library-royalty-free-music),
[Soundstripe: library](https://www.soundstripe.com/blogs/tiktok-music-library-explained),
[Soundstripe: licensing](https://www.soundstripe.com/tiktok),
[Soundtrap: Brazilian phonk](https://blog.soundtrap.com/guide-to-brazilian-phonk/),
[Wikipedia: Phonk](https://en.wikipedia.org/wiki/Phonk),
[The Media Online: audio logos](https://themediaonline.co.za/2021/10/ding-ding-the-future-of-audio-logos-for-brands-sounds-promising),
[Oakgen: sound psychology](https://oakgen.ai/blog/sound-branding-psychology),
[Wikipedia: sound logo](https://en.wikipedia.org/wiki/Sound_logo),
[Morphic: SFX](https://morphic.com/resources/how-to/how-to-add-sound-effects-to-video),
[Finchley: SFX for Reels](https://www.finchley.co.uk/finchley-learning/short-video-mastery-tiktok-and-instagram-reels-using-sound-effects-for-video-editing),
[Splice](https://spliceapp.com/blog/mastering-short-form-video-editing-guide/),
[Wikipedia: Mickey Mousing](https://en.wikipedia.org/wiki/Mickey_Mousing),
[Wikipedia: ASMR](https://en.wikipedia.org/wiki/Autonomous_sensory_meridian_response),
[Wikipedia: sound effect](https://en.wikipedia.org/wiki/Sound_effect),
[Wikipedia: Foley](https://en.wikipedia.org/wiki/Foley_(filmmaking)).
(The Kantar report page on TikTok's site rendered no article body; its figures
are read from the Social Media Today summary.)

### Findings

| # | Finding | Source quality |
|---|---|---|
| 1 | **TikTok is a sound-on platform**: 88% of users call sound essential, 73% would "stop and look" at an ad with audio, sound is "fun" 66% more than on other platforms (Kantar via TikTok). **Instagram Reels must also work muted**: design visuals that carry alone. | Platform + Kantar |
| 2 | **Tempo.** Faster BPM suits vertical editing; the opening must hit within 1–3 s (a beat, a hook, a burst), not a long ambient build; **track endings matter more than in ads because videos loop**: clean outros, cyclical design. | Vendor (AudioNetwork), consistent with 08 |
| 3 | **Sound effects** do the heavy lifting: whoosh for movement, impact for a hard cut or landing, a soft tick for text changes, a riser into an impact for a reveal. Layer two (whoosh + impact) only for moments with weight; land the sound "a hair before or right on" the picture; nudge frame by frame; a handful of clean cues beats a wall of noise. | Practitioner guides (3 pages agree) |
| 4 | **Sync is an old, proven animation trick.** "Mickey Mousing" ties motion to musical hits so the music seems to take part in the action (Fantasia). Overused in serious film, ideal for comedy and cartoons. | Wikipedia |
| 5 | **Satisfying = sound + motion.** The loop artists' own pieces rely on a click when two halves meet and a soft rustle: "visual ASMR". ASMR triggers: tapping, scratching, crinkling, lower-pitched complex sounds, slow detail. Evidence for ASMR is limited; the experiments on ads show better recall, not magic. | Mixed |
| 4b | A study of food short videos found **sound-effect-led** videos drove higher exploration intent for men, natural sound for women. | Academic abstract; low weight |
| 6 | **Gym/edit music is phonk**: Brazilian/drift phonk runs ~130–160 BPM, minor key (Phrygian), distorted 808 bass, **cowbell as the defining element**, rolling hats, chopped pitched vocals, 3–4 note loops; it is tied to weightlifting, fighting and car edits. The "5x30" meme is slowed phonk. | Soundtrap + Wikipedia |
| 7 | **Sonic logo**: a 1–3 s signature; qualities: unique, memorable, relevant. Claims of "+96% recall" and "8.5× more likely to perform" come from vendor pages quoting studies we could not trace: treat as direction. | Weak numbers, strong idea |
| 8 | **Tempo psychology** (vendor, uncited): ~60–80 BPM calm; 110–130 energetic; 130–150+ urgent. Matches practice. | Weak |
| 9 | **Licensing (important).** A *business* TikTok account can use only the Commercial Music Library (600k–1M tracks and sound effects), and that licence covers **TikTok only**, not Reels/Shorts. Popular/trending commercial tracks carry a "not available for commercial use" warning for business accounts. There is no "30-second rule". A track you license yourself travels with the file. | Platform + licensing vendor |

### What this means for the sound of these videos

- **Original, synthesised music only** (the project rule): there is nothing to
  license, nothing to claim. The existing engine makes one style (120 BPM EDM).
  The research says different videos need different sound worlds, so
  `scripts/music.mjs` gets new styles (phonk, cartoon/ukulele, chiptune,
  lo-fi, marimba/xylophone, glitch, ambient, ASMR-only) and new effects
  (cowbell, boing, slide whistle, plate clank, paper, pencil, bubble pop,
  coin, glitch, sonic-logo stinger).
- **A sonic logo for WTX**: a 3-note, <1 s stinger used as the last beat of
  every video, with a tiny logo move (research: quiet micro-motion + sound-synced
  stinger, platform-native).
- **BPMs chosen so a beat is a whole number of frames at 30 fps**: 150 BPM (12
  frames), 120 (15), 100 (18), 90 (20), 75 (24).
- **Every video is also exported SFX-only** (the pipeline already does this) so
  a trending sound can be laid under it in the app. For a *business* account
  that sound must come from the Commercial Music Library; on a personal account
  any trending sound is available but the account is then not a brand account.
- **Everything works muted**: kinetic captions carry every message.

## Design rules for this batch (what the research asks us to do)

1. **Frame 0 is the hook**, readable. Something changes every 2–4 s.
2. **A character or a gesture, not a layout**: at least half the batch has a
   character with a trait (stick figure, plate mascot, beans, pixel lifter).
3. **No language dependency where possible**; text is short; ES primary,
   EN from the same module via a string table.
4. **Escalation, with the best beat last**, and one open loop closed in the
   final seconds. Loop-friendly endings.
5. **Sound-world per video** and sync hits to the picture on the frame.
6. **The app appears late and lightly**: a small brand tag all the way through
   (plus the sonic-logo stinger) and, where it fits, a single honest line about
   what WTX does. No fake UI; no price; no "new".
7. **Handmade texture** (grain, paper, stepped motion) on the craft pieces;
   restraint on the typographic ones (one font, one motion vocabulary).
8. **Different structure each time** (08: test structure, not wording).

## The batch

| # | Name | Style (A) | Viral mechanism (B) | Sound world (C) | Length |
|---|---|---|---|---|---|
| 1 | `a01-olvido` | Stick-figure character | Becker-style escalation, no dialogue | Cartoon: boing, slide whistle, pizzicato | 16 s |
| 2 | `a02-placa` | Mascot skit (plate with attitude) | Duolingo: a pushy character, notification as the joke | Comedic stings, muted trombone, pops | 14 s |
| 3 | `a03-tipografia` | Kinetic typography | Muted-first captions, beat-synced slams | Brazilian-phonk 150 BPM with cowbell | 14 s |
| 4 | `a04-satisfying` | Satisfying loop (plates on a bar) | Visual ASMR, perfect loop | ASMR only: clanks, soft clicks; no music | 12 s |
| 5 | `a05-xilofono` | Musical ball-run over plates | Audio-visual sync; melody *is* the video | Marimba/xylophone melody played by the animation | 16 s |
| 6 | `a06-resumen` | Animated data story (Wrapped-style) | Spotify Wrapped: one stat per screen, shareable | Bright pop-house 120 BPM | 16 s |
| 7 | `a07-papel` | Cut-out paper craft, stepped motion, grain | 2026 handmade trend | Lo-fi 90 BPM + paper/pencil foley | 14 s |
| 8 | `a08-codigo` | Glitch / terminal | Retro-digital; "your workout is text" | Synthwave/chip arps, glitch FX | 12 s |
| 9 | `a09-boss` | 8-bit pixel game | Gaming × gym; progressive overload as XP | Chiptune 150 BPM | 16 s |
| 10 | `a10-tontas` | Cute beans list ("Dumb Ways to Die") | The most-awarded animated campaign ever | Jaunty whistle + ukulele-pluck tune | 18 s |
| 11 | `a11-noche` | Parallax night-gym mood piece | Cinematic, calm, shareable quote | Ambient pads, heartbeat, distant clank | 12 s |
| 12 | `a12-doodle` | Hand-drawn whiteboard doodle | Educational (highest-engagement fitness format) | Soft marimba + pen scratch, 100 BPM | 14 s |

Per `08`, each is a different structure, and each ends on the WTX stinger plus
a persistent tag, not an end card.
