// C07 — "The 70-year-old lady at the gym". A status reversal: he can't move
// the bar; she asks politely, lifts it over her head with one hand while
// holding her purse, and calls it her warm-up. Wholesome, and built to be
// sent ("la doña"). (Research 11: superiority reversed + a calm button.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'

const TXT = {
  es: { cap: 'La señora de 70 años del gym:', may: '¿me permites, mijo?', warm: 'es mi calentamiento.' },
  en: { cap: 'The 70-year-old lady at my gym:', may: 'may I, dear?', warm: "that's my warm-up." },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 8.8,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap, { size: 54 })
      const egg = T.egg(ctx, scene, { x: 980, y: 1338 })
      egg.look(-1, 0, 0)

      const bro = T.person(ctx, scene, { x: 400, y: FLOOR, scale: 1.45, hair: 'band' })
      const DL = { legs: [44, -38], arms: [5, 0] }
      const yH = T.hands(ctx, bro, DL).L.y
      const ph = Math.max(150, 2 * (FLOOR - yH) - 6)
      const bar = T.barbell(ctx, scene, { w: 640, plates: [[ph, '#e0263a'], [ph * 0.82, '#2f6df6'], [ph * 0.64, '#f7c52b']], x: 400, y: yH })

      const nan = T.person(ctx, scene, { x: 1260, y: FLOOR, scale: 1.2, shirt: '#b79cf2', hair: 'bun', glasses: true, headR: 62, torsoH: 120, leg: [48, 44], arm: [54, 50] })
      T.box(ctx, nan.aL.hand, { x: -30, y: 6, w: 60, h: 50, fill: '#8a5a2b', r: 10, border: 6 })
      const UPP = { aR: [-172, -6] }
      const hUp = T.hands(ctx, nan, UPP).R
      const nanX = 470
      const upX = hUp.x - 1260 + nanX
      const upY = hUp.y

      // 0.0 — it will not move
      T.poseNow(bro, DL)
      T.face(ctx, bro, 'strain', 0)
      T.tremble(ctx, bro.tor, 0, 1.5, 4, 1)
      T.sweat(ctx, bro, 0.05, 4, 1)
      T.sweat(ctx, bro, 0.8, 4, 2)
      ctx.sfx(0, 'blab', { dur: 0.6, pitch: 46, seed: 4, gain: 1 })
      ctx.sfx(0.75, 'scream', { dur: 0.5, pitch: 50, gain: 0.7 })
      tl.to(bar, { y: yH - 8, duration: 0.1 }, 0.75)
      tl.to(bar, { y: yH, duration: 0.08 }, 1.2)
      ctx.sfx(1.28, 'clack', { gain: 0.9 })

      // 1.5 — she arrives
      T.walk(ctx, nan, 1.5, 2.5, { step: 0.2, swing: 12, sound: 'tick', gain: 0.5 })
      T.moveX(ctx, nan, 800, 1.5, 1.0)
      T.face(ctx, bro, 'side', 2.2)
      T.say(ctx, nan, t.may, 2.6, { x: 500, y: 600, w: 500, size: 52, tail: 0.7, pitch: 78, dur: 0.7, hold: 0.6 })

      // 3.4 — he makes room
      T.pose(ctx, bro, T.STAND, 3.4, 0.14)
      T.walk(ctx, bro, 3.5, 4.0, { step: 0.14, swing: 16 })
      T.moveX(ctx, bro, 170, 3.5, 0.5)
      T.walk(ctx, nan, 3.9, 4.5, { step: 0.2, swing: 12, sound: 'tick', gain: 0.5 })
      T.moveX(ctx, nan, nanX, 3.9, 0.6)
      tl.to(bar, { x: upX, duration: 0.01 }, 4.45)

      // 4.6 — one hand
      T.pose(ctx, nan, UPP, 4.6, 0.1, 'back.out(2)')
      tl.to(bar, { y: upY, duration: 0.1, ease: 'power3.out' }, 4.6)
      ctx.sfx(4.6, 'zip', { gain: 1 })
      ctx.sfx(4.7, 'ding', { gain: 1, midi: 96 })
      T.face(ctx, nan, 'happy', 4.6)
      T.face(ctx, bro, 'shock', 4.72)
      ctx.sfx(4.72, 'boom', { gain: 0.8 })
      egg.look(-1, -1, 4.7)
      egg.hop(4.72)
      // a few reps, for form
      for (const s of [5.05, 5.3, 5.55]) {
        T.pose(ctx, nan, { aR: [-150, -50] }, s, 0.09)
        tl.to(bar, { y: upY + 70, duration: 0.09 }, s)
        T.pose(ctx, nan, UPP, s + 0.11, 0.09)
        tl.to(bar, { y: upY, duration: 0.09 }, s + 0.11)
        ctx.sfx(s + 0.11, 'tick', { gain: 1 })
      }
      // down, gently
      T.pose(ctx, nan, { aR: [-10, -4] }, 5.9, 0.14)
      tl.to(bar, { y: yH, duration: 0.14, ease: 'power1.in' }, 5.9)
      ctx.sfx(6.04, 'tick', { gain: 0.8 })
      T.face(ctx, nan, 'neutral', 6.05)

      // 6.2 — the button
      T.say(ctx, nan, t.warm, 6.2, { x: 330, y: 560, w: 560, size: 54, tail: 0.3, pitch: 78, dur: 0.8, hold: 0.9 })
      T.face(ctx, bro, 'dead', 6.9)

      // 7.3 — she leaves; he does too, in a way
      T.walk(ctx, nan, 7.3, 8.7, { step: 0.2, swing: 12, sound: 'tick', gain: 0.5 })
      T.moveX(ctx, nan, 1300, 7.3, 1.4)
      tl.to(bro.root, { rotation: 90, duration: 0.32, ease: 'power2.in' }, 7.7)
      ctx.sfx(8.02, 'thud', { gain: 1 })
      ctx.sfx(8.05, 'powerdown', { gain: 0.8 })

      ctx.music([{ at: 0, bars: 1, part: 'cartoon', gain: 0.25 }])
      T.sign(ctx)
    },
  })
}
