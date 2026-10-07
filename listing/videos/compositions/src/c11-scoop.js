// C11 — "The protein scoop". Everyone knows it is at the bottom of the tub.
// Recognition, then absurd escalation: an arm, a head, the whole man, legs
// kicking out of the top; he comes back white as a ghost, triumphant, and
// sneezes the lot away, which resets the scene (a loop).

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El scoop de la proteína:', label: 'PROTEÍNA', got: '¡LO TENGO!', ah: 'a… a…' },
  en: { cap: 'The protein scoop:', label: 'PROTEIN', got: 'GOT IT!', ah: 'ah… ah…' },
}
const RIM = 800

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 7.4,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)
      const r = rng(17)

      // behind the tub: him
      // (clipped at the table top, so nothing of him shows below the furniture)
      const clip = node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1184px', overflow: 'hidden' })
      const { piv, ch: bro } = T.tumbler(ctx, clip, { x: 540, y: 1400, scale: 1.9, hair: 'band' })
      // the powdered version, for later
      const white = T.person(ctx, clip, { x: 540, y: 1230, scale: 1.9, shirt: '#ffffff', skin: '#ffffff', hair: 'band' })
      tl.set(white.root, { opacity: 0 }, 0)
      const scoop = node(ctx, '', white.aR.hand, { position: 'absolute', left: '-16px', top: '-46px', width: '32px', height: '30px', background: '#2f6df6', border: `5px solid ${T.INK}`, borderRadius: '4px 4px 12px 12px', boxSizing: 'border-box' })
      node(ctx, '', scoop, { position: 'absolute', left: '8px', top: '24px', width: '8px', height: '26px', background: '#2f6df6', border: `4px solid ${T.INK}`, boxSizing: 'border-box' })

      // table and tub, in front
      T.box(ctx, scene, { x: 180, y: 1180, w: 720, h: 230, fill: '#c08a5a', r: 14 })
      const tub = T.box(ctx, scene, { x: 350, y: RIM, w: 380, h: 390, fill: '#22262d', r: 26 })
      node(ctx, '', tub, { position: 'absolute', left: '-8px', right: '-8px', top: '-8px', height: '34px', background: '#3b4350', border: `8px solid ${T.INK}`, borderRadius: '18px', boxSizing: 'border-box' })
      const lab = T.box(ctx, tub, { x: 36, y: 110, w: 292, h: 190, fill: '#fff', r: 14 })
      node(ctx, 't-anton', lab, { left: '0', width: '276px', top: '18px', textAlign: 'center', fontSize: '60px', color: '#e0263a' }, t.label)
      node(ctx, 't-anton', lab, { left: '0', width: '276px', top: '92px', textAlign: 'center', fontSize: '70px', color: T.INK }, '2 KG')
      const egg = T.egg(ctx, scene, { x: 820, y: 1120 })
      egg.look(-1, -0.6, 0)

      const puff = (at, n = 4, big = 1) => {
        for (let i = 0; i < n; i++) {
          const s = (40 + r() * 50) * big
          const p = node(ctx, '', scene, { position: 'absolute', left: 430 + r() * 220 - s / 2 + 'px', top: RIM - 40 + 'px', width: s + 'px', height: s + 'px', borderRadius: '50%', background: '#fff', border: `6px solid ${T.INK}`, boxSizing: 'border-box', opacity: 0 })
          const t0 = at + i * 0.04
          tl.set(p, { opacity: 1 }, t0)
          tl.to(p, { y: -120 - r() * 160 * big, x: (r() - 0.5) * 260, scale: 1.5, duration: 0.5, ease: 'power2.out' }, t0)
          tl.to(p, { opacity: 0, duration: 0.2 }, t0 + 0.35)
        }
        ctx.sfx(at, 'paper', { gain: 0.9, dur: 0.2 })
      }

      // 0.0 — he peers in, and in goes the arm
      T.face(ctx, bro, 'down', 0)
      T.poseNow(bro, { aR: [-170, -10] })
      T.pose(ctx, bro, { aR: [-12, -4] }, 0.15, 0.14, 'power3.in')
      puff(0.29, 4)
      // 0.6 — digging
      T.face(ctx, bro, 'focus', 0.6)
      for (const [i, s] of [0.6, 0.9, 1.2].entries()) {
        tl.to(piv, { y: 36, duration: 0.12, ease: 'power2.in' }, s)
        tl.to(piv, { y: 0, duration: 0.14, ease: 'power2.out' }, s + 0.13)
        puff(s + 0.1, 3)
        void i
      }
      // 1.5 — deeper
      tl.to(piv, { y: 150, duration: 0.3, ease: 'power2.in' }, 1.5)
      puff(1.75, 5)
      ctx.sfx(1.8, 'blab', { dur: 0.5, pitch: 52, seed: 6, gain: 0.5 })
      puff(2.1, 4)
      // 2.4 — nothing. The look.
      tl.to(piv, { y: 0, duration: 0.14, ease: 'back.out(2)' }, 2.4)
      T.face(ctx, bro, 'blank', 2.4)
      ctx.sfx(2.5, 'crickets', { gain: 1.6, dur: 0.6 })
      egg.look(-1, -1, 2.4)
      // 3.0 — fine. All the way.
      T.face(ctx, bro, 'angry', 3.0)
      tl.to(piv, { y: -360, duration: 0.2, ease: 'power2.out' }, 3.0)
      tl.to(piv, { rotation: 180, duration: 0.22, ease: 'none' }, 3.08)
      tl.to(piv, { y: -60, duration: 0.16, ease: 'power3.in' }, 3.22)
      ctx.sfx(3.0, 'jump', { gain: 0.7 })
      ctx.sfx(3.38, 'boom', { gain: 0.9 })
      puff(3.38, 8, 1.5)
      egg.hop(3.38)
      T.walk(ctx, bro, 3.45, 4.75, { step: 0.11, swing: 34 })
      T.tremble(ctx, tub, 3.4, 4.8, 7, 3)
      for (const s of [3.6, 3.95, 4.3, 4.6]) puff(s, 3)
      ctx.sfx(3.6, 'blab', { dur: 0.9, pitch: 50, seed: 8, gain: 0.5 })
      // 4.8 — gone
      tl.to(piv, { y: 330, duration: 0.2, ease: 'power2.in' }, 4.8)
      ctx.sfx(4.98, 'thud', { gain: 0.8 })
      ctx.sfx(5.05, 'crickets', { gain: 1.5, dur: 0.4 })
      // 5.5 — triumph
      tl.set(white.root, { opacity: 1 }, 5.5)
      tl.fromTo(white.root, { y: 420 }, { y: 0, duration: 0.2, ease: 'back.out(2)', immediateRender: false }, 5.5)
      T.poseNow(white, { aR: [-165, -8] })
      T.face(ctx, white, 'happy', 0)
      puff(5.5, 8, 1.4)
      ctx.sfx(5.55, 'tada', { gain: 1 })
      T.say(ctx, white, t.got, 5.6, { x: 40, y: 420, w: 400, size: 70, tail: 0.8, loud: true, dur: 0.45, hold: 0.35 })
      // 6.4 — ah… ah…
      T.face(ctx, white, 'shock', 6.4)
      tl.to(white.neck, { rotation: -14, duration: 0.4, ease: 'power1.in' }, 6.4)
      T.say(ctx, white, t.ah, 6.42, { x: 690, y: 470, w: 300, size: 54, tail: 0.25, pitch: 66, dur: 0.35, hold: 0.1 })
      // 6.9 — the sneeze takes everything with it
      const cloud = node(ctx, '', ctx.stage, { position: 'absolute', left: '240px', top: '400px', width: '600px', height: '600px', borderRadius: '50%', background: '#fff', zIndex: 80, opacity: 0 })
      tl.to(white.neck, { rotation: 22, duration: 0.07 }, 6.9)
      tl.set(cloud, { opacity: 1 }, 6.9)
      tl.fromTo(cloud, { scale: 0.1 }, { scale: 5, duration: 0.3, ease: 'power2.out', immediateRender: false }, 6.9)
      ctx.sfx(6.9, 'boom', { gain: 1 })
      ctx.sfx(6.9, 'scream', { dur: 0.3, pitch: 70, gain: 0.8 })

      T.sign(ctx)
    },
  })
}
