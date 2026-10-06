// D09 — "Tomorrow I train at 5 a.m.". Frame 0: night, a ringing clock, and a
// dumbbell already on its way down. Three alarms, three solutions (rule of
// three); the day goes by in the window; the peak is the time he wakes up.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: '«Mañana entreno a las 5 a. m.»', cap2: '(puso 3 alarmas)', pm: '5:00 PM', well: '…bueno. Eran las 5.' },
  en: { cap: '“Tomorrow I train at 5 a.m.”', cap2: '(he set 3 alarms)', pm: '5:00 PM', well: '…well. It was 5.' },
}

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
      const scene = T.stage(ctx, { bg: '#27315c', floorY: 1400 })
      T.caption(ctx, t.cap, { size: 54 })
      T.caption(ctx, t.cap2, { y: 400, at: 2.3, out: 4.6, sound: 'bonk' })

      // the window: the day will pass in it
      const win = T.box(ctx, scene, { x: 660, y: 520, w: 340, h: 300, fill: '#141b3a', r: 12 })
      const orb = node(ctx, '', win, { position: 'absolute', left: '200px', top: '40px', width: '80px', height: '80px', borderRadius: '50%', background: '#f5f1d8' })
      node(ctx, '', win, { position: 'absolute', left: '158px', top: '0', width: '8px', height: '284px', background: T.INK })
      const crack = node(ctx, '', win, { position: 'absolute', left: '0', top: '0', width: '324px', height: '284px' }, `<svg viewBox="0 0 324 284" width="324" height="284" fill="none" stroke="#fff" stroke-width="5"><path d="M90 150 L20 60 M90 150 L160 70 M90 150 L150 240 M90 150 L20 230 M90 150 L80 20"/></svg>`)
      T.during(ctx, crack, 1.95)
      for (const [at, bg, oc, oy] of [[3.5, '#f4a261', '#ffd84d', 150], [3.9, '#7ec8ff', '#ffe14d', 30], [4.3, '#ff8a7a', '#ff5468', 170]]) {
        tl.to(win, { backgroundColor: bg, duration: 0.3 }, at)
        tl.to(orb, { backgroundColor: oc, y: oy - 40, x: (at - 3.5) * -160, duration: 0.3 }, at)
        tl.to(scene.previousSibling.previousSibling, { backgroundColor: at > 4 ? '#f4a261' : '#9be8ff', duration: 0.3 }, at)
      }

      // him, in bed
      const clip = node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1100px', overflow: 'hidden' })
      const bro = T.person(ctx, clip, { x: 300, y: 1520, scale: 1.9, hair: 'band' })
      T.poseNow(bro, { aR: [-150, -24] })
      const db = T.dumbbell(ctx, bro.aR.hand, { w: 70, h: 44 })
      // bed in front of him
      T.box(ctx, scene, { x: 40, y: 1080, w: 620, h: 330, fill: '#5b6cc4', r: 22 })
      T.box(ctx, scene, { x: 30, y: 1010, w: 200, h: 110, fill: '#fff', r: 40 })
      T.box(ctx, scene, { x: 20, y: 960, w: 36, h: 450, fill: '#8a5a2b', r: 10 })
      // nightstand and the clock
      T.box(ctx, scene, { x: 720, y: 1160, w: 280, h: 250, fill: '#8a5a2b', r: 12 })
      const clock = node(ctx, '', scene, { position: 'absolute', left: '860px', top: '1160px', width: '0', height: '0' })
      for (const x of [-76, 30]) node(ctx, '', clock, { position: 'absolute', left: x + 'px', top: '-196px', width: '46px', height: '40px', borderRadius: '24px 24px 6px 6px', background: '#f7c52b', border: `7px solid ${T.INK}`, boxSizing: 'border-box' })
      const face = T.box(ctx, clock, { x: -80, y: -170, w: 160, h: 160, fill: '#fff', r: 80 })
      node(ctx, 't-anton', face, { left: '0', width: '144px', top: '36px', textAlign: 'center', fontSize: '60px', color: '#e0263a' }, '5:00')
      for (const x of [-56, 40]) node(ctx, '', clock, { position: 'absolute', left: x + 'px', top: '-22px', width: '16px', height: '26px', background: T.INK, borderRadius: '6px' })
      // the plate is the third alarm
      const egg = T.egg(ctx, scene, { x: 560, y: 1338, r: 58 })
      egg.look(-1, -0.6, 0)

      const ring = (el, at, until, base) => {
        T.tremble(ctx, el, at, until, 9, Math.round(at * 10), base)
        for (let s = at; s < until; s += 0.2) {
          const z = T.ink(ctx, scene, ')))', { x: 940, y: 960, size: 60, color: '#ffe14d', font: 't-inter' })
          T.during(ctx, z, s, s + 0.1)
        }
      }

      // 0.0 — 5:00. The dumbbell is already coming.
      T.punchIn(ctx, scene, { from: 1.2 })
      T.face(ctx, bro, 'angry', 0, { lid: 0.55 })
      ctx.sfx(0, 'alarm', { gain: 1, dur: 0.55 })
      ring(clock, 0, 0.5)
      T.pose(ctx, bro, { aR: [-96, -6] }, 0.42, 0.1, 'power4.in')
      // 0.52 — alarm one: solved
      tl.to(clock, { scaleY: 0.25, scaleX: 1.5, y: 0, duration: 0.05 }, 0.52)
      ctx.sfx(0.52, 'boom', { gain: 1 })
      ctx.sfx(0.54, 'crack', { gain: 1 })
      T.pow(ctx, scene, 0.52, { x: 860, y: 1100, r: 240, n: 10, color: '#fff' })
      tl.fromTo(scene, { y: 24 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, 0.52)
      T.face(ctx, bro, 'sleepy', 0.7)
      T.pose(ctx, bro, { aR: [-10, -4] }, 0.8, 0.15)
      tl.set(db, { opacity: 0 }, 0.85)
      const zz = T.ink(ctx, scene, 'z z z', { x: 380, y: 760, size: 70, color: '#fff' })
      T.during(ctx, zz, 0.95, 1.4)
      ctx.sfx(0.95, 'slidewhistle', { dur: 0.4, from: 60, to: 52, gain: 0.5 })

      // 1.4 — alarm two: a phone. Solved differently.
      const phone = T.box(ctx, scene, { x: 420, y: 1010, w: 70, h: 110, fill: '#15171a', r: 12 })
      T.during(ctx, phone, 1.4, 2.0)
      ctx.sfx(1.4, 'alarm', { gain: 1, dur: 0.4 })
      T.tremble(ctx, phone, 1.4, 1.75, 8, 3)
      T.face(ctx, bro, 'angry', 1.45, { lid: 0.55 })
      T.pose(ctx, bro, { aR: [-120, -40] }, 1.55, 0.1)
      tl.to(phone, { x: 380, y: -330, rotation: 500, duration: 0.2, ease: 'none' }, 1.75)
      ctx.sfx(1.75, 'zip', { gain: 1 })
      ctx.sfx(1.95, 'crack', { gain: 1 })
      T.pose(ctx, bro, { aR: [-10, -4] }, 1.95, 0.15)
      T.face(ctx, bro, 'sleepy', 2.0)

      // 2.3 — the second hook: there are three. The plate itself.
      ctx.sfx(2.45, 'alarm', { gain: 1, dur: 0.7 })
      T.tremble(ctx, egg.el, 2.45, 3.1, 10, 5)
      T.face(ctx, bro, 'blank', 2.5)
      T.pose(ctx, bro, { aR: [-60, -50] }, 2.9, 0.1)
      tl.to(egg.el, { x: -380, y: -330, duration: 0.14, ease: 'power2.in' }, 3.1)
      tl.set(egg.el, { opacity: 0 }, 3.24)
      ctx.sfx(3.24, 'thud', { gain: 0.9 })
      T.pose(ctx, bro, { aR: [-10, -4] }, 3.25, 0.12)
      T.face(ctx, bro, 'sleepy', 3.3)
      // 3.5 — the day, in the window
      ctx.sfx(3.5, 'slidewhistle', { dur: 1.1, from: 60, to: 90, gain: 0.5 })
      for (const s of [3.5, 3.9, 4.3]) ctx.sfx(s, 'tick', { gain: 0.9 })

      // 4.7 — he wakes. Rested.
      T.face(ctx, bro, 'happy', 4.7)
      T.pose(ctx, bro, { arms: [160, 20] }, 4.7, 0.2, 'back.out(2)')
      ctx.sfx(4.7, 'blab', { dur: 0.4, pitch: 60, seed: 6, gain: 0.8, rise: 5 })
      T.pose(ctx, bro, { arms: [10, 4] }, 5.1, 0.15)
      // 5.2 — the peak
      const pm = T.box(ctx, scene, { x: 330, y: 560, w: 300, h: 120, fill: '#15171a', r: 20 })
      node(ctx, 't-anton', pm, { left: '0', width: '284px', top: '14px', textAlign: 'center', fontSize: '76px', color: '#ff5468' }, t.pm)
      T.during(ctx, pm, 5.2)
      tl.fromTo(pm, { scale: 2 }, { scale: 1, duration: 0.15, ease: 'power4.out', immediateRender: false }, 5.2)
      ctx.sfx(5.2, 'boom', { gain: 1 })
      T.face(ctx, bro, 'blank', 5.25)
      T.say(ctx, bro, t.well, 5.7, { x: 60, y: 700, w: 520, size: 52, tail: 0.5, pitch: 58, dur: 0.5, hold: 0.6 })

      T.sign(ctx, { x: 900, y: 1470, color: '#fff' })
    },
  })
}
