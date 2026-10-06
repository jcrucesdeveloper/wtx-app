// D02 — "The day after arm day". Frame 0: a man with tiny T-rex arms and a
// fork that will never reach his mouth. Rule of three (the fork, the phone,
// and then an actual T-rex who understands). Ends on the head-bump and cuts.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El día después de brazo:', cap2: '…y entonces lo entiendes.', hello: '¿aló?', bro: 'bro.' },
  en: { cap: 'The day after arm day:', cap2: '…and then you get it.', hello: 'hello?', bro: 'bro.' },
}
const FLOOR = 1400
const G = '#5fbf5a'
const px = (n) => n + 'px'

function dino(ctx, parent, { x, y, scale = 1 }) {
  const root = node(ctx, 'rig', parent, { left: px(x), top: px(y) })
  gsap.set(root, { scale })
  const b = (css) => node(ctx, '', root, { position: 'absolute', background: G, border: `9px solid ${T.INK}`, boxSizing: 'border-box', ...css })
  b({ left: '70px', top: '-300px', width: '300px', height: '130px', borderRadius: '10px 130px 130px 10px', clipPath: 'polygon(0 20%, 100% 62%, 100% 80%, 0 100%)', border: '0' })
  b({ left: '-90px', top: '-124px', width: '70px', height: '124px', borderRadius: '20px 20px 10px 10px' })
  b({ left: '20px', top: '-124px', width: '70px', height: '124px', borderRadius: '20px 20px 10px 10px' })
  b({ left: '-150px', top: '-420px', width: '290px', height: '330px', borderRadius: '130px 130px 110px 110px' })
  const arm = node(ctx, 'joint', root, { left: '-120px', top: '-270px' })
  node(ctx, '', arm, { position: 'absolute', left: '-11px', top: '-11px', width: '22px', height: '74px', borderRadius: '11px', background: G, border: `7px solid ${T.INK}`, boxSizing: 'border-box' })
  gsap.set(arm, { rotation: 50 })
  const head = node(ctx, '', root, { position: 'absolute', left: '-330px', top: '-600px', width: '330px', height: '220px', transformOrigin: '80% 80%' })
  node(ctx, '', head, { position: 'absolute', inset: '0', background: G, border: `9px solid ${T.INK}`, boxSizing: 'border-box', borderRadius: '70px 90px 60px 40px' })
  node(ctx, '', head, { position: 'absolute', left: '20px', top: '150px', width: '210px', height: '34px', background: 'repeating-linear-gradient(90deg, #fff 0 22px, #141414 22px 28px)', border: `7px solid ${T.INK}`, boxSizing: 'border-box', borderRadius: '8px' })
  const eye = node(ctx, '', head, { position: 'absolute', left: '150px', top: '40px', width: '70px', height: '74px', borderRadius: '50%', background: '#fff', border: `7px solid ${T.INK}`, boxSizing: 'border-box' })
  const pupil = node(ctx, '', eye, { position: 'absolute', left: '10px', top: '20px', width: '24px', height: '24px', borderRadius: '50%', background: T.INK })
  node(ctx, '', head, { position: 'absolute', left: '34px', top: '50px', width: '16px', height: '16px', borderRadius: '50%', background: T.INK })
  return { root, head, arm, pupil }
}

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.8,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#ff9ec4' })
      T.caption(ctx, t.cap)
      T.caption(ctx, t.cap2, { y: 400, at: 3.5, sound: 'bonk' })
      const egg = T.egg(ctx, scene, { x: 110, y: 1338 })
      egg.look(1, -0.6, 0)

      const rex = dino(ctx, scene, { x: 1700, y: FLOOR, scale: 1.0 })

      const bro = T.person(ctx, scene, { x: 380, y: FLOOR, scale: 2.0, hair: 'band', arm: [30, 26] })
      T.poseNow(bro, { arms: [34, -74] })
      // a fork, with one meatball
      const fork = node(ctx, '', bro.aR.hand, { position: 'absolute', left: '-4px', top: '-70px', width: '8px', height: '70px', background: '#9aa3ad', border: `3px solid ${T.INK}`, boxSizing: 'border-box' })
      const ball = node(ctx, '', scene, { position: 'absolute', left: '0', top: '0', width: '54px', height: '54px', borderRadius: '50%', background: '#8a4b2b', border: `7px solid ${T.INK}`, boxSizing: 'border-box' })
      const fh = T.hands(ctx, bro, { arms: [34, -74] }).R
      T.poseNow(bro, { arms: [34, -74] })
      gsap.set(ball, { x: fh.x - 27 + 16, y: fh.y - 190 })
      void fork
      // a phone in the other hand
      T.box(ctx, bro.aL.hand, { x: -18, y: -50, w: 36, h: 56, fill: '#22262d', r: 7, border: 5 })

      // 0.0 — it will not reach. It has never reached.
      T.punchIn(ctx, scene, { from: 1.25 })
      T.face(ctx, bro, 'strain', 0)
      tl.to(bro.neck, { rotation: 20, duration: 0.5, ease: 'power1.out' }, 0)
      T.tremble(ctx, bro.aR.sh, 0, 0.9, 3, 1)
      for (const s of [0, 0.2, 0.4, 0.6]) ctx.sfx(s, 'squeak', { gain: 0.8, pitch: 80 })
      ctx.sfx(0, 'blab', { dur: 0.6, pitch: 50, seed: 2, gain: 0.9 })
      T.sweat(ctx, bro, 0.3, 4, 1)
      // 0.9 — the meatball leaves
      tl.to(ball, { y: FLOOR - 54, duration: 0.25, ease: 'power2.in' }, 0.9)
      tl.to(ball, { x: '+=70', duration: 0.25, ease: 'none' }, 0.9)
      ctx.sfx(1.15, 'bonk', { gain: 0.9, pitch: 56 })
      tl.to(ball, { x: '+=150', rotation: 300, duration: 0.6, ease: 'power2.out' }, 1.15)
      T.face(ctx, bro, 'sad', 1.0)
      tl.to(bro.neck, { rotation: 0, duration: 0.15 }, 1.1)
      egg.look(1, 0.6, 1.2)

      // 1.7 — the phone rings. He cannot answer it. He finds a way.
      ctx.sfx(1.7, 'alarm', { gain: 0.9, dur: 0.6 })
      T.face(ctx, bro, 'shock', 1.7, { pupil: [-0.8, 0.4] })
      T.tremble(ctx, bro.aL.sh, 1.7, 2.3, 4, 2)
      T.face(ctx, bro, 'blank', 2.25)
      tl.to(bro.root, { rotation: 90, x: -310, duration: 0.2, ease: 'power3.in' }, 2.4)
      ctx.sfx(2.6, 'thud', { gain: 1 })
      tl.fromTo(scene, { y: 18 }, { y: 0, duration: 0.3, ease: 'elastic.out(1,0.3)', immediateRender: false }, 2.6)
      T.face(ctx, bro, 'neutral', 2.7)
      T.say(ctx, bro, t.hello, 2.8, { x: 600, y: 1020, w: 300, size: 60, tail: 0.7, pitch: 64, dur: 0.35, hold: 0.4 })

      // 3.5 — the second hook: someone who understands
      for (const [i, s] of [3.6, 3.95, 4.3].entries()) {
        ctx.sfx(s, 'thud', { gain: 1 })
        tl.fromTo(scene, { y: 14 }, { y: 0, duration: 0.2, ease: 'power2.out', immediateRender: false }, s)
        void i
      }
      tl.to(rex.root, { x: -880, duration: 0.9, ease: 'none' }, 3.55)
      ctx.sfx(3.7, 'roar', { gain: 0.9, dur: 0.7 })
      tl.to(bro.root, { rotation: 0, x: 0, duration: 0.16, ease: 'back.out(2)' }, 4.2)
      T.face(ctx, bro, 'shock', 4.2)
      egg.look(1, -1, 3.8)
      // 4.9 — the fist bump that cannot happen
      T.face(ctx, bro, 'strain', 4.9)
      T.pose(ctx, bro, { aR: [-86, -4] }, 4.9, 0.12, 'back.out(3)')
      tl.to(rex.arm, { rotation: 96, duration: 0.12, ease: 'back.out(3)' }, 4.9)
      T.tremble(ctx, bro.tor, 4.95, 5.85, 4, 5)
      T.tremble(ctx, rex.arm, 4.95, 5.85, 3, 6)
      for (const s of [4.95, 5.2, 5.45, 5.7]) ctx.sfx(s, 'squeak', { gain: 0.8, pitch: 84 })
      T.sweat(ctx, bro, 5.2, 4, 4)
      // 5.9 — fine. Heads.
      T.pose(ctx, bro, { aR: [-34, 74] }, 5.9, 0.08)
      tl.to(rex.arm, { rotation: 50, duration: 0.08 }, 5.9)
      tl.to(bro.root, { x: 70, duration: 0.1, ease: 'power3.in' }, 5.95)
      tl.to(bro.neck, { rotation: 24, duration: 0.1 }, 5.95)
      tl.to(rex.head, { rotation: 16, x: -30, duration: 0.1, ease: 'power3.in' }, 5.95)
      ctx.sfx(6.05, 'bonk', { gain: 1, pitch: 60 })
      T.pow(ctx, scene, 6.05, { x: 560, y: 760, r: 200, n: 10 })
      T.face(ctx, bro, 'happy', 6.05)
      egg.hop(6.05)
      T.say(ctx, null, t.bro, 6.15, { x: 600, y: 560, w: 240, size: 70, tail: 0.5, pitch: 40, dur: 0.25, hold: 0.5 })

      T.sign(ctx)
    },
  })
}
