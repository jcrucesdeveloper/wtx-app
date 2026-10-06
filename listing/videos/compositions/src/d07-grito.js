// D07 — "The one who screams every rep". Frame 0: a screaming mouth that fills
// the screen. At 1.0 s the camera snaps out: it is a 1 kg dumbbell. Each rep
// is louder (the windows, the neighbour's hair, the plate); the second hook
// is the pause; the peak is "just warming up" and the 2 kg he reaches for.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El que grita en cada rep:', cap2: '(1 kg)', warm: 'calentando.', a: '¡¡AAAAH!!' },
  en: { cap: 'The one who screams every rep:', cap2: '(1 kg)', warm: 'just warming up.', a: 'AAAAH!!' },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.2,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#b79cf2' })
      T.caption(ctx, t.cap)
      T.caption(ctx, t.cap2, { y: 400, at: 1.0, sound: 'bonk', size: 64 })
      const r = rng(8)

      // a window to break, a neighbour to annoy
      const win = T.box(ctx, scene, { x: 70, y: 560, w: 260, h: 300, fill: '#dff1ff', r: 10 })
      node(ctx, '', win, { position: 'absolute', left: '118px', top: '0', width: '8px', height: '284px', background: T.INK })
      const cracks = node(ctx, '', win, { position: 'absolute', left: '0', top: '0', width: '244px', height: '284px' }, `<svg viewBox="0 0 244 284" width="244" height="284" fill="none" stroke="${T.INK}" stroke-width="5"><path d="M120 140 L30 40 M120 140 L220 60 M120 140 L200 250 M120 140 L40 240 M120 140 L122 10 M70 90 L40 120 M170 100 L200 150"/></svg>`)
      T.during(ctx, cracks, 2.45)
      const other = T.person(ctx, scene, { x: 860, y: FLOOR, scale: 1.35, shirt: '#2fb36d', hair: 'flat' })
      T.face(ctx, other, 'blank', 0, { pupil: [-0.9, 0] })
      const egg = T.egg(ctx, scene, { x: 660, y: 1338 })
      egg.look(-1, -0.4, 0)

      const bro = T.person(ctx, scene, { x: 420, y: FLOOR, scale: 1.9, shirt: '#ff8a7a', hair: 'cap' })
      const db = T.dumbbell(ctx, bro.aR.hand, { w: 50, h: 30, color: '#ff8ac0' })
      void db
      const DOWN = { aR: [-10, -12] }
      const UPP = { aR: [-18, -150] }

      const blast = (at, power) => {
        for (let i = 0; i < 4 + power * 2; i++) {
          const w = 60 + r() * 120
          const a = node(ctx, '', scene, { position: 'absolute', left: '420px', top: '790px', width: w + 'px', height: '12px', background: '#fff', borderRadius: '6px', opacity: 0, transformOrigin: '0 50%', zIndex: 4 })
          const ang = (i / (4 + power * 2)) * 360
          gsap.set(a, { rotation: ang })
          tl.set(a, { opacity: 1, x: Math.cos((ang * Math.PI) / 180) * 150, y: Math.sin((ang * Math.PI) / 180) * 150 }, at)
          tl.to(a, { x: Math.cos((ang * Math.PI) / 180) * (330 + power * 90), y: Math.sin((ang * Math.PI) / 180) * (330 + power * 90), opacity: 0, duration: 0.35, ease: 'power2.out' }, at)
        }
        tl.fromTo(scene, { x: 10 + power * 8 }, { x: 0, duration: 0.3, ease: 'elastic.out(1,0.3)', immediateRender: false }, at)
      }

      // 0.0 — a mouth. Just a mouth.
      T.closeup(scene, { x: 420, y: 830, scale: 3.4 })
      T.poseNow(bro, UPP)
      T.face(ctx, bro, 'panic', 0, { brow: 26, by: 8 })
      T.tremble(ctx, bro.head, 0, 0.95, 5, 1)
      ctx.sfx(0, 'scream', { dur: 0.95, pitch: 54, gain: 1 })
      ctx.sfx(0, 'boom', { gain: 0.6 })
      T.unzoom(ctx, scene, 0.95, 0.12)
      // 1.0 — the reveal
      T.pose(ctx, bro, DOWN, 1.0, 0.12)
      T.face(ctx, bro, 'focus', 1.0)
      ctx.sfx(1.05, 'tick', { gain: 1 })
      egg.look(-1, 0.4, 1.05)

      // reps 2, 3, 4: louder each time
      ;[1.5, 2.4, 3.3].forEach((at, k) => {
        T.pose(ctx, bro, UPP, at, 0.12, 'back.out(2)')
        T.face(ctx, bro, 'panic', at, { brow: 26, by: 8 })
        T.say(ctx, bro, t.a, at, { x: 40 + k * 20, y: 480 - k * 10, w: 440 + k * 60, size: 70 + k * 16, tail: 0.6, loud: true, dur: 0.6, hold: 0.05, pitch: 46 + k * 4 })
        blast(at, k)
        T.pose(ctx, bro, DOWN, at + 0.62, 0.12)
        T.face(ctx, bro, 'focus', at + 0.62)
        // the neighbour takes it
        tl.to(other.root, { x: 20 + k * 30, rotation: 4 + k * 5, duration: 0.1, ease: 'power3.out' }, at)
        tl.to(other.root, { x: 0, rotation: 0, duration: 0.3 }, at + 0.6)
        T.face(ctx, other, k === 2 ? 'dead' : 'angry', at, { pupil: [-0.9, 0] })
      })
      ctx.sfx(2.45, 'crack', { gain: 1 })
      // rep 4: the plate leaves
      tl.to(egg.el, { x: 600, y: -500, rotation: 600, duration: 0.5, ease: 'power2.out' }, 3.3)
      ctx.sfx(3.3, 'rocket', { gain: 0.7, dur: 0.4 })
      ctx.sfx(3.3, 'crack', { gain: 1 })

      // 4.2 — the pause. He puts it down like a feather.
      T.face(ctx, bro, 'neutral', 4.2)
      ctx.sfx(4.25, 'crickets', { gain: 1.6, dur: 0.6 })
      T.face(ctx, other, 'blank', 4.2, { pupil: [-0.9, 0] })
      // 4.9 — the peak
      T.say(ctx, bro, t.warm, 4.9, { x: 60, y: 520, w: 420, size: 60, tail: 0.6, pitch: 62, dur: 0.5, hold: 0.9 })
      ctx.sfx(5.5, 'ding', { gain: 0.8, midi: 91 })

      T.sign(ctx)
    },
  })
}
