// C12 — "When you forget your headphones". Recognition and anti-climax: he
// walks in happy, pats his ears, pats his pockets, the realisation lands, the
// gym's own soundtrack hits him, and he simply reverses back out the door.
// The loop sends him in again. (The plate, of course, has headphones.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Cuando olvidas los audífonos:', n: ['¡¡AAAGH!!', 'CLANG', '♪ TUNCH TUNCH ♪', 'JAJAJA SÍ MAMÁ'] },
  en: { cap: 'When you forget your headphones:', n: ['AAAGH!!', 'CLANG', '♪ UNTZ UNTZ ♪', 'HAHA YES MOM'] },
}
const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.6,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap, { size: 54 })

      // the door
      const sign = T.box(ctx, scene, { x: 80, y: 660, w: 200, h: 84, fill: '#ffe14d', r: 12 })
      node(ctx, 't-anton', sign, { left: '0', width: '184px', top: '4px', textAlign: 'center', fontSize: '58px', color: T.INK }, 'GYM')
      const door = T.box(ctx, scene, { x: 60, y: 770, w: 240, h: 634, fill: '#3b2a1c', r: 10 })
      void door

      // the plate has headphones. Naturally.
      const egg = T.egg(ctx, scene, { x: 950, y: 1338, tilt: 0 })
      node(ctx, '', egg.el, { position: 'absolute', left: '-14px', top: '-26px', width: '136px', height: '90px', border: `10px solid ${T.INK}`, borderBottom: '0', borderRadius: '70px 70px 0 0', boxSizing: 'border-box' })
      for (const x of [-26, 108]) node(ctx, '', egg.el, { position: 'absolute', left: x + 'px', top: '40px', width: '30px', height: '46px', background: '#2f6df6', border: `7px solid ${T.INK}`, borderRadius: '10px', boxSizing: 'border-box' })
      for (let k = 0; k < 16; k++) tl.to(egg.el, { y: k % 2 ? 0 : -10, rotation: k % 2 ? -5 : 5, duration: 0.2, ease: 'sine.inOut' }, k * 0.4)
      egg.look(-1, 0, 0)

      const bro = T.person(ctx, scene, { x: 180, y: FLOOR, scale: 1.45, hair: 'band' })
      T.box(ctx, bro.aL.hand, { x: -34, y: 8, w: 68, h: 46, fill: '#2f6df6', r: 12, border: 6 })

      // 0.0 — in he comes
      T.face(ctx, bro, 'happy', 0)
      T.walk(ctx, bro, 0, 0.9, { step: 0.15, swing: 20, sound: 'tick', gain: 0.5 })
      T.moveX(ctx, bro, 520, 0, 0.9, 'none')
      ctx.sfx(0, 'blab', { dur: 0.35, pitch: 64, seed: 2, gain: 0.8, rise: 4 })
      // 1.0 — ears?
      T.face(ctx, bro, 'up', 1.0)
      T.pose(ctx, bro, { aR: [-140, -70] }, 1.0, 0.1, 'back.out(3)')
      for (const s of [1.12, 1.3]) {
        tl.to(bro.aR.el, { rotation: -58, duration: 0.06 }, s)
        tl.to(bro.aR.el, { rotation: -70, duration: 0.06 }, s + 0.07)
        ctx.sfx(s, 'tick', { gain: 1 })
      }
      // 1.6 — pockets?
      T.face(ctx, bro, 'worry', 1.6)
      T.pose(ctx, bro, { aR: [-14, 30] }, 1.6, 0.1)
      for (const s of [1.72, 1.9, 2.05]) {
        tl.to(bro.aR.sh, { rotation: -26, duration: 0.05 }, s)
        tl.to(bro.aR.sh, { rotation: -14, duration: 0.05 }, s + 0.06)
        ctx.sfx(s, 'tick', { gain: 1 })
      }
      // 2.2 — the realisation
      T.face(ctx, bro, 'shock', 2.2)
      T.zoom(ctx, scene, 2.2, { x: 520, y: 900, scale: 2.1, dur: 0.12 })
      ctx.sfx(2.2, 'boom', { gain: 1 })
      T.unzoom(ctx, scene, 2.95, 0.12)

      // 3.0 — the gym, unfiltered
      const noise = (i, x, y, rot, at, w, size, fill) => {
        const b = node(ctx, 't-bubble t-bubble--loud t-bubble--notail', scene, { left: x + 'px', top: y + 'px', width: w + 'px', fontSize: size + 'px', background: fill, zIndex: 30 }, t.n[i])
        gsap.set(b, { rotation: rot })
        tl.set(b, { opacity: 0 }, 0)
        tl.set(b, { opacity: 1 }, at)
        tl.fromTo(b, { scale: 2 }, { scale: 1, duration: 0.12, ease: 'power4.out', immediateRender: false }, at)
        T.tremble(ctx, b, at + 0.12, 5.75, 4, i + 3)
        tl.set(b, { opacity: 0 }, 5.8)
      }
      noise(0, 520, 600, -7, 3.0, 430, 78, '#ffe14d')
      ctx.sfx(3.0, 'scream', { dur: 0.5, pitch: 50, gain: 0.9 })
      noise(1, 650, 880, 6, 3.4, 330, 86, '#ff8a7a')
      ctx.sfx(3.4, 'plate', { gain: 1 })
      noise(2, 110, 560, 4, 3.8, 440, 56, '#7ec8ff')
      for (const s of [3.8, 3.95, 4.1, 4.25]) ctx.sfx(s, 'cowbell', { gain: 0.9 })
      ctx.sfx(3.8, 'hit', { gain: 0.6 })
      noise(3, 540, 1140, -5, 4.2, 470, 54, '#b79cf2')
      ctx.sfx(4.2, 'blab', { dur: 0.7, pitch: 74, seed: 11, gain: 1 })
      T.face(ctx, bro, 'blank', 3.0)
      T.face(ctx, bro, 'sad', 3.8)
      T.face(ctx, bro, 'dead', 4.4)
      T.pose(ctx, bro, { aR: [-10, -4] }, 3.0, 0.1)
      T.tremble(ctx, bro.tor, 3.0, 5.0, 3, 9)
      // 5.1 — no. Reverse.
      T.face(ctx, bro, 'blank', 5.05)
      T.moveX(ctx, bro, 180, 5.1, 0.65, 'power1.in')
      ctx.sfx(5.1, 'slidewhistle', { dur: 0.6, from: 84, to: 60, gain: 0.7 })
      tl.set(bro.root, { opacity: 0 }, 5.78)
      ctx.sfx(5.8, 'clack', { gain: 1 })
      tl.fromTo(sign, { rotation: -8 }, { rotation: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', immediateRender: false }, 5.8)
      egg.look(-1, -0.4, 5.8)
      ctx.sfx(5.9, 'crickets', { gain: 1.6, dur: 0.6 })

      T.sign(ctx)
    },
  })
}
