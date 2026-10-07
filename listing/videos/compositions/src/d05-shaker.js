// D05 — "Opening the shaker you forgot for a week". Frame 0: a hazmat suit,
// tongs, stink lines and a dramatic sting. The plant dies at 1.2 s; the second
// hook is "something moved"; the peak is what says "dad?" from inside.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Abrir el shaker que olvidaste una semana:', cap2: '…algo se movió.', dad: '¿papá?', nope: 'mañana lo lavo.' },
  en: { cap: 'Opening the shaker you forgot for a week:', cap2: '…something moved.', dad: 'dad?', nope: "I'll wash it tomorrow." },
}
const FLOOR = 1400
const SLIME = '#7fd04a'

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
      const scene = T.stage(ctx, { bg: '#ffb36b' })
      T.caption(ctx, t.cap, { size: 52 })
      T.caption(ctx, t.cap2, { size: 54, y: 470, at: 3.0, sound: 'bonk' })
      const r = rng(23)

      // table, plant, shaker
      T.box(ctx, scene, { x: 560, y: 1160, w: 480, h: 250, fill: '#c08a5a', r: 14 })
      const plant = node(ctx, '', scene, { position: 'absolute', left: '900px', top: '1160px', width: '0', height: '0' })
      T.box(ctx, plant, { x: -50, y: -90, w: 100, h: 90, fill: '#e98f5a', r: 10 })
      const leaves = node(ctx, '', plant, { position: 'absolute', left: '0', top: '-90px', width: '0', height: '0' })
      const leafEls = [-40, 0, 40].map((a) => {
        const l = node(ctx, '', leaves, { position: 'absolute', left: '-22px', top: '-150px', width: '44px', height: '150px', background: '#3fa35a', border: `7px solid ${T.INK}`, boxSizing: 'border-box', borderRadius: '50% 50% 10px 10px', transformOrigin: '50% 100%' })
        gsap.set(l, { rotation: a })
        return l
      })
      const shaker = node(ctx, '', scene, { position: 'absolute', left: '700px', top: '1160px', width: '0', height: '0' })
      // what lives in it (behind the cup)
      const thing = node(ctx, '', shaker, { position: 'absolute', left: '-60px', top: '-200px', width: '120px', height: '120px' })
      for (const x of [14, 70]) {
        const st = node(ctx, '', thing, { position: 'absolute', left: x + 'px', top: '0', width: '36px', height: '110px' })
        node(ctx, '', st, { position: 'absolute', left: '13px', top: '30px', width: '10px', height: '80px', background: SLIME, border: `4px solid ${T.INK}`, boxSizing: 'border-box' })
        const e = node(ctx, '', st, { position: 'absolute', left: '0', top: '0', width: '36px', height: '40px', borderRadius: '50%', background: '#fff', border: `6px solid ${T.INK}`, boxSizing: 'border-box' })
        node(ctx, '', e, { position: 'absolute', left: '4px', top: '10px', width: '12px', height: '12px', borderRadius: '50%', background: T.INK })
      }
      tl.set(thing, { y: 190, opacity: 0 }, 0)
      tl.set(thing, { opacity: 1 }, 4.2)
      T.box(ctx, shaker, { x: -60, y: -190, w: 120, h: 190, fill: '#4a7a4f', r: 16 })
      node(ctx, '', shaker, { position: 'absolute', left: '-46px', top: '-120px', width: '92px', height: '60px', background: 'rgba(255,255,255,0.25)', borderRadius: '8px' })
      const lid = T.box(ctx, shaker, { x: -66, y: -232, w: 132, h: 50, fill: '#22262d', r: 14 })
      const hand = node(ctx, '', shaker, { position: 'absolute', left: '-78px', top: '-150px', width: '44px', height: '30px', background: SLIME, border: `6px solid ${T.INK}`, boxSizing: 'border-box', borderRadius: '14px', opacity: 0 })
      const stink = T.stink(ctx, scene, { x: 700, y: 920, n: 3 })
      const flies = [0, 1, 2].map((i) => {
        const f = node(ctx, '', scene, { position: 'absolute', left: 640 + i * 60 + 'px', top: 760 + i * 30 + 'px', width: '16px', height: '16px', borderRadius: '50%', background: T.INK })
        for (let k = 0; k < 11; k++) tl.to(f, { x: (r() - 0.5) * 160, y: (r() - 0.5) * 120, duration: 0.2, ease: 'sine.inOut' }, k * 0.2)
        tl.to(f, { y: 1140 - (760 + i * 30), x: (i - 1) * 50, duration: 0.3, ease: 'power2.in' }, 2.2 + i * 0.12)
        ctx.sfx(2.5 + i * 0.12, 'tick', { gain: 1 })
        return f
      })
      void flies
      const egg = T.egg(ctx, scene, { x: 990, y: 1102, r: 54 })
      egg.look(-1, -0.2, 0)

      // him, in protective equipment
      const bro = T.person(ctx, scene, { x: 280, y: FLOOR, scale: 1.9, shirt: '#f7c52b', skin: '#eaf6ff' })
      node(ctx, '', bro.head, { position: 'absolute', left: '-22px', top: '-26px', width: '184px', height: '190px', borderRadius: '70px 70px 50px 50px', border: `24px solid #f7c52b`, boxSizing: 'border-box', outline: `8px solid ${T.INK}` })
      T.poseNow(bro, { aR: [-70, -20], lean: 6 })
      const tongs = node(ctx, '', bro.aR.hand, { position: 'absolute', left: '0', top: '-5px', width: '150px', height: '10px', background: '#9aa3ad', border: `3px solid ${T.INK}`, boxSizing: 'border-box', transformOrigin: '0 50%', transform: 'rotate(70deg)' })
      void tongs

      const cloud = (at, n, big = 1) => {
        for (let i = 0; i < n; i++) {
          const s = (60 + r() * 70) * big
          const c = node(ctx, '', scene, { position: 'absolute', left: 700 - s / 2 + 'px', top: 900 + 'px', width: s + 'px', height: s + 'px', borderRadius: '50%', background: SLIME, border: `7px solid ${T.INK}`, boxSizing: 'border-box', opacity: 0, zIndex: 8 })
          tl.set(c, { opacity: 0.95 }, at + i * 0.03)
          tl.to(c, { x: (r() - 0.5) * 520 * big, y: -80 - r() * 320 * big, scale: 1.8, duration: 0.7, ease: 'power2.out' }, at + i * 0.03)
          tl.to(c, { opacity: 0, duration: 0.25 }, at + 0.5 + i * 0.03)
        }
      }

      // 0.0 — the approach
      T.punchIn(ctx, scene, { from: 1.2 })
      T.face(ctx, bro, 'worry', 0)
      ctx.sfx(0, 'dundun', { gain: 1 })
      ctx.sfx(0, 'buzz', { dur: 2.2, pitch: 64, gain: 0.25 })
      T.tremble(ctx, bro.aR.sh, 0, 1.0, 3, 1)
      T.sweat(ctx, bro, 0.4, 3, 1)
      // 1.0 — the lid
      T.pose(ctx, bro, { aR: [-96, -10] }, 1.0, 0.1, 'back.out(3)')
      tl.to(lid, { y: -260, x: 120, rotation: 200, duration: 0.5, ease: 'power2.out' }, 1.0)
      tl.set(lid, { opacity: 0 }, 1.5)
      ctx.sfx(1.0, 'pop', { gain: 1 })
      ctx.sfx(1.02, 'deflate', { gain: 1, dur: 0.6 })
      cloud(1.02, 8)
      T.face(ctx, bro, 'panic', 1.05)
      // 1.25 — the plant: gone
      leafEls.forEach((l, i) => {
        tl.to(l, { rotation: [-130, 100, 140][i], backgroundColor: '#8a6a3c', duration: 0.3, ease: 'power2.in' }, 1.25)
      })
      ctx.sfx(1.25, 'slidewhistle', { dur: 0.35, from: 84, to: 58, gain: 0.8 })
      tl.to(egg.el, { rotation: 90, y: 20, duration: 0.2, ease: 'power2.in' }, 1.5)
      ctx.sfx(1.7, 'bonk', { gain: 0.8 })
      T.pose(ctx, bro, { aR: [-70, -20] }, 1.6, 0.12)
      T.face(ctx, bro, 'shock', 1.6)

      // 3.0 — the second hook: something moved
      T.tremble(ctx, shaker, 3.0, 3.9, 6, 3)
      for (const s of [3.0, 3.3, 3.6]) ctx.sfx(s, 'thud', { gain: 0.8 })
      T.walk(ctx, bro, 3.1, 3.7, { step: 0.12, swing: 14 })
      T.moveX(ctx, bro, 200, 3.1, 0.6)
      T.face(ctx, bro, 'panic', 3.0)
      for (const s of stink) tl.to(s, { opacity: 0, duration: 0.2 }, 3.9)
      // 3.9 — a hand. Eyes.
      tl.set(hand, { opacity: 1 }, 3.9)
      tl.fromTo(hand, { y: 40 }, { y: 0, duration: 0.12, ease: 'back.out(3)', immediateRender: false }, 3.9)
      ctx.sfx(3.9, 'squeak', { gain: 1, pitch: 70 })
      tl.to(thing, { y: 0, duration: 0.25, ease: 'back.out(2)' }, 4.2)
      ctx.sfx(4.2, 'slidewhistle', { dur: 0.25, from: 70, to: 90, gain: 0.8 })
      // 4.6 — the peak
      T.say(ctx, null, t.dad, 4.6, { x: 560, y: 640, w: 300, size: 76, tail: 0.5, pitch: 92, dur: 0.35, hold: 0.9 })
      T.face(ctx, bro, 'blank', 4.75)
      ctx.sfx(5.0, 'crickets', { gain: 1.6, dur: 0.5 })
      // 5.6 — no
      T.say(ctx, bro, t.nope, 5.55, { x: 60, y: 560, w: 480, size: 56, tail: 0.45, pitch: 58, dur: 0.5, hold: 0.6 })
      tl.to(thing, { y: 190, duration: 0.1 }, 5.6)
      tl.set(thing, { opacity: 0 }, 5.7)
      tl.set(hand, { opacity: 0 }, 5.6)

      T.sign(ctx, { x: 60, y: 1470 })
    },
  })
}
