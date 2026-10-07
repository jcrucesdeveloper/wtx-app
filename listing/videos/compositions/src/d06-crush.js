// D06 — "When your gym crush walks in". Frame 0: a bar bent under fourteen
// plates, a purple face, and one eye on the door. She does not look up from
// her phone. The second hook is "…and she talks to you"; the peak is what
// she actually wants. Then gravity.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Cuando entra tu crush al gym:', cap2: '…y te habla.', light: '¡¡LIGERITO!!', hey: 'oye…', pass: '¿me pasas esa?' },
  en: { cap: 'When your gym crush walks in:', cap2: '…and she talks to you.', light: 'LIGHT WEIGHT!!', hey: 'hey…', pass: 'can you pass me that?' },
}
const FLOOR = 1400
const COLS = ['#e0263a', '#2f6df6', '#f7c52b', '#2fb36d', '#e0263a', '#2f6df6', '#f7c52b']

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
      const scene = T.stage(ctx, { bg: '#ff8a7a' })
      T.caption(ctx, t.cap)
      T.caption(ctx, t.cap2, { y: 400, at: 2.9, sound: 'bonk' })
      const r = rng(41)
      const egg = T.egg(ctx, scene, { x: 100, y: 1338 })
      egg.look(1, -0.5, 0)

      // the tiny pink dumbbell she is actually after
      const pink = node(ctx, '', scene, { position: 'absolute', left: '640px', top: '1368px', width: '0', height: '0' })
      T.dumbbell(ctx, pink, { w: 70, h: 40, color: '#ff8ac0' })

      const bro = T.person(ctx, scene, { x: 380, y: FLOOR, scale: 1.7, hair: 'band' })
      const UPP = { arms: [166, 6] }
      const yTop = T.hands(ctx, bro, UPP).L.y
      T.poseNow(bro, UPP)
      // a bar that has given up being straight
      const bar = node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', width: '0', height: '0' })
      gsap.set(bar, { x: 380, y: yTop })
      for (const s of [-1, 1]) {
        const half = node(ctx, '', bar, { position: 'absolute', left: '0', top: '0', width: '0', height: '0' })
        gsap.set(half, { rotation: s * 12 })
        node(ctx, '', half, { position: 'absolute', left: (s < 0 ? -360 : 0) + 'px', top: '-8px', width: '360px', height: '16px', background: '#9aa3ad', border: `6px solid ${T.INK}`, borderRadius: '8px', boxSizing: 'border-box' })
        COLS.forEach((c, i) => {
          const h = 230 - i * 14
          node(ctx, '', half, { position: 'absolute', left: (s < 0 ? -130 - (i + 1) * 30 : 130 + i * 30) + 'px', top: -h / 2 + 'px', width: '30px', height: h + 'px', background: c, border: `7px solid ${T.INK}`, borderRadius: '9px', boxSizing: 'border-box' })
        })
      }
      const hearts = []
      for (let i = 0; i < 7; i++) {
        const h = T.ink(ctx, scene, '♥', { x: 300 + r() * 160, y: 760, size: 50 + r() * 40, color: '#fff', font: 't-inter' })
        const at = i * 0.42
        tl.set(h, { opacity: 0 }, 0)
        tl.set(h, { opacity: 1 }, at)
        tl.to(h, { y: -260 - r() * 120, x: (r() - 0.5) * 160, opacity: 0, duration: 1.0, ease: 'power1.out' }, at)
        hearts.push(h)
      }

      // her: headphones, phone, not looking
      const she = T.person(ctx, scene, { x: 1300, y: FLOOR, scale: 1.55, shirt: '#b79cf2', hair: 'flat' })
      node(ctx, '', she.head, { position: 'absolute', left: '116px', top: '20px', width: '44px', height: '170px', background: T.INK, borderRadius: '0 22px 22px 22px' })
      node(ctx, '', she.head, { position: 'absolute', left: '-10px', top: '-12px', width: '160px', height: '90px', border: `10px solid #2f6df6`, borderBottom: '0', borderRadius: '80px 80px 0 0', boxSizing: 'border-box' })
      T.poseNow(she, { aL: [30, -140] })
      T.box(ctx, she.aL.hand, { x: -18, y: -52, w: 36, h: 58, fill: '#22262d', r: 7, border: 5 })
      T.face(ctx, she, 'down', 0, { mouth: 'smile' })

      // 0.0 — maximum effort, one eye on the door
      T.punchIn(ctx, scene, { from: 1.22 })
      T.face(ctx, bro, 'strain', 0, { pupil: [0.9, 0], lid: 0.2 })
      T.tremble(ctx, bro.tor, 0, 2.9, 4, 1)
      T.tremble(ctx, bar, 0, 2.9, 5, 2, { x: 380, y: yTop })
      ctx.sfx(0, 'scream', { dur: 0.7, pitch: 48, gain: 1 })
      ctx.sfx(0, 'plate', { gain: 0.8 })
      T.sweat(ctx, bro, 0.1, 5, 1)
      T.sweat(ctx, bro, 1.2, 5, 2)
      T.sweat(ctx, bro, 2.2, 5, 3)
      // she walks in
      T.walk(ctx, she, 0.2, 1.8, { step: 0.2, swing: 12, sound: 'tick', gain: 0.4 })
      T.moveX(ctx, she, 800, 0.2, 1.6, 'none')
      // 0.9 — for her benefit
      T.say(ctx, bro, t.light, 0.9, { x: 40, y: 480, w: 520, size: 70, tail: 0.6, loud: true, dur: 0.55, hold: 0.5 })
      egg.look(1, 0, 1.0)
      // 2.0 — she has not noticed. Eyebrows.
      for (const s of [2.0, 2.2, 2.4]) for (const e of bro.eyes) {
        tl.set(e.brow, { y: -14 }, s)
        tl.set(e.brow, { y: 6 }, s + 0.1)
        ctx.sfx(s, 'squeak', { gain: 0.5, pitch: 88 })
      }

      // 2.9 — the second hook
      T.face(ctx, she, 'neutral', 2.9, { pupil: [-0.9, -0.2] })
      T.say(ctx, she, t.hey, 3.0, { x: 620, y: 560, w: 260, size: 62, tail: 0.7, pitch: 76, dur: 0.3, hold: 0.5 })
      T.face(ctx, bro, 'wow', 3.05, { pupil: [0.9, 0] })
      ctx.sfx(3.05, 'choir', { gain: 1.2, dur: 0.9, root: 64 })
      for (let i = 0; i < 6; i++) {
        const h = T.ink(ctx, scene, '♥', { x: 330 + r() * 120, y: 700, size: 70, color: '#fff', font: 't-inter' })
        tl.set(h, { opacity: 0 }, 0)
        tl.set(h, { opacity: 1 }, 3.1 + i * 0.05)
        tl.to(h, { y: -200 - r() * 200, x: (r() - 0.5) * 400, opacity: 0, duration: 0.7 }, 3.1 + i * 0.05)
      }
      // 4.0 — the peak
      T.pose(ctx, she, { aR: [-40, -30] }, 4.0, 0.1, 'back.out(3)')
      T.say(ctx, she, t.pass, 4.0, { x: 540, y: 520, w: 480, size: 58, tail: 0.6, pitch: 76, dur: 0.6, hold: 0.8 })
      ctx.sfx(4.0, 'scratch', { gain: 1 })
      for (let k = 0; k < 6; k++) tl.to(pink, { y: k % 2 ? 0 : -16, duration: 0.12 }, 4.1 + k * 0.12)
      T.face(ctx, bro, 'blank', 4.25, { pupil: [0.6, 0.8] })
      ctx.sfx(4.6, 'crickets', { gain: 1.6, dur: 0.6 })
      // 5.3 — and gravity
      tl.to(bar, { y: FLOOR - 110, duration: 0.14, ease: 'power3.in' }, 5.3)
      tl.to(bro.root, { scaleY: 0.5, scaleX: 2.3, duration: 0.07, ease: 'power4.in' }, 5.4)
      T.face(ctx, bro, 'dead', 5.42)
      ctx.sfx(5.44, 'boom', { gain: 0.9 })
      ctx.sfx(5.44, 'clank', { gain: 0.9 })
      tl.fromTo(scene, { y: 26 }, { y: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', immediateRender: false }, 5.44)
      egg.hop(5.44)
      T.face(ctx, she, 'shock', 5.5)

      T.sign(ctx)
    },
  })
}
