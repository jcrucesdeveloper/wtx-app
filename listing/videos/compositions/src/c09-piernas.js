// C09 — "My legs on rep 8". Surreal, played completely straight: at the
// bottom of the squat the legs hand in their notice, put on a hat, pick up a
// suitcase and walk out. The torso hovers, looks at the camera, and drops.
// (Research 11: absurd logic + the held deadpan beat.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Mis piernas en la rep 8:', quit: 'renuncio.', bye: 'adiós.' },
  en: { cap: 'My legs on rep 8:', quit: 'I quit.', bye: 'bye.' },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.8,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)
      const egg = T.egg(ctx, scene, { x: 150, y: 1338 })
      egg.look(1, -0.3, 0)

      // rep counter
      const chip = T.box(ctx, scene, { x: 740, y: 480, w: 270, h: 110, fill: '#fff', r: 16 })
      ;['6', '7', '8'].forEach((n, i) => {
        const e = node(ctx, 't-anton', chip, { left: '0', width: '254px', top: '8px', textAlign: 'center', fontSize: '76px', color: n === '8' ? '#e0263a' : T.INK }, `REP ${n}`)
        if (i > 0) tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, i)
        if (i < 2) tl.set(e, { opacity: 0 }, i + 1)
        if (i > 0) tl.fromTo(chip, { scale: 1.15 }, { scale: 1, duration: 0.15, ease: 'back.out(3)', immediateRender: false }, i)
      })

      // the legs, as their own person (hidden until they resign)
      const legs = T.person(ctx, scene, { x: 540, y: FLOOR, scale: 1.5 })
      legs.tor.style.opacity = 0
      node(ctx, '', legs.body, { position: 'absolute', left: '-40px', top: '-16px', width: '80px', height: '30px', background: T.INK, borderRadius: '14px' })
      const hat = node(ctx, '', legs.body, { position: 'absolute', left: '-34px', top: '-62px', width: '68px', height: '48px' })
      node(ctx, '', hat, { position: 'absolute', left: '12px', top: '0', width: '44px', height: '36px', background: '#3b4350', border: `6px solid ${T.INK}`, borderRadius: '8px 8px 0 0', boxSizing: 'border-box' })
      node(ctx, '', hat, { position: 'absolute', left: '0', top: '32px', width: '68px', height: '12px', background: '#3b4350', border: `5px solid ${T.INK}`, borderRadius: '6px', boxSizing: 'border-box' })
      const bag = node(ctx, '', legs.body, { position: 'absolute', left: '44px', top: '30px', width: '56px', height: '44px', background: '#8a5a2b', border: `6px solid ${T.INK}`, borderRadius: '8px', boxSizing: 'border-box' })
      node(ctx, '', bag, { position: 'absolute', left: '14px', top: '-18px', width: '16px', height: '14px', border: `5px solid ${T.INK}`, borderBottom: '0', borderRadius: '8px 8px 0 0' })
      tl.set(legs.root, { opacity: 0 }, 0)

      const bro = T.person(ctx, scene, { x: 540, y: FLOOR, scale: 1.5, hair: 'band' })
      const bar = T.barbell(ctx, bro.tor, { w: 440, plates: [[130, '#e0263a'], [104, '#2f6df6']], x: 0, y: -128 })
      bro.tor.insertBefore(bar, bro.neck)
      T.poseNow(bro, { arms: [62, 118] })
      const DOWN = { legs: [78, -68] }
      const UP = { legs: [3, 0] }

      // reps 6 and 7
      for (const [k, f] of [[0, 'focus'], [1, 'strain']]) {
        T.face(ctx, bro, f, k)
        T.pose(ctx, bro, DOWN, k + 0.1, 0.25, 'power2.in')
        T.pose(ctx, bro, UP, k + 0.5, 0.4 + k * 0.08, 'power2.out')
        ctx.sfx(k + 0.35, 'squeak', { gain: 0.7, pitch: 68, down: true })
        ctx.sfx(k, 'tick', { gain: 0.9 })
      }
      T.sweat(ctx, bro, 1.5, 4, 2)
      // rep 8: down… and that is as far as the legs go
      T.face(ctx, bro, 'strain', 2.0)
      ctx.sfx(2.0, 'tick', { gain: 0.9 })
      T.pose(ctx, bro, DOWN, 2.1, 0.3, 'power2.in')
      ctx.sfx(2.4, 'squeak', { gain: 0.8, pitch: 62, down: true })
      T.sweat(ctx, bro, 2.45, 5, 3)
      T.poseNow(legs, DOWN)
      const sq = T.person // (kept for readers: the legs copy starts in the same squat)
      void sq
      // 2.8 — the resignation
      T.face(ctx, bro, 'down', 2.8)
      T.say(ctx, null, t.quit, 2.8, { x: 620, y: 1040, w: 320, size: 56, tail: 0.2, pitch: 88, dur: 0.45, hold: 0.5 })
      // 3.5 — they mean it
      tl.set([bro.lL.th, bro.lR.th], { opacity: 0 }, 3.5)
      tl.set(legs.root, { opacity: 1 }, 3.5)
      T.pose(ctx, legs, UP, 3.5, 0.12, 'back.out(3)')
      ctx.sfx(3.5, 'pop', { gain: 1 })
      ctx.sfx(3.52, 'bonk', { gain: 0.8, pitch: 70 })
      T.face(ctx, bro, 'shock', 3.55)
      T.walk(ctx, legs, 3.75, 5.6, { step: 0.15, swing: 22, sound: 'squeak', gain: 0.5 })
      T.moveX(ctx, legs, 1280, 3.75, 1.85, 'none')
      egg.look(1, 0.2, 3.6)
      // 4.1 — the look to camera, then gravity
      T.face(ctx, bro, 'blank', 4.1)
      T.pose(ctx, bro, { hip: bro.legLen - 2 }, 4.55, 0.14, 'power3.in')
      ctx.sfx(4.69, 'boom', { gain: 0.55 })
      ctx.sfx(4.69, 'clank', { gain: 0.6 })
      T.face(ctx, bro, 'dead', 4.69)
      tl.fromTo(scene, { y: 20 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, 4.69)
      egg.hop(4.69)
      T.say(ctx, null, t.bye, 4.9, { x: 740, y: 1010, w: 260, size: 56, tail: 0.6, pitch: 88, dur: 0.3, hold: 0.5 })
      // 5.7 — and the long deadpan
      T.face(ctx, bro, 'blank', 5.6)
      T.blink(ctx, bro, 6.1)
      ctx.sfx(5.6, 'crickets', { gain: 1.8, dur: 1.1 })

      ctx.music([{ at: 0, bars: 1, part: 'cartoon', gain: 0.28 }])
      T.sign(ctx)
    },
  })
}
