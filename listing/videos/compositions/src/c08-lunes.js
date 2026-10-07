// C08 — "Monday at every gym on Earth". Recognition by contrast: the chest
// area is a queue, the leg area has a tumbleweed and a cobweb. Button: someone
// walks into the leg area… and turns the sign into CHEST 2. (Research 11:
// "international chest day" is the most-recognised gym in-joke.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Lunes en cualquier gym del mundo:', chest: 'PECHO', legs: 'PIERNA', chest2: 'PECHO 2', turn: 'TURNO 47' },
  en: { cap: 'Monday at every gym on Earth:', chest: 'CHEST', legs: 'LEGS', chest2: 'CHEST 2', turn: 'NOW: 47' },
}
const px = (n) => n + 'px'
const MID = 940

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
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap, { size: 52 })
      node(ctx, '', scene, { position: 'absolute', left: '30px', width: '1020px', top: px(MID), height: '10px', background: T.INK, borderRadius: '6px' })
      const r = rng(31)

      const sign = (txt, x, y, fill) => {
        const b = T.box(ctx, scene, { x, y, w: 300, h: 84, fill, r: 12 })
        const e = node(ctx, 't-anton', b, { left: '0', width: '284px', top: '4px', textAlign: 'center', fontSize: '58px', color: T.INK }, txt)
        return { b, e }
      }
      sign(t.chest, 60, 470, '#ffe14d')
      const ticket = T.box(ctx, scene, { x: 720, y: 470, w: 300, h: 84, fill: '#15171a', r: 12 })
      node(ctx, 't-anton', ticket, { left: '0', width: '284px', top: '6px', textAlign: 'center', fontSize: '54px', color: '#ff5468' }, t.turn)

      // three benches, pressing in sync
      const bars = []
      for (const cx of [230, 540, 850]) {
        T.box(ctx, scene, { x: cx - 120, y: MID - 70, w: 240, h: 26, fill: '#9aa3ad', r: 8 })
        for (const dx of [-100, 86]) node(ctx, '', scene, { position: 'absolute', left: px(cx + dx), top: px(MID - 46), width: '12px', height: '48px', background: T.INK })
        node(ctx, '', scene, { position: 'absolute', left: px(cx - 70), top: px(MID - 98), width: '150px', height: '26px', background: ['#e0263a', '#2fb36d', '#2f6df6'][bars.length], border: `7px solid ${T.INK}`, borderRadius: '13px', boxSizing: 'border-box' })
        node(ctx, '', scene, { position: 'absolute', left: px(cx - 120), top: px(MID - 118), width: '56px', height: '56px', background: '#fffdf7', border: `7px solid ${T.INK}`, borderRadius: '50%', boxSizing: 'border-box' })
        node(ctx, '', scene, { position: 'absolute', left: px(cx + 70), top: px(MID - 92), width: '14px', height: '80px', background: T.INK, borderRadius: '7px', transform: 'rotate(-20deg)', transformOrigin: '50% 0' })
        const g = T.barbell(ctx, scene, { w: 250, plates: [[84, '#3b4350']], x: cx - 10, y: MID - 190 })
        for (const dx of [-34, 34]) node(ctx, '', g, { position: 'absolute', left: px(dx - 7), top: '0', width: '14px', height: '96px', background: T.INK, borderRadius: '7px' })
        bars.push(g)
      }
      const rep = (at) => {
        for (const g of bars) {
          tl.to(g, { y: MID - 150, duration: 0.2, ease: 'power2.in' }, at)
          tl.to(g, { y: MID - 190, duration: 0.25, ease: 'power2.out' }, at + 0.22)
        }
        ctx.sfx(at + 0.47, 'clack', { gain: 0.6 })
      }
      for (let s = 0; s < 3.2; s += 0.55) rep(s)
      for (let s = 5.0; s < 7.4; s += 0.55) rep(s)
      ctx.sfx(0, 'blab', { dur: 0.4, pitch: 48, seed: 2, gain: 0.8 })
      ctx.sfx(1.1, 'blab', { dur: 0.3, pitch: 52, seed: 7, gain: 0.6 })

      // the queue
      const heads = []
      for (let i = 0; i < 6; i++) {
        const h = node(ctx, '', scene, { position: 'absolute', left: px(370 + i * 100), top: px(600 + (i % 2) * 22), width: '86px', height: '86px', background: '#fffdf7', border: `7px solid ${T.INK}`, borderRadius: '50%', boxSizing: 'border-box', zIndex: 5 })
        node(ctx, '', h, { position: 'absolute', left: '0', top: '0', width: '72px', height: '26px', background: ['#141414', '#8a5a2b', '#f7c52b', '#141414', '#e0263a', '#8a5a2b'][i], borderRadius: '40px 40px 0 0' })
        const pupils = [18, 44].map((x) => {
          const e = node(ctx, '', h, { position: 'absolute', left: px(x), top: '30px', width: '16px', height: '18px', borderRadius: '50%', background: '#fff', border: `4px solid ${T.INK}`, boxSizing: 'border-box' })
          return node(ctx, '', e, { position: 'absolute', left: '1px', top: '2px', width: '6px', height: '6px', borderRadius: '50%', background: T.INK })
        })
        node(ctx, '', h, { position: 'absolute', left: '26px', top: '56px', width: '22px', height: '6px', background: T.INK, borderRadius: '3px' })
        for (let k = 0; k < 8; k++) tl.to(h, { y: k % 2 ? 0 : -8, duration: 0.2 + i * 0.01, ease: 'sine.inOut' }, k * 0.4 + i * 0.05)
        heads.push({ h, pupils })
      }

      // the leg area: a desert
      const legSign = sign(t.legs, 60, 990, '#cfd3d8')
      for (const x of [500, 760]) T.box(ctx, scene, { x, y: 1060, w: 26, h: 340, fill: '#9aa3ad', r: 6 })
      T.barbell(ctx, scene, { w: 420, plates: [[110, '#3b4350']], x: 643, y: 1130 })
      node(ctx, '', scene, { position: 'absolute', left: '520px', top: '1140px', width: '200px', height: '200px' }, `<svg viewBox="0 0 200 200" width="200" height="200" fill="none" stroke="${T.INK}" stroke-width="5" opacity=".55"><path d="M0 0 L190 190 M0 0 L80 200 M0 0 L200 80 M40 60 Q70 80 60 40 M80 120 Q130 150 120 80 M110 170 Q180 200 170 110"/></svg>`)
      const egg = T.egg(ctx, scene, { x: 930, y: 1338 })
      egg.look(-1, 0, 0)
      const weed = node(ctx, '', scene, { position: 'absolute', left: '-120px', top: '1290px', width: '110px', height: '110px' }, `<svg viewBox="0 0 110 110" width="110" height="110" fill="none" stroke="#8a6a3c" stroke-width="6" stroke-linecap="round"><path d="M55 8 C 100 10, 104 60, 80 90 C 50 112, 8 90, 10 50 C 12 20, 60 20, 78 44 C 92 70, 60 90, 40 74 C 26 58, 44 38, 60 50"/></svg>`)
      tl.to(weed, { x: 1300, rotation: 900, duration: 3.0, ease: 'none' }, 0.2)
      tl.to(weed, { y: -26, duration: 0.25, yoyo: true, repeat: 11, ease: 'sine.inOut' }, 0.2)
      ctx.sfx(0.9, 'crickets', { gain: 1.8, dur: 1.8 })
      void r

      // 3.2 — someone walks in to train legs?!
      const guy = T.person(ctx, scene, { x: 1250, y: 1400, scale: 0.95, shirt: '#ff8a7a', hair: 'flat' })
      T.walk(ctx, guy, 3.2, 4.2, { step: 0.14, swing: 18, sound: 'tick', gain: 0.5 })
      T.moveX(ctx, guy, 400, 3.2, 1.0)
      for (const { pupils } of heads) for (const p of pupils) tl.set(p, { x: -2, y: 6 }, 3.4)
      ctx.sfx(3.4, 'gulp', { gain: 1 })
      egg.look(-1, 0.3, 3.4)
      // 4.4 — no. He fixes the sign.
      T.face(ctx, guy, 'smug', 4.2)
      T.pose(ctx, guy, { aL: [150, 20] }, 4.3, 0.1, 'back.out(3)')
      tl.to(legSign.b, { scaleY: 0, duration: 0.08 }, 4.4)
      tl.set(legSign.e, { innerHTML: t.chest2 }, 4.48)
      tl.set(legSign.b, { backgroundColor: '#ffe14d' }, 4.48)
      tl.to(legSign.b, { scaleY: 1, duration: 0.12, ease: 'back.out(3)' }, 4.48)
      ctx.sfx(4.48, 'bonk', { gain: 1, pitch: 66 })
      T.pose(ctx, guy, { aL: [10, 4] }, 4.7, 0.12)
      // 4.9 — the stampede
      ctx.sfx(4.9, 'tada', { gain: 1 })
      heads.forEach(({ h, pupils }, i) => {
        const at = 4.95 + i * 0.07
        for (const p of pupils) tl.set(p, { x: 0, y: 0 }, at)
        tl.to(h, { x: 420 + i * 70 - (370 + i * 100) + (i % 2) * 30, y: 640 + (i % 3) * 34, duration: 0.3, ease: 'power3.in' }, at)
        ctx.sfx(at, 'zip', { gain: 0.7 })
        for (let k = 0; k < 6; k++) tl.to(h, { y: 640 + (i % 3) * 34 + (k % 2 ? 0 : -16), duration: 0.14 }, at + 0.32 + k * 0.15)
      })
      egg.hop(5.2)
      egg.look(0, -1, 5.2)
      ctx.sfx(5.3, 'blab', { dur: 0.6, pitch: 60, seed: 9, gain: 0.8 })

      T.sign(ctx, { x: 900, y: 1500 })
    },
  })
}
