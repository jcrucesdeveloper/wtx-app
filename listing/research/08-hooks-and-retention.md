# Hooks & Retention for Short-Form Video (2026)

Researched 2026-10-03, after the first Spanish reels read as "kind of
boring". This is what the platforms and the people who measure them say
keeps a viewer watching, what that changes in our reels, and the ten video
variations built from it.

Source quality is marked. Platform documents and large datasets are solid;
most percentage claims come from vendor blogs and are used for direction
only.

## What the research found

| # | Source | Finding | Quality |
|---|---|---|---|
| 1 | [TikTok: creative best practices](https://ads.tiktok.com/resources/help/article/creative-best-practices) | Hook in the first 6 s with suspense or surprise; state the proposition in the first 3 s. On-screen text at 5–10 words per second. Use sound. A DIY, not overly polished look. Structure: hook → selling points → call to action. | Platform document |
| 2 | [Instagram ranking signals (Mosseri, via SocialPilot)](https://www.socialpilot.co/blog/instagram-reels-algorithm) | The three heaviest signals for Reels: watch time and completion, likes per reach, and **sends per reach** (DM shares, the strongest for reaching non-followers). Replays count: a 15 s Reel watched three times beats a 60 s Reel watched once. | Platform statements, second-hand |
| 3 | [OpusClip: anatomy of a viral TikTok](https://www.opus.pro/blog/anatomy-of-a-viral-tiktok-2026) | 13.5M clips. Hooks that **show the product or outcome first** averaged about 2× the views of the worst type; **story-setup hooks performed worst**. 80.2% of viral clips use captions, 78.6% animated. Viral clips are 18% shorter than average (median 41 s). | Large dataset, one vendor |
| 4 | [OpusClip: length and retention](https://www.opus.pro/blog/tiktok-length-format-retention-data) | 21–34 s has the best completion. A visual change every 3–5 s: 58% average retention vs 41% for static. Captions +12% retention. Text stays on screen at least 2 s. | 500 videos |
| 5 | [Pattern interrupts guide](https://edicionvideopro.com/en/editing-for-platforms-video-marketing/pattern-interrupts-tiktok-retention-guide/) | Seven interrupts: sudden zoom, jump cut, angle switch, pop-up text, colour shift, sound punch, speed ramp. One every 3–5 s, at irregular intervals. Using all of them at once reads as chaotic. | Vendor, 200 videos |
| 6 | [UGC Copilot: hook framework](https://ugccopilot.ai/blog/viral-hooks-that-convert/) | Unpopular-opinion, POV and specific-outcome hooks: 35–45% higher 3-second retention than a generic product reveal. **Negative framing: 1.3–1.8× the hook rate** of the same idea framed positively. Specific numbers beat vague claims. The decision is made in about 1.5 s. | Vendor, large sample claimed |
| 7 | [Hook and hold rate benchmarks](https://sepia-lab.com/en/blog/hook-rate-benchmarks) | Hook rate = 3-second views ÷ impressions. TikTok average 30–45%, top quarter 48–55%. Hold rate (finished ÷ hooked): 40–50% typical, under 30% weak. | Vendor benchmarks |
| 8 | [Stronger: "viral on demand"](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) | A gym app's best format was a **6-second fade-in from black to an image**: watched twice on average. About 300 variations, an estimated 200–300M views. They test structural changes, not wording tweaks, and kill losers fast. | Founder interview |
| 9 | [Four viral ad formats](https://www.blog.theperformers.io/p/what-tiktok-s-most-viral-videos-can-teach-you-about-making-ads-that-actually-work-steal-these-4-form) | The 6-second on-screen listicle: **text that takes longer to read than the video lasts**, so it loops (7.1M views). The "so easy to use" challenge: a bold claim, then the real-time proof. | Newsletter, named examples |
| 10 | [Looping](https://joyspace.ai/looping-hack-trick-algorithm-double-views), [retention math](https://www.socialync.io/blog/tiktok-viral-retention-rate-2026) | A last frame that matches the first makes viewers start a second watch before noticing. The last 2 s should earn the rewatch. A rewatch rate over 15–20% is excellent. | Vendor blogs |
| 11 | [Sub Club: Joseph Choi](https://subclub.com/episode/how-to-go-viral-on-tiktok-and-profit-from-it-joseph-choi-viral-app-founders) | Lead with value, mention the app incidentally, and place it after the midpoint. Avoid "link in bio". The test for any post: "would someone send this to a friend?" Shareable in-app moments (progress, achievements) are the raw material. | Founder interview |
| 12 | [YouTube Shorts: viewed vs swiped away](https://subscribr.ai/youtube-strategy/youtube-shorts-analytics-metrics-viral) | The first metric to read. 70%+ viewed is the target; 30–40% swiping away means the first second is failing. | Vendor reading of a platform metric |
| 13 | [Loewenstein's information gap](https://www.cmu.edu/dietrich/sds/docs/golman/golman_loewenstein_curiosity.pdf), Zeigarnik effect | Curiosity is the gap between what you know and what you want to know; it needs the gap to look closeable. Unfinished things hold attention until they resolve. | Academic |
| 14 | [TikTok engagement-bait rules](https://www.auditsocials.com/blog/tiktok-engagement-bait-community-guidelines) | "Like if you agree" style prompts are penalised. A genuine question is fine. | Vendor reading of platform rules |

Not found: any study comparing these formats for a gym app in Spanish. The
Spanish gym content that travels is relatable humour (leg day, the friend
who copies your routine), which is a tone to borrow, not a number.

## What was wrong with the first reels

| Problem in `daily-2026-10-02-es-*` | Evidence |
|---|---|
| **Frame 0 was garbage**: every caption and the end card drawn on top of each other. A bug in `lib/engine.js` (a paused timeline seeked to exactly 0 applies nothing scheduled at 0), found while building these and fixed; every earlier video was re-rendered | The first frame is what the feed shows (6, 12) |
| The hook text rises in over 0.7 s, so frame 1 is almost empty | The decision takes about 1.5 s (6, 12) |
| Every reel is the same shape: hook → one phone → captions → end card | Structural variety is what gets tested (8) |
| One continuous take in one phone: nothing changes for 4–6 s at a time | A change every 3–5 s (4, 5) |
| A 4-second end card: 22% of an 18 s reel with nothing to watch | Completion and replays are the top signals (2, 10) |
| Positive, generic hooks ("Registra tu entreno en 20 segundos") | Negative framing, POV and specific numbers win (6); outcome first (3) |
| Polished brand look throughout | TikTok asks for DIY (1) |
| No reason to comment or send it | Sends and comments are ranking signals (2, 14) |

## Rules these variations follow

1. **Frame 1 is the hook.** The text is fully on screen at 0:00, no entrance.
2. **Outcome or tension first**, the app as the answer. Never a story setup.
3. **Something changes every 2–4 s**: a cut, a punch-in, a pop-up, a sound.
   Irregular, and never all at once.
4. **One open loop per video** that closes late: a stopwatch, a countdown,
   a "guess", a list whose best item is last.
5. **No end card.** A small brand tag stays on screen; the last second is
   the payoff, a question, or the first frame again (a loop).
6. **Length is a variable**: 6–8 s loops, 12–16 s punchy, 20–26 s when a
   timer or a list holds the viewer.
7. **Text**: 5–10 words per second, at least 2 s on screen, readable muted.
8. **End on a genuine question** where it fits. Never "like if…".
9. **Only what the app really shows.** The footage is the recorded app; any
   number on screen is a number the app displays.

## The ten variations

All Spanish, 1080×1920, compositions in `listing/videos/compositions/`
(`daily-2026-10-03-es-vNN-*`). Shared blocks are in `listing/videos/lib/cuts.js`.

| # | Name | Mechanism (why it holds) | Hook on frame 1 | Length | Status |
|---|---|---|---|---|---|
| 1 | `v01-speedrun` | A running stopwatch is an open loop; the real take plays at 1× so the time is true | "Speedrun: registrar un entreno completo" + 0.0 s | 22 s | built |
| 2 | `v02-notas` | Negative hook, then three fast proof cuts | "Deja de anotar tus pesos en Notas." | 14 s | built |
| 3 | `v03-loop` | 6 s fade-in with a list too long to read once, so it loops | "Cosas que mi app de gym hace sola:" | 6 s | built |
| 4 | `v04-top3` | Countdown list; the best item is last | "3 cosas que tu app de gym debería hacer sola" | 18 s | built |
| 5 | `v05-satisfying` | Close-up taps with their sounds, no music, a counter climbing to 16/16, loops | "El sonido de terminar tu rutina" | 12 s | built |
| 6 | `v06-adivina` | A guess, a 3-2-1 countdown, the reveal | "¿Récord o no? Adivina." | 12 s | built |
| 7 | `v07-chat` | A text conversation between gym friends, then the real app answers it | "bro pásame tu rutina de push" | 16 s | built |
| 8 | `v08-wrapped` | "Wrapped"-style big numbers, each backed by the real screen | "Mi mes en el gym, en números" | 16 s | built |
| 9 | `v09-opinion` | Unpopular opinion, word-by-word type, fast cuts | "Opinión impopular: tu app de gym no necesita IA." | 14 s | built |
| 10 | `v10-copia` | Value first: a routine worth saving, then where to paste it | "Rutina de torso en 3 ejercicios. Cópiala." | 16 s | built |

## How to read the results

Per post, a day after publishing: **hook rate** (3-second views ÷ views
shown; on Shorts, "viewed" %), **completion**, and for the loops **average
watch time ÷ length** (over 100% means rewatches). Compare formats against
each other on this account, not against the benchmarks above. Keep the two
best structures and make hook variants of those; drop the bottom half.
