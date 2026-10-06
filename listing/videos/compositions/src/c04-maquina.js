// C04 — "I've got 2 sets left". Heightening through time: the clock spins,
// the calendar flips, a beard grows, he becomes a skeleton, and THEN the guy
// on the phone asks if he's using the machine. Played completely straight
// (research 11: escalation + deadpan + a button).

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Cuando le quedan «2 series»:', two: 'me quedan 2', ha: 'jaja', ask: '¿la vas a usar?', ok: 'ok.', cal: ['LUN', 'JUE', 'MARZO', '2029', '2041'] },
  en: { cap: 'When he has “2 sets left”:', two: '2 sets left', ha: 'haha', ask: 'you using this?', ok: 'ok.', cal: ['MON', 'THU', 'MARCH', '2029', '2041'] },
}
const FLOOR = 1400
const px = (n) => n + 'px'

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 8.4,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)

      // the machine
      T.box(ctx, scene, { x: 70, y: 640, w: 26, h: 760, fill: '#9aa3ad', r: 6 })
      T.box(ctx, scene, { x: 440, y: 640, w: 26, h: 760, fill: '#9aa3ad', r: 6 })
      T.box(ctx, scene, { x: 70, y: 630, w: 396, h: 30, fill: '#9aa3ad', r: 6 })
      const stack = T.box(ctx, scene, { x: 104, y: 980, w: 90, h: 420, fill: 'repeating-linear-gradient(#3b4350 0 34px, #141414 34px 42px)', r: 8 })
      void stack
      T.box(ctx, scene, { x: 214, y: 1010, w: 44, h: 250, fill: '#e0263a', r: 12 })
      T.box(ctx, scene, { x: 210, y: 1236, w: 210, h: 44, fill: '#e0263a', r: 12 })

      // wall: a clock and a calendar
      const clock = T.box(ctx, scene, { x: 820, y: 520, w: 170, h: 170, fill: '#fff', r: 85 })
      const hand = (len, w) => {
        const j = node(ctx, 'joint', clock, { left: '77px', top: '77px' })
        node(ctx, '', j, { position: 'absolute', left: px(-w / 2), top: px(-len), width: px(w), height: px(len), background: T.INK, borderRadius: '4px' })
        return j
      }
      const hMin = hand(64, 8)
      const hHour = hand(42, 10)
      tl.to(hMin, { rotation: 360 * 34, duration: 3.4, ease: 'power2.in' }, 0.9)
      tl.to(hHour, { rotation: 360 * 4, duration: 3.4, ease: 'power2.in' }, 0.9)
      const cal = T.box(ctx, scene, { x: 590, y: 510, w: 190, h: 200, fill: '#fff', r: 14 })
      node(ctx, '', cal, { position: 'absolute', left: '0', right: '0', top: '0', height: '44px', background: '#e0263a', borderBottom: `7px solid ${T.INK}` })
      const calAt = [0, 1.6, 2.4, 3.2, 3.9]
      t.cal.forEach((txt, i) => {
        const e = node(ctx, 't-anton', cal, { left: '0', width: '174px', top: '72px', textAlign: 'center', fontSize: txt.length > 4 ? '56px' : '76px', color: T.INK }, txt)
        if (i > 0) tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, calAt[i])
        if (calAt[i + 1] !== undefined) tl.set(e, { opacity: 0 }, calAt[i + 1])
        if (i > 0) {
          tl.fromTo(cal, { rotation: -6 }, { rotation: 0, duration: 0.2, ease: 'back.out(3)', immediateRender: false }, calAt[i])
          ctx.sfx(calAt[i], 'paper', { gain: 0.9, dur: 0.14 })
        }
      })

      const egg = T.egg(ctx, scene, { x: 960, y: 1338 })
      egg.look(-1, -0.2, 0)

      // the guy on the machine
      const kev = T.person(ctx, scene, { x: 320, y: FLOOR, scale: 1.3, shirt: '#2fb36d', hair: 'flat' })
      T.poseNow(kev, { legs: [72, -72], arms: [30, -150] })
      T.box(ctx, kev.aR.hand, { x: -22, y: -60, w: 44, h: 70, fill: '#22262d', r: 8, border: 5 })
      T.face(ctx, kev, 'down', 0, { mouth: 'smile' })
      for (let s = 0.9; s < 5.4; s += 0.22) tl.to(kev.aL.el, { rotation: s % 0.44 < 0.22 ? -142 : -150, duration: 0.1 }, s)

      // the one waiting
      const bro = T.person(ctx, scene, { x: 760, y: FLOOR, scale: 1.45, hair: 'band' })
      T.poseNow(bro, { arms: [20, -130] })
      const beard = node(ctx, '', bro.head, { position: 'absolute', left: '34px', top: '112px', width: '72px', height: '250px', background: T.INK, borderRadius: '10px 10px 36px 36px', transformOrigin: '50% 0' })
      tl.set(beard, { scaleY: 0 }, 0)
      const skel = T.person(ctx, scene, { x: 760, y: FLOOR, scale: 1.45, skeleton: true })
      T.poseNow(skel, { arms: [20, -130] })
      tl.set(skel.root, { opacity: 0 }, 0)
      T.face(ctx, skel, 'blank', 0, { mouth: 'grit' })
      gsap.set(skel.head, { transformOrigin: '50% 50%' })

      // 0.0 — "2 sets left"
      T.say(ctx, kev, t.two, 0.0, { x: 70, y: 470, w: 400, size: 56, tail: 0.6, pitch: 68, dur: 0.55, hold: 0.7 })
      T.face(ctx, bro, 'neutral', 0)
      // 1.0 — waiting. Foot tapping.
      T.face(ctx, bro, 'blank', 1.0)
      for (const s of [1.0, 1.3, 1.6, 1.9]) {
        tl.to(bro.lR.th, { rotation: -14, duration: 0.08 }, s)
        tl.to(bro.lR.th, { rotation: -3, duration: 0.08 }, s + 0.1)
        ctx.sfx(s + 0.1, 'tick', { gain: 0.9 })
      }
      // 2.0 — he is watching something funny
      T.face(ctx, kev, 'happy', 2.0)
      T.say(ctx, kev, t.ha, 2.0, { x: 120, y: 520, w: 240, size: 56, tail: 0.7, pitch: 72, dur: 0.35, hold: 0.5 })
      T.face(ctx, kev, 'down', 3.0, { mouth: 'smile' })
      // 2.4 — the beard
      T.face(ctx, bro, 'sleepy', 2.2)
      tl.to(beard, { scaleY: 1, duration: 1.4, ease: 'power1.in' }, 2.4)
      ctx.sfx(2.4, 'slidewhistle', { dur: 1.4, from: 80, to: 56, gain: 0.5 })
      T.face(ctx, bro, 'sad', 3.6)
      // 4.2 — bones
      tl.set(bro.root, { opacity: 0 }, 4.2)
      tl.set(skel.root, { opacity: 1 }, 4.2)
      T.pow(ctx, scene, 4.2, { x: 760, y: 1000, r: 260, n: 10 })
      ctx.sfx(4.2, 'bonk', { gain: 1, pitch: 52 })
      ctx.sfx(4.25, 'powerdown', { gain: 0.9 })
      const web = node(ctx, '', scene, { position: 'absolute', left: '790px', top: '660px', width: '220px', height: '260px' }, `<svg viewBox="0 0 220 260" width="220" height="260" fill="none" stroke="${T.INK}" stroke-width="5" opacity=".6"><path d="M110 0 L20 250 M110 0 L110 250 M110 0 L200 250 M70 110 Q110 140 150 110 M45 180 Q110 220 175 180"/></svg>`)
      T.during(ctx, web, 4.2)
      egg.look(-1, -0.6, 4.2)
      ctx.sfx(4.9, 'crickets', { gain: 1.6, dur: 0.8 })

      // 5.6 — and now he notices
      T.face(ctx, kev, 'neutral', 5.6, { pupil: [0.9, -0.2] })
      T.say(ctx, kev, t.ask, 5.7, { x: 60, y: 460, w: 470, size: 56, tail: 0.6, pitch: 68, dur: 0.6, hold: 0.9 })
      // 6.9 — the head considers it, and leaves
      tl.to(skel.neck, { rotation: 18, duration: 0.2, ease: 'power2.in' }, 6.9)
      ctx.sfx(6.9, 'tick', { gain: 0.9 })
      T.face(ctx, skel, 'shock', 7.1)
      tl.to(skel.head, { y: 250, rotation: 200, x: 60, duration: 0.3, ease: 'power2.in' }, 7.1)
      ctx.sfx(7.4, 'bonk', { gain: 1, pitch: 58 })
      tl.to(skel.head, { y: 205, x: 130, rotation: 330, duration: 0.14, ease: 'power2.out' }, 7.4)
      tl.to(skel.head, { y: 250, x: 180, rotation: 420, duration: 0.14, ease: 'power2.in' }, 7.54)
      ctx.sfx(7.68, 'bonk', { gain: 0.7, pitch: 62 })
      egg.hop(7.4)
      T.face(ctx, kev, 'down', 7.8, { mouth: 'smile' })
      T.say(ctx, kev, t.ok, 7.8, { x: 150, y: 540, w: 180, size: 54, tail: 0.6, pitch: 68, dur: 0.2, hold: 0.5 })

      ctx.music([{ at: 0, bars: 2, part: 'cartoon', gain: 0.28 }])
      T.sign(ctx)
    },
  })
}
