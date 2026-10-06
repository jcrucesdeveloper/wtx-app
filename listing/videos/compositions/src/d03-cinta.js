// D03 — "Just a little faster". Frame 0: a man flying horizontally off a
// treadmill, screaming, next to someone walking at speed 2 with a coffee.
// Slapstick at full volume from t = 0; the deadpan neighbour is the first
// laugh; the wrong button is the second hook; the wall is the peak.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: '«Solo un poquito más rápido»', cap2: '(era el otro botón)', ok: '¿todo bien?', fine: 'estoy bien.' },
  en: { cap: '“Just a little faster”', cap2: '(it was the other button)', ok: 'you good?', fine: "I'm fine." },
}

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 5.8,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#7ec8ff', floorY: 1390 })
      T.caption(ctx, t.cap)
      T.caption(ctx, t.cap2, { y: 400, at: 2.45, sound: 'bonk' })
      T.speedLines(ctx, scene, 0, 3.1, { dir: 1, y0: 640, y1: 1240, n: 12 })
      T.box(ctx, scene, { x: 1000, y: 520, w: 120, h: 880, fill: '#e98f5a', r: 0 })
      const hole = T.wallHole(ctx, scene, { x: 1040, y: 900, scale: 1.0, at: 3.28 })
      hole.style.zIndex = 0

      // his treadmill
      T.box(ctx, scene, { x: 80, y: 1310, w: 580, h: 60, fill: '#3b4350', r: 30 })
      T.box(ctx, scene, { x: 110, y: 900, w: 30, h: 430, fill: '#9aa3ad', r: 8 })
      T.box(ctx, scene, { x: 130, y: 926, w: 150, h: 26, fill: '#9aa3ad', r: 10 })
      const disp = T.box(ctx, scene, { x: 50, y: 770, w: 220, h: 140, fill: '#15171a', r: 16 })
      const speeds = [['12', 0], ['19', 0.9], ['47', 2.6]]
      speeds.forEach(([v, at], i) => {
        const e = node(ctx, 't-anton', disp, { left: '0', width: '204px', top: '6px', textAlign: 'center', fontSize: '100px', color: v === '47' ? '#ff5468' : '#7be495' }, v)
        if (i > 0) tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, at)
        if (speeds[i + 1]) tl.set(e, { opacity: 0 }, speeds[i + 1][1])
        if (i > 0) {
          tl.fromTo(disp, { scale: 1.3 }, { scale: 1, duration: 0.18, ease: 'back.out(3)', immediateRender: false }, at)
          ctx.sfx(at, 'blip', { midi: 84 + i * 5, gain: 1 })
        }
      })
      // shoes left behind, going round
      const shoes = [0, 1].map((i) => {
        const s = node(ctx, '', scene, { position: 'absolute', left: '150px', top: '1290px', width: '50px', height: '24px', borderRadius: '12px', background: T.INK, opacity: 0 })
        tl.set(s, { opacity: 1 }, 3.3)
        tl.fromTo(s, { x: i * 200 }, { x: 440, duration: 0.5 - i * 0.2, ease: 'none', immediateRender: false }, 3.3)
        for (let k = 0; k < 6; k++) tl.fromTo(s, { x: 0 }, { x: 440, duration: 0.4, ease: 'none', immediateRender: false }, 3.8 - i * 0.2 + k * 0.4)
        return s
      })
      void shoes

      // the neighbour: speed 2, coffee
      T.box(ctx, scene, { x: 720, y: 1310, w: 330, h: 60, fill: '#3b4350', r: 30 })
      const calm = T.person(ctx, scene, { x: 880, y: 1310, scale: 1.3, shirt: '#2fb36d', hair: 'flat' })
      T.poseNow(calm, { aR: [-30, -126] })
      T.box(ctx, calm.aR.hand, { x: -20, y: -44, w: 40, h: 46, fill: '#fff', r: 8, border: 6 })
      T.face(ctx, calm, 'blank', 0, { pupil: [-0.9, 0] })
      T.walk(ctx, calm, 0, 5.8, { step: 0.32, swing: 9 })

      // him
      const { piv, ch: bro, half } = T.tumbler(ctx, scene, { x: 450, y: 940 + 302, scale: 1.45, hair: 'band' })
      void half
      gsap.set(piv, { rotation: -90 })
      T.poseNow(bro, { arms: [172, 4] })
      T.face(ctx, bro, 'panic', 0)
      T.walk(ctx, bro, 0, 3.1, { step: 0.07, swing: 26 })
      for (let k = 0; k < 22; k++) tl.to(piv, { rotation: -90 + (k % 2 ? 7 : -7), y: k % 2 ? 10 : -10, duration: 0.14, ease: 'sine.inOut' }, k * 0.14)
      const egg = T.egg(ctx, scene, { x: 360, y: 1250, r: 50 })
      egg.look(0, -1, 0)

      // 0.0 — already airborne
      T.punchIn(ctx, scene, { from: 1.2 })
      ctx.sfx(0, 'scream', { dur: 0.9, pitch: 60, gain: 1 })
      ctx.sfx(0, 'buzz', { dur: 3.1, pitch: 40, gain: 0.5 })
      T.sweat(ctx, bro, 0.2, 5, 1)
      // 1.4 — the neighbour sips. The first laugh.
      T.pose(ctx, calm, { aR: [-34, -140] }, 1.3, 0.1)
      ctx.sfx(1.4, 'gulp', { gain: 1 })
      T.pose(ctx, calm, { aR: [-30, -126] }, 1.55, 0.1)
      T.say(ctx, calm, t.ok, 1.6, { x: 600, y: 560, w: 380, size: 60, tail: 0.75, pitch: 54, dur: 0.4, hold: 0.5 })
      ctx.sfx(1.3, 'scream', { dur: 0.8, pitch: 64, gain: 0.7 })
      // 2.45 — the second hook: the other button
      T.pose(ctx, bro, { aR: [-150, -40] }, 2.4, 0.12)
      ctx.sfx(2.6, 'alarm', { gain: 1, dur: 0.5 })
      T.face(ctx, bro, 'shock', 2.6)
      T.tremble(ctx, disp, 2.6, 3.1, 6, 2)
      // 3.1 — the peak
      tl.to(piv, { x: 1200, duration: 0.18, ease: 'power2.in' }, 3.1)
      ctx.sfx(3.1, 'rocket', { gain: 1, dur: 0.2 })
      tl.set(piv, { opacity: 0 }, 3.28)
      ctx.sfx(3.28, 'boom', { gain: 1 })
      ctx.sfx(3.3, 'crack', { gain: 1 })
      tl.fromTo(scene, { x: 30 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.25)', immediateRender: false }, 3.28)
      T.face(ctx, calm, 'shock', 3.3, { pupil: [0.9, -0.3] })
      egg.hop(3.28)
      egg.look(1, -0.6, 3.3)
      for (let s = 3.5; s < 5.7; s += 0.2) ctx.sfx(s, 'tick', { gain: 0.5 })
      // 4.1 — the neighbour looks at us, and sips
      T.face(ctx, calm, 'blank', 4.1)
      T.pose(ctx, calm, { aR: [-34, -140] }, 4.3, 0.1)
      ctx.sfx(4.4, 'gulp', { gain: 1 })
      T.pose(ctx, calm, { aR: [-30, -126] }, 4.55, 0.1)
      // 4.8 — from the wall
      T.say(ctx, null, t.fine, 4.8, { x: 560, y: 700, w: 380, size: 58, tail: 0.92, pitch: 62, dur: 0.4, hold: 0.5 })

      T.sign(ctx, { x: 60, y: 1470 })
    },
  })
}
