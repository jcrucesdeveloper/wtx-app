// D12 — "The one who corrects your form unasked". Frame 0: a head hanging
// upside down into the frame, mid-"actually…". He comes out of the ceiling,
// the floor, your own barbell (rule of three); the second hook is "later, at
// home"; the peak is what is in the fridge.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El que corrige tu técnica sin pedirlo:', cap2: '…ya en casa.', a: 'en realidad…', b: 'de hecho…', c: 'técnicamente…', d: 'en realidad…<br>el yogur…', e: '…proteína.' },
  en: { cap: 'The one who corrects your form unasked:', cap2: '…later, at home.', a: 'actually…', b: 'well, actually…', c: 'technically…', d: 'actually…<br>yogurt has…', e: '…protein.' },
}
const FLOOR = 1400
const WHO = { shirt: '#f7c52b', hair: 'cap', glasses: true }

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
      const scene = T.stage(ctx, { bg: '#3cc9b5' })
      const cap = T.caption(ctx, t.cap, { size: 50 })
      tl.set(cap, { opacity: 0 }, 3.6)
      const egg = T.egg(ctx, scene, { x: 960, y: 1338 })
      egg.look(-1, -1, 0)

      // from the floor (clipped at the floor line)
      const pit = node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', width: '1080px', height: FLOOR + 'px', overflow: 'hidden' })
      const who2 = T.person(ctx, pit, { x: 150, y: 2200, scale: 1.5, ...WHO })
      T.face(ctx, who2, 'smug', 0)

      // from behind your own plates
      const who3 = T.person(ctx, scene, { x: 660, y: 1460, scale: 0.9, ...WHO })
      T.face(ctx, who3, 'smug', 0)
      tl.set(who3.root, { opacity: 0 }, 0)
      // you, trying to squat in peace
      const bro = T.person(ctx, scene, { x: 420, y: FLOOR, scale: 1.6, hair: 'band' })
      const bar = T.barbell(ctx, bro.tor, { w: 440, plates: [[150, '#e0263a'], [120, '#2f6df6']], x: 0, y: -128 })
      bro.tor.insertBefore(bar, bro.neck)
      T.poseNow(bro, { arms: [62, 118], legs: [70, -60] })

      // from the ceiling
      const who1 = T.person(ctx, scene, { x: 780, y: 40, scale: 1.7, ...WHO })
      gsap.set(who1.root, { rotation: 180 })
      T.face(ctx, who1, 'smug', 0)
      T.poseNow(who1, { aR: [-150, -40] })

      // 0.0 — he is already here
      T.punchIn(ctx, scene, { from: 1.22 })
      T.face(ctx, bro, 'strain', 0, { pupil: [0.9, -0.5], lid: 0.2 })
      T.say(ctx, who1, t.a, 0, { x: 560, y: 830, w: 440, size: 60, tail: 0.5, pitch: 70, dur: 0.6, hold: 0.45 })
      ctx.sfx(0, 'boom', { gain: 0.8 })
      for (let k = 0; k < 6; k++) tl.to(who1.aR.el, { rotation: k % 2 ? -40 : -70, duration: 0.12 }, 0.1 + k * 0.14)
      T.tremble(ctx, bro.tor, 0, 1.2, 3, 1)
      // 1.2 — up he goes…
      tl.to(who1.root, { y: -900, duration: 0.14, ease: 'power3.in' }, 1.2)
      ctx.sfx(1.2, 'zip', { gain: 0.9 })
      T.face(ctx, bro, 'blank', 1.3)
      T.pose(ctx, bro, { legs: [3, 0] }, 1.3, 0.2)
      // 1.6 — …and out of the floor
      tl.to(who2.root, { y: -560, duration: 0.14, ease: 'back.out(2)' }, 1.6)
      ctx.sfx(1.6, 'pop', { gain: 1 })
      T.say(ctx, who2, t.b, 1.7, { x: 40, y: 560, w: 460, size: 58, tail: 0.25, pitch: 70, dur: 0.6, hold: 0.3 })
      T.face(ctx, bro, 'sideL', 1.7)
      egg.look(-1, 0, 1.7)
      tl.to(who2.root, { y: 0, duration: 0.14, ease: 'power3.in' }, 2.55)
      // 2.7 — and from behind his own plates
      tl.set(who3.root, { opacity: 1 }, 2.7)
      tl.to(who3.root, { y: -250, duration: 0.14, ease: 'back.out(2)' }, 2.7)
      ctx.sfx(2.7, 'pop', { gain: 1 })
      T.say(ctx, who3, t.c, 2.8, { x: 560, y: 600, w: 460, size: 58, tail: 0.5, pitch: 70, dur: 0.6, hold: 0.25 })
      T.face(ctx, bro, 'angry', 2.8, { pupil: [0.9, 0] })
      T.tremble(ctx, bro.tor, 2.8, 3.6, 5, 2)
      T.sweat(ctx, bro, 2.9, 4, 2)

      // 3.6 — the second hook: home. Safe.
      const home = node(ctx, 'layer', ctx.stage, { background: '#ffd9a8', zIndex: 30, filter: 'url(#toonRough)' })
      T.during(ctx, home, 3.6)
      const c2 = T.caption(ctx, t.cap2, { size: 60, at: 3.6, sound: 'bonk' })
      c2.style.zIndex = 60
      node(ctx, '', home, { position: 'absolute', left: '30px', width: '1020px', top: FLOOR + 'px', height: '10px', background: T.INK, borderRadius: '6px' })
      // the fridge, and what is in it
      T.box(ctx, home, { x: 520, y: 560, w: 440, h: 850, fill: '#fff6c9', r: 26 })
      const inside = T.person(ctx, home, { x: 740, y: 1380, scale: 1.45, ...WHO })
      T.face(ctx, inside, 'smug', 0)
      T.poseNow(inside, { aR: [-40, -110] })
      T.box(ctx, inside.aR.hand, { x: -24, y: -60, w: 48, h: 60, fill: '#fff', r: 10, border: 6 })
      for (const y of [820, 1080]) node(ctx, '', home, { position: 'absolute', left: '528px', top: y + 'px', width: '424px', height: '8px', background: T.INK, opacity: 0.35 })
      const door = T.box(ctx, home, { x: 520, y: 560, w: 440, h: 850, fill: '#e9edf2', r: 26 })
      node(ctx, '', door, { position: 'absolute', left: '30px', top: '330px', width: '18px', height: '160px', background: '#9aa3ad', border: `6px solid ${T.INK}`, borderRadius: '10px', boxSizing: 'border-box' })
      gsap.set(door, { transformOrigin: '100% 50%' })
      const me = T.person(ctx, home, { x: 280, y: FLOOR, scale: 1.6, hair: 'band' })
      T.face(ctx, me, 'happy', 0)
      // 4.2 — he opens the fridge
      T.pose(ctx, me, { aR: [-80, -10] }, 4.1, 0.12, 'back.out(3)')
      tl.to(door, { scaleX: 0.06, duration: 0.2, ease: 'power2.out' }, 4.3)
      ctx.sfx(4.3, 'clack', { gain: 1 })
      // 4.5 — the peak
      ctx.sfx(4.5, 'boom', { gain: 1 })
      tl.fromTo(home, { y: 22 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, 4.5)
      T.face(ctx, me, 'shock', 4.5)
      T.say(ctx, inside, t.d, 4.6, { x: 420, y: 500, w: 520, size: 56, tail: 0.6, pitch: 70, dur: 0.8, hold: 0.25, parent: ctx.stage })
      // 5.7 — the door. Slowly.
      T.face(ctx, me, 'blank', 5.55)
      tl.to(door, { scaleX: 1, duration: 0.35, ease: 'power1.in' }, 5.7)
      ctx.sfx(6.05, 'bonk', { gain: 1, pitch: 50 })
      T.say(ctx, null, t.e, 6.1, { x: 600, y: 760, w: 300, size: 50, tail: 0.5, pitch: 70, dur: 0.3, hold: 0.3 })

      T.sign(ctx, { x: 60, y: 1470 })
    },
  })
}
