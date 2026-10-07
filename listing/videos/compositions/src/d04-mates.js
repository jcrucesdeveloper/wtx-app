// D04 — "Me working out what's on the bar". Frame 0: a head in close-up,
// smoking, with sums orbiting it. A calculator says ERROR, a whiteboard does
// not help, and the second hook is the question everyone has asked: wait,
// how heavy is the bar itself? Peak: "lots." The plate, of course, knew.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Yo calculando cuánto hay en la barra:', cap2: '…¿y la barra cuánto pesaba?', eq: ['20+20', '+15', '×2', '+10…', '¿+5?', '=?'], lots: '…mucho.' },
  en: { cap: "Me working out what's on the bar:", cap2: '…wait, how heavy is the bar?', eq: ['20+20', '+15', '×2', '+10…', '+5?', '=?'], lots: '…lots.' },
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
      const scene = T.stage(ctx, { bg: '#9be8c4' })
      T.caption(ctx, t.cap, { size: 52 })
      T.caption(ctx, t.cap2, { size: 52, y: 400, at: 3.3, sound: 'bonk' })
      const r = rng(13)

      const bro = T.person(ctx, scene, { x: 540, y: FLOOR, scale: 1.9, hair: 'band' })
      // the bar: every colour in the gym
      T.barbell(ctx, scene, { w: 900, plates: [[230, '#e0263a'], [230, '#2f6df6'], [190, '#f7c52b'], [150, '#2fb36d'], [110, '#fff'], [80, '#3b4350']], x: 540, y: 1230 })
      for (const x of [300, 780]) T.box(ctx, scene, { x: x - 13, y: 1230, w: 26, h: 170, fill: '#9aa3ad', r: 6 })

      const egg = T.egg(ctx, scene, { x: 960, y: 1338, r: 56 })
      egg.look(-1, -0.5, 0)
      const card = T.box(ctx, scene, { x: 880, y: 1150, w: 160, h: 100, fill: '#fff', r: 12 })
      node(ctx, 't-marker', card, { left: '0', width: '144px', top: '14px', textAlign: 'center', fontSize: '54px', color: '#e0263a' }, '72.5')
      T.during(ctx, card, 5.35)

      // sums in orbit
      const orbit = node(ctx, '', scene, { position: 'absolute', left: '540px', top: '740px', width: '0', height: '0', zIndex: 6 })
      t.eq.forEach((e, i) => {
        const a = (i / t.eq.length) * Math.PI * 2
        const x = Math.cos(a) * 330
        const y = Math.sin(a) * 210
        const el = node(ctx, 't-marker', orbit, { left: x - 90 + 'px', top: y - 40 + 'px', width: '180px', textAlign: 'center', fontSize: '62px', color: i % 2 ? '#e0263a' : T.INK })
        el.textContent = e
        for (let k = 0; k < 12; k++) tl.to(el, { rotation: -(k + 1) * 30, duration: 0.5, ease: 'none' }, k * 0.5)
        for (let k = 0; k < 30; k++) tl.to(el, { scale: k % 2 ? 1.12 : 0.92, duration: 0.2 }, k * 0.2 + i * 0.03)
      })
      for (let k = 0; k < 12; k++) tl.to(orbit, { rotation: (k + 1) * 30, duration: 0.5, ease: 'none' }, k * 0.5)
      // smoke from the ears
      const puff = (at, side) => {
        const s = 40 + r() * 30
        const p = node(ctx, '', scene, { position: 'absolute', left: 540 + side * 140 - s / 2 + 'px', top: '740px', width: s + 'px', height: s + 'px', borderRadius: '50%', background: '#fff', border: `6px solid ${T.INK}`, boxSizing: 'border-box', opacity: 0 })
        tl.set(p, { opacity: 1 }, at)
        tl.to(p, { x: side * (60 + r() * 80), y: -150 - r() * 80, scale: 1.6, duration: 0.6, ease: 'power2.out' }, at)
        tl.to(p, { opacity: 0, duration: 0.2 }, at + 0.4)
      }
      for (let s = 0; s < 3.2; s += 0.22) puff(s, s * 100 % 2 < 1 ? -1 : 1)

      // 0.0 — close on the thinking
      T.closeup(scene, { x: 540, y: 770, scale: 1.8 })
      T.face(ctx, bro, 'up', 0, { brow: 16, mouth: 'wavy' })
      T.poseNow(bro, { aR: [-150, -60] })
      for (let s = 0; s < 0.8; s += 0.1) ctx.sfx(s, 'tick', { gain: 0.8 })
      ctx.sfx(0, 'blab', { dur: 0.7, pitch: 60, seed: 4, gain: 0.9 })
      ctx.sfx(0, 'buzz', { dur: 0.8, pitch: 52, gain: 0.4 })
      T.sweat(ctx, bro, 0.2, 4, 1)
      T.unzoom(ctx, scene, 0.75, 0.12)
      ctx.sfx(0.75, 'pop', { gain: 0.9 })

      // 1.1 — a calculator
      const calc = T.box(ctx, bro.aL.hand, { x: -40, y: -90, w: 80, h: 110, fill: '#3b4350', r: 10, border: 6 })
      const scr = node(ctx, '', calc, { position: 'absolute', left: '6px', top: '8px', width: '56px', height: '30px', background: '#bfe8c9', font: '900 15px Inter', color: '#141414', textAlign: 'center', lineHeight: '30px' }, '0')
      tl.set(calc, { opacity: 0 }, 0)
      tl.set(calc, { opacity: 1 }, 1.1)
      T.pose(ctx, bro, { aL: [40, 110], aR: [-40, -100] }, 1.1, 0.12, 'back.out(3)')
      T.face(ctx, bro, 'focus', 1.1)
      for (let s = 1.25; s < 2.0; s += 0.09) ctx.sfx(s, 'keyclick', { gain: 1 })
      tl.set(scr, { innerHTML: 'ERROR', backgroundColor: '#ff8a7a' }, 2.05)
      ctx.sfx(2.05, 'bonk', { gain: 1, pitch: 50 })
      T.face(ctx, bro, 'blank', 2.05)
      egg.look(-1, 0.3, 2.05)
      // 2.6 — he throws it
      tl.set(calc, { opacity: 0 }, 2.6)
      T.pose(ctx, bro, { aL: [150, 20] }, 2.55, 0.1, 'back.out(3)')
      ctx.sfx(2.6, 'zip', { gain: 0.9 })
      ctx.sfx(2.85, 'crack', { gain: 0.8 })
      T.pose(ctx, bro, { aL: [10, 4], aR: [-10, -4] }, 2.8, 0.12)
      T.face(ctx, bro, 'angry', 2.6)

      // 3.3 — the second hook
      T.face(ctx, bro, 'shock', 3.3)
      tl.set(orbit, { opacity: 0 }, 3.3)
      T.zoom(ctx, scene, 3.3, { x: 540, y: 770, scale: 1.8, dur: 0.12 })
      ctx.sfx(3.3, 'boom', { gain: 1 })
      const q = T.ink(ctx, scene, '?', { x: 700, y: 520, size: 220, color: '#e0263a' })
      T.during(ctx, q, 3.4, 4.3)
      tl.fromTo(q, { scale: 0.3, rotation: -20 }, { scale: 1, rotation: 8, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, 3.4)
      ctx.sfx(3.9, 'crickets', { gain: 1.6, dur: 0.5 })
      T.unzoom(ctx, scene, 4.4, 0.12)

      // 4.5 — the answer
      T.face(ctx, bro, 'blank', 4.5)
      T.say(ctx, bro, t.lots, 4.6, { x: 50, y: 520, w: 330, size: 70, tail: 0.85, pitch: 58, dur: 0.4, hold: 1.2 })
      ctx.sfx(4.6, 'powerdown', { gain: 0.8 })
      // 5.35 — the plate knew all along
      tl.fromTo(card, { scale: 0.2, rotation: -20 }, { scale: 1, rotation: -6, duration: 0.2, ease: 'back.out(3)', immediateRender: false }, 5.35)
      ctx.sfx(5.35, 'ding', { gain: 1, midi: 96 })
      egg.hop(5.35)
      egg.look(0, 0, 5.35)

      T.sign(ctx, { x: 60, y: 1470 })
    },
  })
}
