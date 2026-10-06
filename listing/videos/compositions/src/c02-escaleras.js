// C02 — "The day after leg day". Slapstick, played with total seriousness:
// the stairs are a cliff, the dramatic sting, the long deadpan beat, and then
// the only sensible solution. Button: "worth it". (Research 11: benign
// violation + heightening + the held beat.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El día después de pierna:', line: 'valió la pena.' },
  en: { cap: 'The day after leg day:', line: 'worth it.' },
}

const TOP = 900 // the landing
const STEP_W = 150
const STEP_H = 125

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 7.6,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { floor: false })
      T.caption(ctx, t.cap)

      // landing + stairs + floor, as one crude staircase
      T.box(ctx, scene, { x: -20, y: TOP, w: 400, h: 620, fill: '#e9dcc3', r: 0 })
      for (let i = 0; i < 3; i++) T.box(ctx, scene, { x: 372 + i * STEP_W, y: TOP + (i + 1) * STEP_H, w: STEP_W + 8, h: 620, fill: '#e9dcc3', r: 0 })
      node(ctx, '', scene, { position: 'absolute', left: '820px', width: '300px', top: px(TOP + 4 * STEP_H), height: '10px', background: T.INK })
      node(ctx, '', scene, { position: 'absolute', left: '-20px', width: '1120px', top: px(TOP + 4 * STEP_H + 8), height: '600px', background: '#e9dcc3' })

      const egg = T.egg(ctx, scene, { x: 96, y: TOP - 58 })
      egg.look(1, 0.2, 0)

      const { piv, ch: bro, half } = T.tumbler(ctx, scene, { x: 250, y: TOP, scale: 1.1, hair: 'band' })

      // 0.0 — standing at the top on jelly legs
      T.face(ctx, bro, 'worry', 0)
      T.tremble(ctx, bro.body, 0, 0.9, 5, 1)
      for (const s of [0, 0.22, 0.5]) ctx.sfx(s, 'squeak', { gain: 0.8, pitch: 82 })
      ctx.sfx(0.0, 'gulp', { gain: 0.9 })

      // 0.9 — he looks down. It is a cliff.
      T.face(ctx, bro, 'down', 0.9)
      T.zoom(ctx, scene, 1.15, { x: 250, y: TOP - 330, scale: 2.0, dur: 0.14 })
      T.face(ctx, bro, 'panic', 1.15)
      ctx.sfx(1.15, 'dundun', { gain: 1 })
      T.sweat(ctx, bro, 1.2, 4, 1)
      const red = node(ctx, 'layer', ctx.stage, { background: 'radial-gradient(60% 50% at 50% 45%, transparent 30%, rgba(224,38,58,0.55) 100%)', zIndex: 20 })
      T.during(ctx, red, 1.15, 2.2)
      T.unzoom(ctx, scene, 2.2, 0.12)

      // 2.3 — one brave foot…
      T.face(ctx, bro, 'strain', 2.3)
      tl.to(bro.lR.th, { rotation: -42, duration: 0.5, ease: 'power1.out' }, 2.3)
      T.tremble(ctx, bro.body, 2.3, 3.0, 6, 3)
      for (const s of [2.3, 2.45, 2.6, 2.75]) ctx.sfx(s, 'squeak', { gain: 0.7, pitch: 86 })
      tl.to(bro.lR.th, { rotation: -3, duration: 0.1 }, 3.0)
      ctx.sfx(3.0, 'tick', { gain: 0.8 })

      // 3.1 — the beat. No.
      T.face(ctx, bro, 'blank', 3.1)

      // 3.6 — the only sensible solution: lie down and roll
      T.face(ctx, bro, 'sleepy', 3.6)
      const cx = (i) => (i === 4 ? 800 : 297 + i * STEP_W)
      const cy = (i) => TOP + i * STEP_H - half * 0.35
      tl.to(piv, { rotation: 90, x: 120, y: half * 0.65, duration: 0.22, ease: 'power2.in' }, 3.6)
      ctx.sfx(3.82, 'thud', { gain: 0.8 })
      let rot = 90
      for (let i = 1; i <= 4; i++) {
        const t0 = 3.95 + (i - 1) * 0.3
        rot += 180
        tl.to(piv, { x: cx(i) - 250, duration: 0.3, ease: 'none' }, t0)
        tl.to(piv, { y: cy(i) - (TOP - half) - 70, duration: 0.12, ease: 'power2.out' }, t0)
        tl.to(piv, { y: cy(i) - (TOP - half), duration: 0.18, ease: 'power2.in' }, t0 + 0.12)
        tl.to(piv, { rotation: rot, duration: 0.3, ease: 'none' }, t0)
        ctx.sfx(t0 + 0.3, 'bonk', { gain: 1, pitch: 64 - i * 3 })
        T.pow(ctx, scene, t0 + 0.3, { x: cx(i), y: TOP + i * STEP_H - 20, r: 90, n: 6 })
        T.face(ctx, bro, i % 2 ? 'shock' : 'dead', t0)
      }
      egg.look(1, 1, 4.0)
      // 5.15 — at rest
      T.face(ctx, bro, 'dead', 5.15)
      ctx.sfx(5.15, 'boom', { gain: 0.8 })
      tl.fromTo(scene, { y: 18 }, { y: 0, duration: 0.3, ease: 'elastic.out(1,0.3)', immediateRender: false }, 5.15)

      // 5.9 — the button
      T.face(ctx, bro, 'happy', 5.9)
      tl.to(bro.aL.sh, { rotation: 170, duration: 0.14, ease: 'back.out(3)' }, 5.9)
      T.say(ctx, null, t.line, 5.95, { x: 380, y: 1090, w: 440, size: 54, tail: 0.75, pitch: 60, dur: 0.6, hold: 1.2 })
      egg.hop(5.95)

      ctx.music([{ at: 0, bars: 1, part: 'cartoon', gain: 0.35 }])
      T.sign(ctx, { x: 900, y: 1500 })
    },
  })
}

function px(n) {
  return n + 'px'
}
