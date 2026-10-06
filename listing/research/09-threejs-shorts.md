# Three.js Shorts: "a routine is a file" (2026)

Researched 2026-10-06. The reels so far are recordings of the app. This is a
second kind: a 3D animation with no app footage, about the idea behind WTX
(a routine is a file you send), aimed at gym and dev viewers at once. It
builds on the retention rules in [`08-hooks-and-retention.md`](08-hooks-and-retention.md).

Source quality is marked. Almost everything found this time is a vendor or
agency blog, so it is used for direction only.

## What the research found

| # | Source | Finding | Quality |
|---|---|---|---|
| 1 | [Media.io: gym edit templates](https://www.media.io/ai/explore/zone/capcut-gym-template), [SmartHealthClubs](https://smarthealthclubs.com/blog/7-social-media-marketing-tips-to-promote-your-gym-in-2025/) | The gym edit of 2026: speed ramps, impact zooms, shake, fast cut-ins, phonk pacing, progress reveals. Trends work when remixed into gym life, not copied. | Vendor blogs |
| 2 | [wod.guru: gym TikToks](https://wod.guru/blog/gym-tiktoks/) | What travels is relatable humour between gym friends, told as POV with text on screen. | Vendor blog |
| 3 | [Ice Animations: 2026 trends](https://iceanimations.com/blogs/3d_animations_powering_-gamings_future-2-2-3/) | Short loops and kinetic type that lands on the beat are the animation styles made for feeds. Its percentages have no stated method. | Agency blog |
| 4 | [Design Wanted](https://designwanted.com/andreas-wannerstedt-interview/), [Creative Review](https://www.creativereview.co.uk/meet-the-artists-behind-the-webs-most-satisfying-videos/) on "oddly satisfying" loops | Perfect loops of simple, bright shapes doing one physical thing cleanly, with the sound of each contact. Things slotting into place is the payoff. | Interviews with the artists |
| 5 | [Starter Story: Screen Studio](https://www.starterstory.com/screen-studio-breakdown) | 8,000 customers in nine months from demos alone. Each demo was made with the product, so the look of the post was the advert. | Founder story |
| 6 | [Playkit: Cal AI](https://playkit.beehiiv.com/p/calorie-tracker-app) | 40M+ views from 19-second clips with text, sound effects and no dialogue, so they cross languages. Built to draw comments. | Newsletter |
| 7 | [Superwall: Stronger](https://superwall.com/blog/how-stronger-built-a-usd600k-app-using-viral-on-demand-tiktok-strategy) (from 08) | A gym app's best format was a 6-second clip watched twice. About 300 structural variations; losers dropped fast. | Founder interview |

**Not found:** any measurement of Three.js or 3D motion graphics against
filmed footage for an app. The case for 3D here is findings 3 and 4 plus the
rules in 08, not a number.

## Takeaways

1. **Open on a line gym people have typed.** "Bro send me your routine" is
   the POV hook, and it is the product's reason to exist (2).
2. **No dialogue.** Text and motion only, so one build works in Spanish and
   English and reads muted (6).
3. **One clean physical action as the payoff**: things slotting into place,
   in bright flat colour (4).
4. **A hit every second or two**: a colour change, a shake, a text swap (1, 3).
5. **Loop it.** Last frame equals the first; 10 s watched twice beats 20 s
   watched once (7, and 08).
6. **The product is the picture.** The file on screen is the real
   `push-day.wtt` (5).

## Five concepts

| # | Name | Hook (first 1–2 s) | 3D visual | On-screen text | CTA |
|---|---|---|---|---|---|
| 1 | **Send the file** (built) | "Bro send me your routine" over two phones in a chat | Seven screenshots fly out of one phone and get crossed out. A chunky `.wtt` file pops out, turns, and is thrown into the other phone. It lands and becomes a barbell: one pair of plates slides on per exercise | "Me: sends 7 screenshots" → "Just send the file." → "Whole routine. One file." | "Now send it to your gym bro" + wtxworkout.com |
| 2 | Barbell from data | "Your workout is 6 lines of text." | Lines of a `.wtt` file peel off the page; each bends into a plate and slides onto a bar. The last line racks it | Each line as it loads, then "That's the whole file." | "Write yours" + address |
| 3 | Sets stack up | "4×8. Watch it stack." | One block drops per set, with a counter; the tower finishes and the top block turns gold for the PR. Loops by collapsing into the first block | "Set 1… Set 4" → "PR" | "Log it in one tap" |
| 4 | Screenshot graveyard | "My camera roll is 400 routine screenshots." | A wall of screenshot tiles is sucked into one small file, leaving an empty, clean grid | "400 screenshots" → "1 file, 312 bytes" | "Clean it up" + address |
| 5 | `cat push-day.wtt` (dev) | "Your gym app's export button is lying to you." | A terminal floating in space; `cat push-day.wtt` prints the routine, the text lifts off the screen and becomes the bar and plates; `git diff` shows the bench going 60 → 62.5 | "Plain text. Yours. Diffable." | "Open format" + address |

Built: **1**. It is the only one where the hook, the joke and the product
are the same sentence, it has the "would I send this to a friend" test built
into its last line, and it uses two of the three visuals asked for (the file
between phones, the barbell built from data). 2 and 5 are the next to make:
they reuse its barbell.

## The build

`listing/videos/three/routine-is-a-file.html`: one file, Three.js from a
CDN. Open it in Chrome and press Record for a `.webm` of one loop.
`?lang=es` for Spanish, `?loops=2` for two loops in one file.

| Time | Beat | What changes |
|---|---|---|
| 0.0 s | Hook, already on screen | Yellow. Two phones, the message in both chats |
| 1.5 s | The pain | Seven screenshots fly out; at 2.7 s a red cross and a shake; "can't read this" in the chat |
| 3.5 s | The fix | Wipe to blue. The file pops out of the phone and turns to show its name |
| 4.55 s | The throw | The file arcs across with a trail |
| 5.3 s | Payoff | Flash, confetti, wipe to red. A bar appears; five plate pairs slide on, one row of the routine with each |
| 8.0 s | CTA | The barbell does a rep; the address, on screen from the start, steps forward |
| 9.4 s | Reset | Wipe back to yellow; frame 300 is frame 0 |

Every position is a function of the frame number, so the loop has no seam
(checked: frame 0 and frame 300 are pixel-identical). The recording runs in
real time, so keep the tab in front while it records. It has no sound: add
the track in the app.
