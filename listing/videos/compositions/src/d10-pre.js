// D10 — "5 minutes after the pre-workout". Frame 0: a man vibrating in three
// colours, pupils like pinheads. He talks in one word, lifts the rack, crosses
// the room four times. The second hook is a hard cut to black: "3:00 a.m.".
// The peak is the eyes, still vibrating, in the dark.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: '5 minutos después del pre-entreno:', go: 'VAMOSVAMOSVAMOS', three: '3:00 a. m.', go2: '…vamos.' },
  en: { cap: '5 minutes after the pre-workout:', go: 'LETSGOLETSGOLETSGO', three: '3:00 a.m.', go2: "…let's go." },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.0,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#c6ff4d' })
      const cap = T.caption(ctx, t.cap, { size: 54 })
      tl.set(cap, { opacity: 0 }, 3.6)
      T.speedLines(ctx, scene, 0, 3.6, { dir: -1, n: 10, y0: 560, y1: 1300 })

      // a rack to pick up
      const rack = node(ctx, '', scene, { position: 'absolute', left: '760px', top: '0', width: '0', height: '0' })
      for (const x of [-110, 90]) T.box(ctx, rack, { x, y: 760, w: 26, h: 640, fill: '#9aa3ad', r: 6 })
      T.box(ctx, rack, { x: -110, y: 750, w: 226, h: 26, fill: '#9aa3ad', r: 6 })
      const egg = T.egg(ctx, scene, { x: 120, y: 1338 })
      egg.look(1, -0.5, 0)

      const bro = T.person(ctx, scene, { x: 400, y: FLOOR, scale: 2.0, hair: 'band' })
      T.box(ctx, bro.aL.hand, { x: -24, y: -70, w: 48, h: 84, fill: '#22262d', r: 10, border: 6 })
      T.poseNow(bro, { arms: [26, 30] })

      // 0.0 — already buzzing
      T.punchIn(ctx, scene, { from: 1.25 })
      T.face(ctx, bro, 'shock', 0, { mouth: 'grit', ps: 0.3, brow: 14 })
      T.ghosts(ctx, bro.root, 0, 3.6, 34)
      T.tremble(ctx, bro.tor, 0, 3.6, 9, 1)
      T.tremble(ctx, bro.head, 0, 3.6, 5, 2)
      ctx.sfx(0, 'buzz', { dur: 3.6, pitch: 46, gain: 0.7 })
      ctx.sfx(0, 'boom', { gain: 0.7 })
      T.sweat(ctx, bro, 0.1, 6, 1)
      // 0.6 — one word
      T.say(ctx, bro, t.go, 0.6, { x: 60, y: 470, w: 960, size: 64, tail: 0.3, loud: true, dur: 0.55, hold: 0.25, pitch: 62 })
      ctx.sfx(0.6, 'blab', { dur: 0.55, pitch: 78, seed: 4, gain: 1, rise: 8 })
      // 1.5 — the rack. One hand.
      T.pose(ctx, bro, { aR: [-165, -8] }, 1.5, 0.08, 'back.out(3)')
      tl.to(rack, { x: -230, y: -480, rotation: -20, duration: 0.1, ease: 'power4.out' }, 1.52)
      ctx.sfx(1.5, 'zip', { gain: 1 })
      ctx.sfx(1.6, 'ding', { gain: 1, midi: 96 })
      egg.look(1, -1, 1.6)
      T.face(ctx, bro, 'happy', 1.6, { ps: 0.3 })
      // 2.2 — he puts it down somewhere and crosses the room. Four times.
      tl.to(rack, { x: 600, y: -900, rotation: 200, duration: 0.25, ease: 'power2.in' }, 2.1)
      ctx.sfx(2.1, 'rocket', { gain: 0.8, dur: 0.25 })
      ctx.sfx(2.5, 'crack', { gain: 0.9 })
      T.pose(ctx, bro, { arms: [26, 30] }, 2.15, 0.08)
      ;[[900, 2.3], [150, 2.55], [860, 2.8], [400, 3.05]].forEach(([x, at]) => {
        tl.to(bro.root, { x: x - 400, duration: 0.18, ease: 'power2.inOut' }, at)
        ctx.sfx(at, 'zip', { gain: 0.9 })
      })
      T.walk(ctx, bro, 2.3, 3.25, { step: 0.05, swing: 30 })
      egg.hop(2.3)
      egg.hop(2.8)

      // 3.6 — the second hook: lights out
      const night = node(ctx, 'layer', ctx.stage, { background: '#0a0d1c', zIndex: 30 })
      T.during(ctx, night, 3.6)
      const c2 = T.caption(ctx, t.three, { size: 76, at: 3.6, sound: 'boom' })
      c2.style.zIndex = 60
      const eyes = node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 40 })
      T.during(ctx, eyes, 3.6)
      const lids = [360, 600].map((x) => {
        const e = node(ctx, '', eyes, { position: 'absolute', left: x + 'px', top: '820px', width: '130px', height: '150px', borderRadius: '50%', background: '#fff', overflow: 'hidden' })
        node(ctx, '', e, { position: 'absolute', left: '56px', top: '66px', width: '18px', height: '18px', borderRadius: '50%', background: '#0a0d1c' })
        return node(ctx, '', e, { position: 'absolute', left: '0', right: '0', top: '-150px', height: '150px', background: '#0a0d1c' })
      })
      T.tremble(ctx, eyes, 3.6, 6.0, 7, 5)
      T.ghosts(ctx, eyes, 3.6, undefined, 22)
      ctx.sfx(3.6, 'buzz', { dur: 2.4, pitch: 46, gain: 0.3 })
      ctx.sfx(3.9, 'crickets', { gain: 1.6, dur: 1.4 })
      // 4.9 — one slow blink
      for (const l of lids) {
        tl.to(l, { y: 150, duration: 0.2, ease: 'power1.in' }, 4.8)
        tl.to(l, { y: 0, duration: 0.2, ease: 'power1.out' }, 5.1)
      }
      // 5.3 — the peak
      const b = node(ctx, 't-bubble', ctx.stage, { left: '340px', top: '1090px', width: '400px', fontSize: '64px', zIndex: 50 }, t.go2)
      b.classList.add('t-bubble--notail')
      T.during(ctx, b, 5.35)
      ctx.sfx(5.35, 'blab', { dur: 0.3, pitch: 56, seed: 9, gain: 0.7 })

      T.sign(ctx, { x: 900, y: 1470 })
    },
  })
}
