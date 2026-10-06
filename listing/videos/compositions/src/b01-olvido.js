// A01 — a stick figure who cannot remember what he lifted. Becker-style
// escalation with no dialogue: 75 crushes him, 60 launches the plate, and 72.5
// (the number a thought bubble remembers) is perfect. Cartoon sound world.
// Research: 09-animation-viral-and-sound.md (A: stick figures, B: escalation).

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: { hook: 'POV: no te acuerdas<br>cuánto levantaste', think: '¿70…? ¿72?<br>¿75…?', last: 'Última vez:<br>72.5 kg', cap: 'Tu app lo recuerda<br>por ti.' },
  en: { hook: "POV: you can't remember<br>what you lifted", think: '70…? 72?<br>75…?', last: 'Last time:<br>72.5 kg', cap: 'Your app remembers<br>for you.' },
}

const R = 70 // plate radius
const GROUND = 1300

const CROUCH = { hip: 50, lean: 30, head: -22, aF: [-6, 0], aB: [-6, 0], lF: [-50, 93, -133], lB: [-44, 88, -128] }
const TALL = { hip: 0, lean: -6, head: 0, aF: [0, 0], aB: [0, 0], lF: [0, 0, -90], lB: [0, 0, -90] }
const CRUSH = { hip: 96, lean: 40, head: 10, aF: [-6, 0], aB: [-6, 0], lF: [-85, 130, -135], lB: [-70, 120, -130] }

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.5

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 14 + C,
    bpm: 120,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      A.paperBg(ctx)
      const rough = A.rough(ctx, 'rough1', { scale: 4, freq: 0.014 })
      rough.boil(0, ctx.duration, 8)
      const scene = A.node(ctx, 'layer', ctx.stage, { filter: rough.css })

      // ground line, drawn
      A.node(ctx, '', scene, { position: 'absolute', left: '60px', width: '960px', top: GROUND + 'px', height: '10px', background: A.PAL.ink, borderRadius: '6px' })

      const rig = A.stickRig(ctx, scene, { x: 330, y: GROUND, scale: 1.7 })
      A.mood(ctx, rig, 'worry', 0)

      // ground plates (calibrated on the crouched hand), and the held copy
      A.poseNow(rig, CROUCH)
      const h = A.handPos(ctx, rig)
      A.poseNow(rig, A.STAND)
      const mkStack = (parent, n, colors, label, cx, cy) => {
        const g = A.node(ctx, '', parent, { position: 'absolute', left: cx + 'px', top: cy + 'px' })
        for (let i = n - 1; i >= 0; i--) {
          A.disc(ctx, g, { x: i * 22, y: -i * 22, r: R, colors, hole: 0.16 })
        }
        A.node(ctx, 't-anton', g, { left: (n - 1) * 22 - 55 + 'px', top: -(n - 1) * 22 - 26 + 'px', width: '110px', textAlign: 'center', fontSize: '50px', color: 'rgba(0,0,0,0.55)', textTransform: 'none' }, label)
        return g
      }
      // On the ground: they sit to the right, three choices.
      const spots = { 75: 0, 60: 0, 72.5: 0 }
      const ground = {}
      const held = {}
      for (const [key, n, colors, label] of [[75, 3, A.PAL.p25, '75'], [60, 1, A.PAL.p20, '60'], [72.5, 2, A.PAL.p25, '72.5']]) {
        ground[key] = mkStack(scene, n, colors, label, h.x + 0, h.y)
        // held copy lives on the hand
        held[key] = mkStack(rig.hand, n, colors, label, 0, 0)
        gsap.set(held[key], { scale: 1 / rig.scale })
        tl.set(held[key], { opacity: 0 }, 0)
        tl.set(ground[key], { opacity: 0 }, 0)
      }
      void spots

      // choices lined up on the ground to the right of the lifter, shown small
      const parked = (key, x) => {
        gsap.set(ground[key], { x: x - h.x, y: GROUND - 60 - h.y, scale: 0.8, transformOrigin: '0 0' })
      }
      parked(75, 500)
      parked(60, 700)
      parked(72.5, 880)
      for (const k of [75, 60, 72.5]) tl.set(ground[k], { opacity: 1 }, 0)

      // hook, readable on frame 0
      const hook = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '340px', textAlign: 'center', fontSize: '112px', color: A.PAL.ink, zIndex: 40, whiteSpace: 'normal', textTransform: 'none' }, t.hook)
      ctx.tl.set(hook, { opacity: 0 }, 12.2)

      const grab = (key, at) => {
        // fly the parked stack to the crouched hand, then swap to the held copy
        tl.to(ground[key], { x: 0, y: 0, scale: 1, duration: 0.4, ease: 'power2.in' }, at)
        tl.set(ground[key], { opacity: 0 }, at + 0.4)
        tl.set(held[key], { opacity: 1 }, at + 0.4)
        ctx.sfx(at + 0.4, 'clank')
      }

      // 0–2.4: scratching his head, thinking
      A.pose(ctx, rig, { aF: [-148, -128] }, 0.01, 0.01)
      for (let i = 0; i < 8; i++) tl.to(rig.aF.el, { rotation: i % 2 ? -138 : -118, duration: 0.15, ease: 'sine.inOut' }, 0.3 + i * 0.3)
      A.bubble(ctx, t.think, { x: 560, y: 700, w: 400, at: 0.7, out: 2.6, tailX: 0.2, size: 60 })
      ctx.sfx(0.7, 'boing', { gain: 0.5 })

      // 2.6: tries 75 — and gets flattened
      A.pose(ctx, rig, { aF: [-6, 0] }, 2.6, 0.2)
      A.pose(ctx, rig, CROUCH, 2.7, 0.35, 'power2.out')
      A.mood(ctx, rig, 'effort', 2.7)
      grab(75, 2.7)
      A.pose(ctx, rig, { hip: 20, lean: 22 }, 3.4, 0.45, 'power2.out')
      ctx.sfx(3.4, 'riser', { dur: 0.45, gain: 0.35 })
      A.pose(ctx, rig, CRUSH, 3.9, 0.12, 'power4.in')
      tl.to(rig.root, { scaleX: 2.0, scaleY: 1.35, transformOrigin: '0 0', duration: 0.1, ease: 'power2.out' }, 4.0)
      tl.to(rig.root, { scaleX: 1.7, scaleY: 1.7, duration: 0.4, ease: 'elastic.out(1,0.4)' }, 4.1)
      ctx.sfx(4.0, 'thud', { gain: 1.2 })
      ctx.sfx(4.05, 'fail', { gain: 0.9 })
      A.mood(ctx, rig, 'o', 4.0)
      A.shakeX(ctx, scene, 4.0, { amp: 16, n: 8, dur: 0.4 })
      const x75 = A.markerText(ctx, '75 ✗', { x: 640, y: 640, size: 130, at: 4.3, dur: 0.25, color: A.PAL.red, rotate: -6 })
      tl.set(x75, { opacity: 0 }, 6.0)

      // 6.0: tries 60 — it launches
      A.mood(ctx, rig, 'flat', 5.6)
      tl.set(held[75], { opacity: 0 }, 5.5)
      A.pose(ctx, rig, A.STAND, 5.5, 0.3)
      A.pose(ctx, rig, CROUCH, 5.9, 0.25, 'power2.out')
      grab(60, 5.9)
      A.mood(ctx, rig, 'effort', 6.2)
      A.pose(ctx, rig, { ...TALL, hip: -60, aF: [-170, -10], aB: [-170, -10], lean: -10 }, 6.5, 0.18, 'power4.out')
      tl.to(rig.root, { y: -120, duration: 0.18, ease: 'power3.out' }, 6.5)
      tl.to(rig.root, { y: 0, duration: 0.25, ease: 'bounce.out' }, 6.75)
      tl.set(held[60], { opacity: 0 }, 6.52)
      const fl = A.node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', opacity: 0 })
      A.disc(ctx, fl, { x: 0, y: 0, r: R, colors: A.PAL.p20, hole: 0.16 })
      tl.set(fl, { opacity: 1, x: h.x + 100, y: GROUND - 560 }, 6.52)
      tl.to(fl, { y: -400, x: h.x + 160, rotation: 540, duration: 0.7, ease: 'power2.out' }, 6.52)
      ctx.sfx(6.5, 'slidewhistle', { gain: 0.8, dur: 0.6, from: 70, to: 100 })
      A.mood(ctx, rig, 'o', 6.55)
      const x60 = A.markerText(ctx, '60 ✗', { x: 640, y: 640, size: 130, at: 7.1, dur: 0.25, color: A.PAL.red, rotate: 5 })
      tl.set(x60, { opacity: 0 }, 8.6)

      // 8.6: remembers — thought bubble with the number
      A.mood(ctx, rig, 'worry', 7.4)
      A.pose(ctx, rig, { ...A.STAND, aF: [-148, -128] }, 7.4, 0.3)
      A.bubble(ctx, t.last, { x: 540, y: 680, w: 440, at: 8.1, out: 9.6, tailX: 0.2, size: 64, sound: 'ding' })
      ctx.sfx(8.1, 'ding', { gain: 0.9, midi: 93 })

      // 9.6: 72.5, clean. Slow, smooth, tall.
      A.pose(ctx, rig, A.STAND, 9.5, 0.2)
      A.mood(ctx, rig, 'effort', 9.8)
      A.pose(ctx, rig, CROUCH, 9.8, 0.4, 'power2.out')
      grab(72.5, 9.8)
      A.pose(ctx, rig, TALL, 10.5, 0.7, 'power2.inOut')
      A.mood(ctx, rig, 'smile', 11.15)
      ctx.sfx(10.5, 'riser', { dur: 0.65, gain: 0.35 })
      ctx.sfx(11.2, 'plate', { gain: 0.9 })
      const ok = A.markerText(ctx, '72.5 ✓', { x: 590, y: 600, size: 140, at: 11.2, dur: 0.3, color: '#1f9d55', rotate: -4 })
      tl.set(ok, { opacity: 0 }, 12.25)
      A.burst(ctx, 11.2, { x: 540, y: 720, r: 380, color: A.PAL.red, n: 14, parent: scene })
      A.confetti(ctx, 11.25, { x: 540, y: 700, n: 40, parent: ctx.stage })

      A.markerText(ctx, t.cap, { x: 120, y: 1370, size: 92, at: 11.0, dur: 0.7, color: A.PAL.ink, font: 't-marker' })
      A.tag(ctx, { x: 90, y: 250, light: true })

      ctx.music([{ at: 0, bars: 7, part: 'cartoon' }])
      A.sting(ctx, 12.3, { y: 330, light: true, scrim: false })
      A.grain(ctx, { opacity: 0.16 })
      COLD['a01-olvido'](ctx0, C, lang)
    },
  })
}
