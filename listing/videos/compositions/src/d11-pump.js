// D11 — "When you finally have a pump and get your phone out". Frame 0: a man
// flexing at a phone, already deflating. Rule of three: it comes back when the
// phone goes down, leaves when it comes up; the third time, the phone gets
// the muscles. Ends on the phone's selfie.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Cuando por fin tienes pump y sacas el móvil:', cap2: '(tercer intento)' },
  en: { cap: 'When you finally have a pump and grab your phone:', cap2: '(third attempt)' },
}
const FLOOR = 1400
const BUFF = { torsoW: 220, torsoH: 150, armW: 42, arm: [72, 66], headR: 58, leg: [66, 62] }

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.0,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#8fe3f0' })
      T.caption(ctx, t.cap, { size: 50 })
      T.caption(ctx, t.cap2, { size: 56, y: 470, at: 3.0, sound: 'bonk' })
      const r = rng(3)
      const egg = T.egg(ctx, scene, { x: 110, y: 1338 })
      egg.look(1, -0.5, 0)

      const buff = T.person(ctx, scene, { x: 400, y: FLOOR, scale: 1.9, hair: 'band', ...BUFF })
      const thin = T.person(ctx, scene, { x: 400, y: FLOOR, scale: 1.9, hair: 'band' })
      const FLEX = { aL: [100, 95], aR: [-60, -30] }
      T.poseNow(buff, FLEX)
      T.poseNow(thin, FLEX)
      tl.set(thin.root, { opacity: 0 }, 0)

      // the phone, which has ideas
      const phone = node(ctx, '', scene, { position: 'absolute', left: '760px', top: '900px', width: '0', height: '0' })
      const arms = [-1, 1].map((s) => {
        const j = node(ctx, 'joint', phone, { left: s * 74 + 'px', top: '-10px' })
        node(ctx, '', j, { position: 'absolute', left: '-22px', top: '-22px', width: '44px', height: '110px', borderRadius: '22px', background: T.INK })
        const e = node(ctx, 'joint', j, { left: '0', top: '88px' })
        node(ctx, '', e, { position: 'absolute', left: '-22px', top: '-22px', width: '44px', height: '100px', borderRadius: '22px', background: T.INK })
        node(ctx, '', e, { position: 'absolute', left: '-24px', top: '60px', width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: `7px solid ${T.INK}`, boxSizing: 'border-box' })
        gsap.set(j, { rotation: s * -100 })
        gsap.set(e, { rotation: s * -95 })
        tl.set(j, { opacity: 0 }, 0)
        return j
      })
      const body = T.box(ctx, phone, { x: -80, y: -140, w: 160, h: 280, fill: '#15171a', r: 28 })
      node(ctx, '', body, { position: 'absolute', left: '60px', top: '14px', width: '24px', height: '24px', borderRadius: '50%', background: '#3b4350', border: '4px solid #6b7480' })
      const pf = node(ctx, '', body, { position: 'absolute', left: '0', top: '90px', width: '144px', height: '80px', opacity: 0 })
      for (const x of [34, 86]) node(ctx, '', pf, { position: 'absolute', left: x + 'px', top: '0', width: '24px', height: '26px', borderRadius: '50%', background: '#fff' })
      node(ctx, '', pf, { position: 'absolute', left: '44px', top: '40px', width: '56px', height: '24px', borderBottom: '7px solid #fff', borderRadius: '0 0 30px 30px', boxSizing: 'border-box' })

      const swap = (toBuff, at) => {
        const [a, b] = toBuff ? [thin, buff] : [buff, thin]
        tl.to(a.torso, { scaleX: toBuff ? 1.5 : 0.6, duration: 0.14, ease: 'power2.in' }, at)
        tl.set(a.root, { opacity: 0 }, at + 0.14)
        tl.set(b.root, { opacity: 1 }, at + 0.14)
        tl.fromTo(b.torso, { scaleX: toBuff ? 0.6 : 1.5 }, { scaleX: 1, duration: 0.3, ease: 'elastic.out(1,0.4)', immediateRender: false }, at + 0.14)
        tl.set(a.torso, { scaleX: 1 }, at + 0.2)
        ctx.sfx(at, toBuff ? 'inflate' : 'deflate', { gain: 1, dur: toBuff ? 0.3 : 0.55 })
      }
      const sparkle = (at, until) => {
        for (let i = 0; i < 6; i++) {
          const sp = T.ink(ctx, scene, '✦', { x: 200 + r() * 400, y: 600 + r() * 500, size: 50 + r() * 40, color: '#fff', font: 't-inter' })
          T.during(ctx, sp, at + i * 0.04, until)
        }
      }
      const phoneUp = (at) => {
        tl.to(phone, { y: 0, rotation: 0, duration: 0.12, ease: 'back.out(3)' }, at)
        ctx.sfx(at, 'tick', { gain: 1 })
      }
      const phoneDown = (at) => tl.to(phone, { y: 420, rotation: 20, duration: 0.14, ease: 'power2.in' }, at)

      // 0.0 — the pose, the phone… and it goes
      T.punchIn(ctx, scene, { from: 1.2 })
      T.face(ctx, buff, 'smug', 0)
      T.face(ctx, thin, 'shock', 0)
      sparkle(0, 0.3)
      ctx.sfx(0, 'ding', { gain: 0.9, midi: 96 })
      swap(false, 0.22)
      egg.look(1, 0.3, 0.4)
      // 1.3 — phone down: it is back
      phoneDown(1.2)
      swap(true, 1.35)
      T.face(ctx, buff, 'wow', 1.5)
      sparkle(1.55, 2.1)
      // 2.1 — phone up: gone again
      phoneUp(2.1)
      T.face(ctx, buff, 'smug', 2.1)
      swap(false, 2.25)
      T.face(ctx, thin, 'angry', 2.5)

      // 3.0 — the second hook: he tries to be sneaky
      phoneDown(3.0)
      swap(true, 3.15)
      T.face(ctx, buff, 'side', 3.3, { pupil: [-0.9, 0] })
      ctx.sfx(3.3, 'blab', { dur: 0.6, pitch: 70, seed: 5, gain: 0.5, rise: 3 })
      tl.to(phone, { y: 0, rotation: 0, duration: 0.7, ease: 'none' }, 3.5)
      for (const s of [3.5, 3.7, 3.9, 4.1]) ctx.sfx(s, 'squeak', { gain: 0.4, pitch: 90 })
      // 4.25 — the peak: the phone takes them
      swap(false, 4.25)
      for (const j of arms) {
        tl.set(j, { opacity: 1 }, 4.4)
        tl.fromTo(j, { scale: 0.2 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1,0.4)', immediateRender: false }, 4.4)
      }
      tl.set(pf, { opacity: 1 }, 4.4)
      ctx.sfx(4.4, 'inflate', { gain: 1 })
      ctx.sfx(4.55, 'tada', { gain: 0.9 })
      sparkle(4.5, 6.0)
      T.face(ctx, thin, 'dead', 4.5)
      egg.hop(4.4)
      egg.look(1, -0.4, 4.5)
      tl.to(phone, { scale: 1.15, duration: 0.2, yoyo: true, repeat: 3 }, 4.7)
      // 5.4 — and a selfie
      const flash = node(ctx, 'layer', ctx.stage, { background: '#fff', zIndex: 80, opacity: 0 })
      tl.set(flash, { opacity: 0.95 }, 5.4)
      tl.to(flash, { opacity: 0, duration: 0.3 }, 5.44)
      ctx.sfx(5.4, 'clack', { gain: 1 })

      T.sign(ctx)
    },
  })
}
