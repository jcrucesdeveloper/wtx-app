// C10 — "The squat rack is finally free…". Expectation (a light from heaven,
// a choir, a slow-motion run with tears of joy), a record scratch, and the
// oldest gym crime: curls in the squat rack. The button is the look to
// camera. (Research 11: build an expectation, break it, hold the beat.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Por fin libre el rack de sentadillas…', cap2: '…para hacer bíceps.', hum: 'la la la' },
  en: { cap: 'The squat rack is finally free…', cap2: '…for bicep curls.', hum: 'la la la' },
}
const FLOOR = 1400

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
      T.caption(ctx, t.cap2, { size: 52, y: 400, at: 3.7, sound: 'bonk' })

      // heaven's light
      const beam = node(ctx, '', scene, { position: 'absolute', left: '360px', top: '460px', width: '620px', height: '940px', background: 'linear-gradient(180deg, rgba(255,225,77,0.85), rgba(255,225,77,0.15))', clipPath: 'polygon(34% 0, 66% 0, 100% 100%, 0 100%)' })
      const r = rng(4)
      const sparks = []
      for (let i = 0; i < 8; i++) {
        const sp = T.ink(ctx, scene, '✦', { x: 420 + r() * 480, y: 560 + r() * 640, size: 44 + r() * 40, color: '#fff', font: 't-inter' })
        for (let k = 0; k < 13; k++) tl.set(sp, { opacity: (k + i) % 2 }, k * 0.2 + i * 0.03)
        sparks.push(sp)
      }
      tl.set([beam, ...sparks], { opacity: 0 }, 2.6)

      // the rack
      for (const x of [520, 800]) T.box(ctx, scene, { x, y: 640, w: 30, h: 760, fill: '#9aa3ad', r: 6 })
      T.box(ctx, scene, { x: 520, y: 630, w: 310, h: 30, fill: '#9aa3ad', r: 6 })
      T.barbell(ctx, scene, { w: 520, plates: [[150, '#e0263a'], [120, '#2f6df6']], x: 675, y: 830 })
      const egg = T.egg(ctx, scene, { x: 980, y: 1338 })
      egg.look(-1, -0.3, 0)

      // him: tears of joy, slow motion
      const bro = T.person(ctx, scene, { x: 110, y: FLOOR, scale: 1.3, hair: 'band' })
      T.face(ctx, bro, 'wow', 0)
      T.cry(ctx, bro, 0, 2.7)
      T.poseNow(bro, { arms: [70, 30] })
      T.walk(ctx, bro, 0, 2.6, { step: 0.43, swing: 30 })
      T.moveX(ctx, bro, 300, 0, 2.6, 'none')
      for (let k = 0; k < 6; k++) tl.to(bro.aL.sh, { rotation: k % 2 ? 60 : 84, duration: 0.43, ease: 'sine.inOut' }, k * 0.43)
      ctx.sfx(0, 'choir', { gain: 1.4, dur: 2.5, root: 60 })
      ctx.sfx(0, 'ding', { gain: 0.8, midi: 96 })

      // 2.6 — record scratch
      const buff = T.person(ctx, scene, { x: 1500, y: FLOOR, scale: 1.5, shirt: '#2f6df6', hair: 'cap', torsoW: 190, torsoH: 150, armW: 34, legW: 13, leg: [46, 42], headR: 54, arm: [70, 62] })
      const db = T.dumbbell(ctx, buff.aR.hand, { w: 60, h: 34, color: '#ff8ac0' })
      void db
      T.face(ctx, buff, 'happy', 0)
      ctx.sfx(2.6, 'scratch', { gain: 1 })
      tl.to(buff.root, { x: 675 - 1500, duration: 0.16, ease: 'power4.out' }, 2.6)
      ctx.sfx(2.6, 'zip', { gain: 0.8 })
      T.face(ctx, bro, 'blank', 2.66)
      T.pose(ctx, bro, { arms: [10, 4] }, 2.66, 0.1)
      egg.look(-1, -0.6, 2.7)
      // 3.0 — curls. In the squat rack.
      for (let s = 3.0; s < 7.5; s += 0.5) {
        T.pose(ctx, buff, { aR: [-16, -150] }, s, 0.16, 'back.out(2)')
        T.pose(ctx, buff, { aR: [-10, -14] }, s + 0.25, 0.18, 'power2.in')
        ctx.sfx(s, 'squeak', { gain: 0.6, pitch: 76 })
      }
      T.say(ctx, buff, t.hum, 3.1, { x: 650, y: 520, w: 320, size: 52, tail: 0.3, pitch: 50, dur: 0.6, hold: 0.4 })

      // 4.5 — the look
      T.zoom(ctx, scene, 4.5, { x: 300, y: 930, scale: 2.1, dur: 0.14 })
      ctx.sfx(4.5, 'boom', { gain: 0.8 })
      for (const s of [4.9, 5.05, 5.4]) {
        for (const e of bro.eyes.slice(0, 1)) {
          tl.set(e.lid, { y: bro.R * 0.5 }, s)
          tl.set(e.lid, { y: bro.R * 0.25 }, s + 0.07)
        }
        ctx.sfx(s, 'tick', { gain: 0.7 })
      }
      ctx.sfx(4.9, 'crickets', { gain: 1.6, dur: 1.0 })
      T.unzoom(ctx, scene, 6.0, 0.14)
      // 6.1 — he leaves
      T.face(ctx, bro, 'sad', 6.1)
      T.walk(ctx, bro, 6.2, 7.6, { step: 0.2, swing: 14, sound: 'tick', gain: 0.4 })
      T.moveX(ctx, bro, -200, 6.2, 1.4, 'none')
      ctx.sfx(6.2, 'powerdown', { gain: 0.8 })

      T.sign(ctx)
    },
  })
}
