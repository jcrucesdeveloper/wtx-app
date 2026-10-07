// D01 — "Sneezing the day after abs". Frame 0 is a face filling the screen,
// mid "ah—" (research 12: the first frame is already wrong, big, loud). The
// sneeze folds him in half at 1.0 s; the second one, at the peak, puts him
// through the wall, and the reel ends on a third "ah—" so it loops.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Estornudar al día siguiente de abdominales:', cap2: '…y viene otro.', ah: 'a… a…', ay: '¡¡AY!!', ow: 'ay.' },
  en: { cap: 'Sneezing the day after abs:', cap2: '…and here comes another.', ah: 'ah… ah…', ay: 'OW!!', ow: 'ow.' },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.4,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#ffd84d' })
      T.caption(ctx, t.cap, { size: 52 })
      T.caption(ctx, t.cap2, { size: 54, y: 470, at: 3.0, sound: 'bonk' })
      const r = rng(5)

      // the wall he is about to meet
      T.box(ctx, scene, { x: 900, y: 520, w: 200, h: 890, fill: '#e98f5a', r: 0 })
      for (let i = 0; i < 9; i++) node(ctx, '', scene, { position: 'absolute', left: '900px', top: 600 + i * 96 + 'px', width: '200px', height: '7px', background: T.INK, opacity: 0.5 })
      T.wallHole(ctx, scene, { x: 990, y: 1010, scale: 1.25, at: 4.42 })
      const egg = T.egg(ctx, scene, { x: 120, y: 1338 })
      egg.look(1, -0.6, 0)

      const bro = T.person(ctx, scene, { x: 500, y: FLOOR, scale: 2.0, hair: 'band' })
      const HUG = { arms: [26, -128] }
      T.poseNow(bro, HUG)

      const spit = (at, n, dir = 1) => {
        for (let i = 0; i < n; i++) {
          const s = 16 + r() * 26
          const p = node(ctx, '', scene, { position: 'absolute', left: 500 + 'px', top: 800 + 'px', width: s + 'px', height: s + 'px', borderRadius: '50%', background: '#fff', border: `5px solid ${T.INK}`, boxSizing: 'border-box', opacity: 0, zIndex: 20 })
          tl.set(p, { opacity: 1 }, at)
          tl.to(p, { x: -dir * (120 + r() * 420), y: -160 + r() * 380, duration: 0.35, ease: 'power2.out' }, at)
          tl.to(p, { opacity: 0, duration: 0.15 }, at + 0.25)
        }
      }

      // 0.0 — a face, far too close, about to go
      T.closeup(scene, { x: 500, y: 760, scale: 2.3 })
      T.face(ctx, bro, 'shock', 0, { brow: -20 })
      T.cry(ctx, bro, 0, 1.0)
      tl.to(bro.neck, { rotation: -22, duration: 0.7, ease: 'power1.in' }, 0)
      T.tremble(ctx, bro.tor, 0, 0.95, 4, 1)
      ctx.sfx(0, 'blab', { dur: 0.7, pitch: 66, seed: 3, gain: 1, rise: 9 })
      ctx.sfx(0, 'riser', { dur: 0.95, gain: 0.5 })
      T.unzoom(ctx, scene, 0.72, 0.12)

      // 1.0 — the sneeze. And the abs.
      tl.to(bro.neck, { rotation: 40, duration: 0.06 }, 1.0)
      tl.to(bro.torso, { scaleY: 0.45, scaleX: 1.25, duration: 0.07, ease: 'power4.in' }, 1.0)
      T.face(ctx, bro, 'panic', 1.0)
      ctx.sfx(1.0, 'sneeze', { gain: 1 })
      spit(1.0, 10)
      tl.fromTo(scene, { y: 24 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, 1.0)
      T.pow(ctx, scene, 1.05, { x: 500, y: 1020, r: 260, n: 10 })
      T.say(ctx, bro, t.ay, 1.2, { x: 80, y: 600, w: 360, size: 96, tail: 0.8, loud: true, dur: 0.5, hold: 0.4 })
      T.tremble(ctx, bro.tor, 1.1, 2.1, 6, 2)
      egg.hop(1.0)
      // 2.2 — he unfolds, carefully
      tl.to(bro.torso, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'power1.inOut' }, 2.2)
      tl.to(bro.neck, { rotation: 0, duration: 0.5 }, 2.2)
      T.face(ctx, bro, 'sad', 2.2)
      T.cry(ctx, bro, 2.2, 3.0)
      for (const s of [2.25, 2.45, 2.65]) ctx.sfx(s, 'squeak', { gain: 0.6, pitch: 78 })

      // 3.0 — the second hook: no. No no no.
      T.face(ctx, bro, 'shock', 3.0, { brow: -20 })
      tl.to(bro.neck, { rotation: -24, duration: 1.0, ease: 'power1.in' }, 3.1)
      T.say(ctx, bro, t.ah, 3.15, { x: 600, y: 610, w: 300, size: 60, tail: 0.25, pitch: 66, dur: 0.6, hold: 0.3 })
      T.tremble(ctx, bro.tor, 3.1, 4.2, 5, 4)
      ctx.sfx(3.2, 'riser', { dur: 1.0, gain: 0.6 })
      T.sweat(ctx, bro, 3.5, 5, 3)
      egg.look(1, -1, 3.2)

      // 4.2 — the peak
      T.face(ctx, bro, 'panic', 4.2)
      tl.to(bro.neck, { rotation: 40, duration: 0.05 }, 4.2)
      ctx.sfx(4.2, 'sneeze', { gain: 1.1, pitch: 74 })
      ctx.sfx(4.22, 'rocket', { gain: 0.9, dur: 0.25 })
      spit(4.2, 14, -1)
      tl.to(bro.root, { x: 620, rotation: 30, duration: 0.2, ease: 'power2.in' }, 4.22)
      tl.set(bro.root, { opacity: 0 }, 4.42)
      ctx.sfx(4.42, 'boom', { gain: 1 })
      ctx.sfx(4.44, 'crack', { gain: 1 })
      tl.fromTo(scene, { x: 30 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.25)', immediateRender: false }, 4.42)
      egg.hop(4.42)
      egg.look(1, 0, 4.5)
      // 5.1 — from inside the wall
      T.say(ctx, null, t.ow, 5.1, { x: 640, y: 720, w: 220, size: 60, tail: 0.85, pitch: 60, dur: 0.25, hold: 0.45 })
      // 5.8 — and the loop: here comes the next one
      T.say(ctx, null, t.ah, 5.8, { x: 560, y: 700, w: 300, size: 60, tail: 0.9, pitch: 66, dur: 0.6, hold: 0.2 })

      T.sign(ctx)
    },
  })
}
