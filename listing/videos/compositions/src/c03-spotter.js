// C03 — "All you, bro". Irony: the spotter does the whole lift with one hand
// while looking at his phone; the lifter takes the credit; the spotter leaves;
// the bar wins. Then the spotter congratulates him anyway. (Research 11: the
// most-shared spotter joke, heightened, with a button after the button.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'

const TXT = {
  es: { cap: '«Todo tú, bro»', all: 'todo tú', me: '¡¡SOLO!!', under: '…todo yo.', nice: '¡buena, bro!' },
  en: { cap: '“All you, bro”', all: 'all you', me: 'ALL ME!!', under: '…all me.', nice: 'nice one, bro!' },
}

const FLOOR = 1400

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.4,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)
      const egg = T.egg(ctx, scene, { x: 110, y: 1338 })
      egg.look(1, -0.6, 0)

      const bro = T.person(ctx, scene, { x: 400, y: FLOOR, scale: 1.45, hair: 'band' })
      const sp = T.person(ctx, scene, { x: 800, y: FLOOR, scale: 1.75, shirt: '#2f6df6', hair: 'cap', torsoW: 170, torsoH: 150, armW: 30, legW: 13, leg: [46, 42], headR: 54, arm: [72, 66] })

      const STUCK = { arms: [48, 132] }
      const TOPP = { arms: [168, 8] }
      const yStuck = T.hands(ctx, bro, STUCK).L.y
      const yTop = T.hands(ctx, bro, TOPP).L.y
      const bar = T.barbell(ctx, scene, { w: 640, plates: [[190, '#e0263a'], [150, '#2f6df6']], x: 400, y: yStuck })

      // the spotter: phone in one hand, one hand "helping"
      T.box(ctx, sp.aR.hand, { x: -20, y: -56, w: 40, h: 64, fill: '#22262d', r: 8, border: 5 })
      T.poseNow(sp, { aR: [-28, -138], aL: [100, 40] })
      T.face(ctx, sp, 'blank', 0, { pupil: [0.8, 0.5] })

      // 0.0 — stuck
      T.poseNow(bro, STUCK)
      T.face(ctx, bro, 'strain', 0)
      T.tremble(ctx, bro.tor, 0, 0.6, 4, 1)
      T.tremble(ctx, bar, 0, 0.6, 4, 2)
      T.sweat(ctx, bro, 0.05, 4, 1)
      ctx.sfx(0, 'blab', { dur: 0.5, pitch: 48, seed: 2, gain: 1 })
      ctx.sfx(0, 'clack', { gain: 0.7 })

      // 0.5 — "all you" …while he lifts it
      T.say(ctx, sp, t.all, 0.5, { x: 600, y: 470, w: 330, size: 58, tail: 0.6, pitch: 46, dur: 0.5, hold: 0.9 })
      tl.to(bar, { y: yTop, duration: 0.9, ease: 'power1.inOut' }, 0.65)
      T.pose(ctx, bro, TOPP, 0.65, 0.9, 'power1.inOut')
      T.pose(ctx, sp, { aL: [160, 14] }, 0.65, 0.9, 'power1.inOut')
      ctx.sfx(0.65, 'riser', { dur: 0.9, gain: 0.4 })
      T.face(ctx, bro, 'wow', 1.3)

      // 1.6 — the credit
      T.face(ctx, bro, 'happy', 1.6)
      T.say(ctx, bro, t.me, 1.6, { x: 90, y: 480, w: 420, size: 78, tail: 0.6, loud: true, dur: 0.55, hold: 0.7 })
      ctx.sfx(1.62, 'tada', { gain: 0.9 })

      // 2.7 — a notification. He wanders off.
      ctx.sfx(2.6, 'ding', { gain: 0.9, midi: 96 })
      T.pose(ctx, sp, { aL: [14, 6] }, 2.75, 0.14)
      T.walk(ctx, sp, 2.85, 3.65, { step: 0.16, swing: 16 })
      T.moveX(ctx, sp, 1400, 2.85, 0.8, 'power1.in')
      tl.to(bar, { y: yTop + 26, duration: 0.14, ease: 'power2.in' }, 2.75)
      T.face(ctx, bro, 'worry', 2.78)
      T.tremble(ctx, bar, 2.9, 3.7, 6, 5, { x: 400, y: yTop + 26 })
      T.tremble(ctx, bro.tor, 2.9, 3.7, 5, 6)
      // 3.3 — the realisation (the beat)
      T.face(ctx, bro, 'shock', 3.3)
      egg.look(1, -1, 3.3)

      // 3.7 — the bar wins
      tl.to(bar, { y: FLOOR - 95, duration: 0.16, ease: 'power3.in' }, 3.7)
      tl.to(bro.root, { scaleY: 0.3, scaleX: 2.2, duration: 0.08, ease: 'power4.in' }, 3.8)
      T.face(ctx, bro, 'dead', 3.82)
      ctx.sfx(3.86, 'boom', { gain: 1 })
      ctx.sfx(3.86, 'plate', { gain: 0.9 })
      T.pow(ctx, scene, 3.86, { x: 400, y: FLOOR - 60, r: 240, n: 10 })
      tl.fromTo(scene, { y: 26 }, { y: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', immediateRender: false }, 3.86)
      egg.hop(3.86)

      // 4.6 — from underneath
      T.say(ctx, null, t.under, 4.6, { x: 150, y: 1090, w: 380, size: 50, tail: 0.5, pitch: 60, dur: 0.5, hold: 0.9 })
      // 5.2 — and from off screen, the spotter, proud
      T.say(ctx, null, t.nice, 5.2, { x: 660, y: 900, w: 400, size: 54, tail: 0.92, pitch: 46, dur: 0.5, hold: 1.2 })

      ctx.music([{ at: 0, bars: 1, part: 'cartoon', gain: 0.3 }])
      T.sign(ctx)
    },
  })
}
