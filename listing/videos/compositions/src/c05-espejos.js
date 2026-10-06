// C05 — the rule of three: the gym mirror (a demigod), the mirror at home
// (a person), the front camera (a potato). Two beats set the pattern, the
// third breaks it and is the funniest (research 11). One panel per bar.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { a: 'El espejo del gym:', b: 'El espejo de casa:', c: 'La cámara frontal:' },
  en: { a: 'The gym mirror:', b: 'The mirror at home:', c: 'The front camera:' },
}
const P = 2.4

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: P * 3,
    bpm: 100,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.a, { out: P })
      T.caption(ctx, t.b, { at: P, out: 2 * P })
      T.caption(ctx, t.c, { at: 2 * P })
      const egg = T.egg(ctx, scene, { x: 120, y: 1338 })
      egg.look(1, -0.5, 0)

      const frame = node(ctx, '', scene, { position: 'absolute', left: '230px', top: '470px', width: '620px', height: '860px', overflow: 'hidden', boxSizing: 'border-box', border: '18px solid #aeb8c2', borderRadius: '26px', background: '#d9efff', outline: `8px solid ${T.INK}` })
      const style = (at, css) => tl.set(frame, css, at)
      style(P, { border: '26px solid #8a5a2b', borderRadius: '34px', background: '#efe6d6' })
      style(2 * P, { border: '30px solid #15171a', borderRadius: '90px', background: '#c3c9cf' })
      for (const at of [P, 2 * P]) tl.fromTo(frame, { scale: 1.08 }, { scale: 1, duration: 0.2, ease: 'back.out(3)', immediateRender: false }, at)
      const group = (from, to) => {
        const g = node(ctx, '', frame, { position: 'absolute', left: '0', top: '0', width: '584px', height: '824px' })
        T.during(ctx, g, from, to)
        return g
      }

      // 1 — the gym mirror
      const g1 = group(0, P)
      node(ctx, '', g1, { position: 'absolute', inset: '0', background: 'radial-gradient(60% 50% at 50% 45%, rgba(255,214,102,0.95), rgba(255,214,102,0) 75%)' })
      const god = T.person(ctx, g1, { x: 290, y: 800, scale: 1.5, hair: 'band', torsoW: 210, torsoH: 150, armW: 40, arm: [72, 66], headR: 54, leg: [62, 58] })
      T.poseNow(god, { arms: [100, 95] })
      T.face(ctx, god, 'smug', 0)
      for (let k = 0; k < 5; k++) {
        tl.to(god.torso, { scaleX: 1.08, scaleY: 1.04, duration: 0.2, ease: 'power2.out' }, k * 0.45)
        tl.to(god.torso, { scaleX: 1, scaleY: 1, duration: 0.2 }, k * 0.45 + 0.22)
      }
      const r = rng(6)
      for (let i = 0; i < 9; i++) {
        const sp = T.ink(ctx, g1, '✦', { x: 30 + r() * 500, y: 40 + r() * 560, size: 50 + r() * 50, color: '#fff', font: 't-inter' })
        for (let k = 0; k < 6; k++) tl.set(sp, { opacity: (k + i) % 2 }, k * 0.2 + i * 0.03)
      }
      ctx.sfx(0, 'choir', { gain: 1.3, dur: 2.2, root: 60 })
      ctx.sfx(0, 'ding', { gain: 0.8, midi: 96 })
      ctx.sfx(0.6, 'ding', { gain: 0.6, midi: 91 })

      // 2 — the mirror at home
      const g2 = group(P, 2 * P)
      const me = T.person(ctx, g2, { x: 290, y: 800, scale: 1.35, hair: 'band' })
      T.poseNow(me, { lean: 3, head: 5, arms: [5, 2] })
      T.face(ctx, me, 'blank', 0)
      T.blink(ctx, me, P + 1.2)
      ctx.sfx(P, 'pop', { gain: 0.8 })
      ctx.sfx(P + 0.3, 'crickets', { gain: 1.8, dur: 1.8 })
      egg.look(1, 0.2, P)

      // 3 — the front camera
      const g3 = group(2 * P)
      node(ctx, '', frame, { position: 'absolute', left: '212px', top: '14px', width: '160px', height: '36px', borderRadius: '18px', background: '#15171a', opacity: 0 }).id = 'notch'
      T.during(ctx, frame.querySelector('#notch'), 2 * P)
      const potato = node(ctx, '', g3, { position: 'absolute', left: '-10px', top: '170px', width: '600px', height: '700px', background: '#c9a26b', border: `9px solid ${T.INK}`, boxSizing: 'border-box', borderRadius: '46% 54% 40% 44% / 38% 40% 30% 32%' })
      node(ctx, '', potato, { position: 'absolute', left: '40px', top: '54px', width: '500px', height: '26px', background: '#e0263a', border: `7px solid ${T.INK}`, borderRadius: '10px', boxSizing: 'border-box', transform: 'rotate(-3deg)' })
      for (const [x, y, s] of [[90, 420, 26], [470, 380, 20], [430, 520, 30], [140, 560, 18]]) node(ctx, '', potato, { position: 'absolute', left: x + 'px', top: y + 'px', width: s + 'px', height: s * 0.7 + 'px', borderRadius: '50%', background: '#a9834f' })
      const lids = [200, 350].map((x) => {
        const e = node(ctx, '', potato, { position: 'absolute', left: x + 'px', top: '190px', width: '44px', height: '48px', borderRadius: '50%', background: '#fff', border: `6px solid ${T.INK}`, boxSizing: 'border-box', overflow: 'hidden' })
        node(ctx, '', e, { position: 'absolute', left: '11px', top: '15px', width: '12px', height: '12px', borderRadius: '50%', background: T.INK })
        return node(ctx, '', e, { position: 'absolute', left: '-6px', right: '-6px', top: '-48px', height: '48px', background: '#c9a26b', borderBottom: `6px solid ${T.INK}` })
      })
      node(ctx, '', potato, { position: 'absolute', left: '268px', top: '286px', width: '52px', height: '9px', borderRadius: '5px', background: T.INK })
      node(ctx, '', potato, { position: 'absolute', left: '170px', top: '400px', width: '250px', height: '90px', borderBottom: `8px solid ${T.INK}`, borderRadius: '0 0 50% 50%', boxSizing: 'border-box' })
      tl.fromTo(potato, { scale: 1.25 }, { scale: 1, duration: 0.16, ease: 'power4.out', immediateRender: false }, 2 * P)
      ctx.sfx(2 * P, 'boom', { gain: 1 })
      tl.fromTo(scene, { y: 20 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, 2 * P)
      // the long, slow blink
      for (const l of lids) {
        tl.to(l, { y: 44, duration: 0.25, ease: 'power1.in' }, 2 * P + 1.2)
        tl.to(l, { y: 0, duration: 0.25, ease: 'power1.out' }, 2 * P + 1.6)
      }
      ctx.sfx(2 * P + 1.2, 'squeak', { gain: 0.7, pitch: 60, down: true })
      egg.look(-1, -1, 2 * P + 0.1)
      egg.hop(2 * P)

      T.sign(ctx)
    },
  })
}
