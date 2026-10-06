# Animation Craft: Colour, Movement and Tooling (2026)

Researched 2026-10-06 after batch D was judged: the hooks hold, but "the
animation and the colours are not enjoyable to watch, it looks like poor
animation without taste". This is about **craft**: what makes drawn motion
pleasant, how colour is chosen, and what tooling gets us there. ~22 pages read.

Sources. Movement: [Netguru: the 12 principles for motion design](https://www.netguru.com/blog/illustrators-eye-12-principles-of-animation),
[GarageFarm: follow-through and overlap](https://garagefarm.net/blog/follow-through-and-overlapping-action-in-animation),
[RebusFarm: smear frames](https://rebusfarm.net/blog/smear-frames-in-animation-how-animators-create-fast-and-dynamic-motion),
[CG-Wire: smear frames](https://blog.cg-wire.com/smear-frames/),
[Wikipedia: smear frame](https://en.wikipedia.org/wiki/Smear_frame),
[Creative Bloq: how Spider-Verse got its look](https://www.creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look),
[Wikipedia: limited animation](https://en.wikipedia.org/wiki/Limited_animation),
[Wikipedia: UPA](https://en.wikipedia.org/wiki/United_Productions_of_America),
[Wikipedia: rubber hose animation](https://en.wikipedia.org/wiki/Rubber_hose_animation),
[itch.io: making a game feel juicy](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects),
[Wikipedia: inverse kinematics](https://en.wikipedia.org/wiki/Inverse_kinematics).
Colour: [LottieFiles: colour theory for motion design](https://lottiefiles.com/blog/tips-and-tutorials/color-theory-for-motion-design),
[No Film School: the 60-30-10 rule](https://nofilmschool.com/60-30-10-color-rule),
[Pixflow: character colour palettes](https://pixflow.net/blog/the-ultimate-guide-to-creating-memorable-character-color-palettes/),
[Arts at Michigan: Kurzgesagt](https://artsatmichigan.umich.edu/ink/2019/09/27/simple-bright-beautiful-the-work-of-kurzgesagt),
[Prompt Index: colour for thumbnails](https://www.thepromptindex.com/skill/1950-color-psychology-thumbnails) (no sources cited),
[Wikipedia: colour scheme](https://en.wikipedia.org/wiki/Color_scheme).
Design: [RocketBrush: shape language](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent),
[BINUS: character design 101](https://binus.ac.id/bandung/dkv/2025/11/04/character-design-101-turning-simple-shapes-into-personality/).
Tooling: [GSAP MorphSVG](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/),
[GSAP CustomEase / CustomBounce / CustomWiggle](https://gsap.com/docs/v3/Eases/CustomEase/),
[rough.js](https://roughjs.com/), [Rive](https://rive.app/features).
(Not readable: Codrops on the free plugins (403), Fable (DNS).)

## Why batches C and D look cheap (an honest diagnosis)

| What we did | The principle it breaks |
|---|---|
| Limbs are straight black rectangles on hinges | **Arcs, appeal.** Nothing organic moves in straight lines; rigid sticks have no charm. |
| Characters teleport between poses (0.1 s tween, then frozen) | **Anticipation, slow in/out, overshoot.** No wind-up, no settle. |
| Everything stops on the same frame | **Follow-through and overlapping action.** "Without it, characters feel stiff, robotic." Nothing lags, nothing settles. |
| Bodies never change shape | **Squash and stretch**, "the most important principle". |
| Fast moves are just a fast tween | **Smears**: 1–2 stretched or multiplied frames carry the eye through a fast action. |
| A held pose is a dead still | **Moving holds / secondary action**: blinks, breathing, a hair tuft. |
| One random loud colour per reel, radial gradient | **No palette.** No 60-30-10, no value plan, no relation between reels. Fully saturated everything reads as garish. |
| Pure black lines, pure white skin, no shadow | **Solid drawing.** No form: no shadow tone, no ground contact, no depth. |
| Stick-men with a headband | **Shape language and silhouette.** No design: nothing to like. |
| Empty beige/colour void behind them | **Staging.** No place, no depth, no light. |

"Limited animation" is not the problem: UPA and Hanna-Barbera made limited
animation a *style* by pairing few drawings with **strong design** and by
moving either not at all or very fast. Ours was limited without the design.

## What the craft says

### Movement
1. **Squash and stretch**: 10–30 % on impact for 1–3 frames, **volume constant**
   (wider when shorter).
2. **Anticipation**: 2–8 frames, opposite to the action, 30–50 % of its range,
   never longer than the action.
3. **Follow-through / overlap**: loose parts lag 4–12 frames and settle over
   8–16; lead with the body, then the head, then hair and cloth. Don't end
   everything on one frame.
4. **Slow in / slow out**, with **overshoot**: go slightly past the pose and
   settle back.
5. **Arcs**: hands and heads travel on curves. In practice: **inverse
   kinematics**: animate where the hand goes and let the elbow follow.
6. **Timing**: heavy = more frames (16–24), light = few (6–12). Vary it.
7. **Exaggeration**: 120–150 % of real.
8. **Smears**: an elongated in-between or 2–3 multiples, **one or two frames**,
   only on fast single-path actions, between the keys.
9. **On twos**: Spider-Verse held most character drawings for two frames
   (12 per second) with **no motion blur**: "crunchy", each pose reads longer
   and looks drawn. Camera and effects can stay on ones.
10. **Juice** (game feel): a 0.1–0.3 s screen shake that tapers, squash on
    landing, dust and particles, a short freeze on a big hit, layered sound.

### Colour
1. **60-30-10**: one dominant (usually the background), one secondary, one
   accent used sparingly on what the eye should find.
2. **A limited palette, consistently**: Kurzgesagt is recognisable because the
   system never changes. A series needs one palette, not a colour per episode.
3. **Value first**: a character must read in greyscale; contrast ≥ 4.5 : 1
   against the background.
4. **Saturation is rationed**: focal elements 85–100 %, supporting elements
   and backgrounds 30–60 %. Maximum saturation everywhere looks artificial
   and "triggers distrust" (vendor, uncited, but standard practice).
5. **Warm subject on a cool ground** separates the two and reads as depth;
   warm-dominant frames do better for entertainment (same vendor).
6. **Harmony**: split-complementary gives contrast "with less pressure" than a
   pure complement; analogous for the calm parts of the frame.

### Design
1. **Shape language**: circles = friendly, squares = solid, triangles = sharp.
   Pick one dominant shape per character and exaggerate it.
2. **Silhouette first**; proportions carry personality (big head, small body
   reads young and likeable: the baby schema from research 10).
3. **Rubber hose** (1920s New York; Felix, early Mickey; revived by Cuphead
   and the 2013 Mickey shorts): limbs as flowing curves without joints, simple
   round shapes, constant bounce. It was invented because it is **fast to
   draw and reads as alive**: the right style for a procedural rig.

### Tooling
| Option | Verdict |
|---|---|
| **GSAP plugins** (MorphSVG, CustomEase, CustomBounce with squash, CustomWiggle, MotionPath, Physics2D, DrawSVG) | **All free since Webflow acquired GSAP, and already installed** (`gsap@3.15`). Use them. |
| **Procedural SVG rig** (inverse kinematics, springs, drawn per frame) | **Build this.** Deterministic, fits the frame-by-frame renderer, and gives arcs, overlap and squash by construction instead of by hand. |
| Rive | A real character-animation runtime, but authoring needs its editor. Not usable from code alone. |
| Lottie | Plays After Effects exports; we have nothing to export from. |
| rough.js | Sketchy shapes; no seed control documented, and our line boil already does the job. |

## The system for batch E

- **A cel engine** (`lib/cel.js`): characters are SVG, redrawn every frame from
  a small set of animated numbers. Arms and legs are **rubber-hose curves
  solved by IK** to hand and foot targets, so every reach is an arc.
- **Secondary motion is simulated, not keyed**: headband tails and a hair tuft
  on springs (follow-through), the body squashing on its own acceleration
  (squash and stretch), the head lagging the body (overlap). It is run once
  before rendering, so every frame is still deterministic.
- **Characters on twos, camera on ones**; smear multiples on fast hands.
- **Moving holds**: breathing and blinking by default; nobody is ever frozen.
- **Acting helpers** that put anticipation and overshoot into every move.
- **One palette for the whole series** (ink is deep navy, not black; warm
  characters; cooler, lower-saturation rooms; one accent), a shadow tone and a
  ground shadow on everything, paper grain over the top.
- **Designed characters**: round, big-headed, big-eyed, with a silhouette.
- **A place**: a wall, a floor, a window with light, a cast shadow.
