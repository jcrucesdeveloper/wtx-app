// C06 — "One more!". A lie, repeated: every rep is the last one, the tally of
// "last ones" grows, the lifter leaves his body, and the trainer says it to
// the ghost. (Research 11: the same beat heightened each time, then a twist
// that is the logical extreme of the premise.)

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: '«¡Una más!»', board: 'ÚLTIMAS:', lines: ['¡UNA MÁS!', '¡ÚLTIMA!', '¡LA ÚLTIMA!', '¡AHORA SÍ!', '¡ÚLTIMA!'], ghost: '¡UNA MÁS!' },
  en: { cap: '“One more!”', board: 'LAST ONES:', lines: ['ONE MORE!', 'LAST ONE!', 'LAST ONE!!', 'FOR REAL!', 'LAST ONE!'], ghost: 'ONE MORE!' },
}
const FLOOR = 1400
const R = 1.1

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 9.2,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)
      const egg = T.egg(ctx, scene, { x: 470, y: 1338 })
      egg.look(1, -0.4, 0)

      // the tally of "last ones"
      const board = T.box(ctx, scene, { x: 640, y: 470, w: 370, h: 200, fill: '#fff', r: 14 })
      T.ink(ctx, board, t.board, { x: 22, y: 8, size: 46 })
      const marks = []
      for (let i = 0; i < 5; i++) {
        const m = i < 4
          ? node(ctx, '', board, { position: 'absolute', left: 40 + i * 50 + 'px', top: '78px', width: '12px', height: '92px', background: T.INK, borderRadius: '6px', transform: `rotate(${(i % 2 ? 4 : -5)}deg)` })
          : node(ctx, '', board, { position: 'absolute', left: '20px', top: '118px', width: '220px', height: '12px', background: '#e0263a', borderRadius: '6px', transform: 'rotate(-24deg)' })
        tl.set(m, { opacity: 0 }, 0)
        marks.push(m)
      }

      const coach = T.person(ctx, scene, { x: 230, y: FLOOR, scale: 1.4, shirt: '#f7c52b', hair: 'cap' })
      T.face(ctx, coach, 'angry', 0, { mouth: 'grin', flush: 0 })

      const bro = T.person(ctx, scene, { x: 730, y: FLOOR, scale: 1.45, hair: 'band' })
      const bar = T.barbell(ctx, bro.tor, { w: 430, plates: [[124, '#e0263a'], [98, '#2f6df6']], x: 0, y: -128 })
      bro.tor.insertBefore(bar, bro.neck)
      const HOLD = { arms: [62, 118] }
      T.poseNow(bro, HOLD)
      const DOWN = { legs: [76, -66] }
      const UP = { legs: [3, 0] }

      const faces = ['focus', 'strain', 'strain', 'sad', 'sad']
      for (let k = 0; k < 5; k++) {
        const at = k * R
        // the shout
        T.say(ctx, coach, t.lines[k], at, { x: 60 + (k % 2) * 30, y: 500 - (k % 2) * 30, w: 440, size: 66, tail: 0.4, loud: true, dur: 0.4, hold: 0.35, pitch: 50 })
        T.pose(ctx, coach, { aR: [-160, -20] }, at, 0.1, 'back.out(3)')
        T.pose(ctx, coach, { aR: [-10, -4] }, at + 0.5, 0.15)
        // the rep
        T.face(ctx, bro, faces[k], at)
        T.pose(ctx, bro, DOWN, at + 0.12, 0.25, 'power2.in')
        T.pose(ctx, bro, UP, at + 0.5, 0.42 + k * 0.03, 'power2.out')
        ctx.sfx(at + 0.37, 'squeak', { gain: 0.6, pitch: 70 - k * 2, down: true })
        if (k >= 1) T.tremble(ctx, bro.tor, at + 0.5, at + 0.95, 2 + k * 1.4, k + 1)
        if (k >= 1) T.sweat(ctx, bro, at + 0.5, 2 + k, k)
        if (k === 3) T.cry(ctx, bro, at + 0.1, 5.6)
        // the tally
        tl.set(marks[k], { opacity: 1 }, at + 0.92)
        ctx.sfx(at + 0.92, 'tick', { gain: 1 })
      }
      egg.look(1, -1, 3.3)

      // 5.5 — he does not get up from this one
      const tEnd = 5 * R
      T.say(ctx, coach, t.lines[0], tEnd, { x: 60, y: 500, w: 440, size: 66, tail: 0.4, loud: true, dur: 0.4, hold: 0.35, pitch: 50 })
      T.pose(ctx, bro, DOWN, tEnd + 0.12, 0.25, 'power2.in')
      T.face(ctx, bro, 'dead', tEnd + 0.4)
      T.pose(ctx, bro, { hip: 118, legs: [88, -20], lean: 14, head: 20 }, tEnd + 0.4, 0.16, 'power3.in')
      ctx.sfx(tEnd + 0.56, 'boom', { gain: 0.9 })
      ctx.sfx(tEnd + 0.56, 'plate', { gain: 0.8 })
      tl.fromTo(scene, { y: 20 }, { y: 0, duration: 0.35, ease: 'elastic.out(1,0.3)', immediateRender: false }, tEnd + 0.56)
      egg.hop(tEnd + 0.56)

      // 6.2 — the soul leaves the building
      const ghost = T.person(ctx, scene, { x: 730, y: FLOOR - 40, scale: 1.45, shirt: '#ffffff', hair: 'band' })
      gsap.set(ghost.root, { opacity: 0 })
      node(ctx, '', ghost.head, { position: 'absolute', left: '15px', top: '-44px', width: '110px', height: '30px', borderRadius: '50%', border: '8px solid #f7c52b', boxSizing: 'border-box' })
      T.face(ctx, ghost, 'blank', 0)
      tl.set(ghost.root, { opacity: 0.62 }, 6.2)
      tl.to(ghost.root, { y: -470, duration: 1.0, ease: 'power1.out' }, 6.2)
      ctx.sfx(6.2, 'choir', { gain: 1.1, dur: 1.2, root: 67 })
      T.face(ctx, coach, 'up', 7.0, { pupil: [0.8, -0.8] })

      // 7.5 — the logical extreme
      T.face(ctx, coach, 'angry', 7.5, { mouth: 'grin', pupil: [0.8, -0.8] })
      T.say(ctx, coach, t.ghost, 7.5, { x: 60, y: 470, w: 460, size: 72, tail: 0.4, loud: true, dur: 0.45, hold: 1.0, pitch: 50 })
      T.pose(ctx, coach, { aR: [-150, -10] }, 7.5, 0.1, 'back.out(3)')
      ctx.sfx(7.5, 'boom', { gain: 0.8 })
      T.face(ctx, ghost, 'sad', 7.9)
      for (const s of [8.1, 8.6]) {
        T.pose(ctx, ghost, DOWN, s, 0.2, 'power2.in')
        T.pose(ctx, ghost, UP, s + 0.22, 0.24, 'power2.out')
        ctx.sfx(s + 0.2, 'squeak', { gain: 0.7, pitch: 88 })
      }

      ctx.music([{ at: 0, bars: 2, part: 'cartoon', gain: 0.28 }])
      T.sign(ctx)
    },
  })
}
