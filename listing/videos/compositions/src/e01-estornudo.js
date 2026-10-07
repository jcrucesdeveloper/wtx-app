// E01 — "Sneezing the day after abs" (the joke of d01, re-animated on the cel
// engine: research 13). Frame 0 is a face filling the screen, mid "ah—"; the
// sneeze folds him in half at 1.0 s; the second one puts him through the wall,
// and the reel ends on a third "ah—" so it loops.

import { composition } from '../../lib/engine.js'
import { cel, draw, PAL } from '../../lib/cel.js'

const TXT = {
  es: { cap: 'Estornudar al día siguiente de abdominales:', cap2: '…y viene otro.', ah: 'a… a…', achu: '¡ACHÚ!', ay: '¡¡AY!!', ow: 'ay.' },
  en: { cap: 'Sneezing the day after abs:', cap2: '…and here comes another.', ah: 'ah… ah…', achu: 'ACHOO!', ay: 'OW!!', ow: 'ow.' },
}

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
      const C = cel(ctx, { room: 'mint' })
      const F = C.floorY
      C.caption(t.cap, { size: 62 })
      C.caption(t.cap2, { size: 62, y: 452, at: 3.0, sound: 'bonk', pop: true })

      // the wall he is about to meet
      C.sprite((g) => {
        draw.box(g, { x: 0, y: 0, w: 260, h: 1000, fill: PAL.wood, r: 0, shadow: false })
        for (let i = 1; i < 10; i++) draw.E('path', { d: `M0 ${i * 100} H260 M${i % 2 ? 90 : 170} ${i * 100} v100`, stroke: PAL.ink, 'stroke-width': 7, opacity: 0.45 }, g)
        draw.E('rect', { x: 0, y: 0, width: 46, height: 1000, fill: PAL.ink, opacity: 0.14 }, g)
      }, { x: 880, y: F - 1000, layer: 'back' })
      const hole = C.sprite((g) => {
        draw.E('path', { d: 'M-150 -60 L-110 -190 L-40 -150 L20 -250 L70 -160 L150 -180 L120 -40 L180 60 L100 110 L120 220 L20 180 L-50 250 L-80 130 L-170 110 L-120 20 Z', fill: PAL.ink }, g)
      }, { x: 990, y: F - 420, layer: 'back', a: 0 })
      const egg = C.egg({ x: 110 })
      egg.look(1, -0.6)

      const bro = C.person({ x: 470, sc: 2.0 })
      const s = bro.s
      // hugging his abs
      const HUG = { hLx: 34, hLy: -52, hRx: -34, hRy: -40 }
      Object.assign(s, HUG, C.FACES.shock, { bl: -20, br: -20, ht: 0, ly: -0.5, tears: 0.5 })

      const spit = (at, dir) => C.fx.puff(at, dir > 0 ? 300 : 640, 900, { n: 7, size: 0.7, spread: 2.2, dur: 0.4, color: '#dff6ff' })

      // 0.0 — a face, far too close, about to go
      C.cam.closeup({ x: 470, y: 740, scale: 2.1 })
      C.to(bro, { ht: -24, hy: -22, by: -10, mo: 26, lid: 0.55 }, 0, 0.8, 'power1.in')
      C.shiver(bro, 0.3, 0.95, 4)
      ctx.sfx(0, 'blab', { dur: 0.7, pitch: 66, seed: 3, gain: 1, rise: 9 })
      ctx.sfx(0, 'riser', { dur: 0.95, gain: 0.5 })
      C.cam.reset(0.78, 0.2)

      // 1.0 — the sneeze. And the abs.
      C.face(bro, 'panic', 1.0, { lid: 0 }, 0.04)
      C.to(bro, { ht: 34, hy: 60, by: 46, lean: 16, sqy: 0.6, sqx: 1.3, tears: 1 }, 1.0, 0.07, 'power4.in')
      C.to(bro, { sqy: 0.74, sqx: 1.2 }, 1.07, 0.3, 'elastic.out(1.2,0.4)')
      ctx.sfx(1.0, 'sneeze', { gain: 1 })
      spit(1.0, 1)
      C.cam.shake(1.0, 26, 0.3)
      C.fx.stars(1.04, 470, 1010, { r: 300, n: 11 })
      C.ono(t.achu, 1.02, { x: 540, y: 640, size: 210, rotate: -7, hold: 0.35 })
      C.say(bro, t.ay, 1.75, { x: 90, y: 560, w: 330, size: 110, tail: 0.8, loud: true, dur: 0.4, hold: 0.3 })
      C.shiver(bro, 1.2, 2.2, 5)
      egg.hop(1.0)

      // 2.3 — he unfolds, carefully
      C.face(bro, 'sad', 2.3, { tears: 1 })
      C.to(bro, { ht: 0, hy: 0, by: 0, lean: 0, sqy: 1, sqx: 1 }, 2.3, 0.6, 'power1.inOut')
      for (const k of [2.35, 2.55, 2.75]) ctx.sfx(k, 'squeak', { gain: 0.6, pitch: 78 })

      // 3.0 — the second hook: no. No no no.
      C.face(bro, 'shock', 3.0, { bl: -20, br: -20, ly: -0.5, tears: 0.6 })
      C.cam.zoom(3.0, { x: 470, y: 830, scale: 1.5, dur: 0.14 })
      C.to(bro, { ht: -26, hy: -24, by: -12, mo: 28, lid: 0.55 }, 3.1, 1.0, 'power1.in')
      C.say(bro, t.ah, 3.15, { x: 600, y: 640, w: 320, size: 64, tail: 0.25, pitch: 66, dur: 0.6, hold: 0.3 })
      C.shiver(bro, 3.2, 4.15, 5)
      ctx.sfx(3.2, 'riser', { dur: 1.0, gain: 0.6 })
      C.fx.sweat(bro, 3.5, { n: 5 })
      egg.look(1, -1, 3.2)
      C.cam.reset(4.08, 0.12)

      // 4.2 — the peak: he leaves through the wall
      C.face(bro, 'panic', 4.2, { lid: 0 }, 0.04)
      C.to(bro, { ht: 34, hy: 40, sqy: 0.7, sqx: 1.25, hLx: -150, hLy: -90, hRx: 150, hRy: -90 }, 4.2, 0.06, 'power4.in')
      ctx.sfx(4.2, 'sneeze', { gain: 1.1, pitch: 74 })
      ctx.sfx(4.22, 'rocket', { gain: 0.9, dur: 0.25 })
      spit(4.2, -1)
      C.ono(t.achu, 4.22, { x: 400, y: 700, size: 240, rotate: 6, hold: 0.3, color: PAL.coral })
      C.to(bro, { x: 1000, jy: 260, rot: 70 }, 4.24, 0.18, 'power2.in')
      tl.set(s, { a: 0 }, 4.42)
      tl.set(hole.s, { a: 1 }, 4.42)
      C.fx.puff(4.42, 960, F - 420, { n: 8, size: 1.5, spread: 1.6, dur: 0.7, color: PAL.paper })
      C.fx.stars(4.42, 960, F - 420, { r: 320, n: 12 })
      C.fx.flash(4.42, { a: 0.7 })
      ctx.sfx(4.42, 'boom', { gain: 1 })
      ctx.sfx(4.44, 'crack', { gain: 1 })
      C.cam.shake(4.42, 40, 0.4)
      egg.hop(4.42)
      egg.look(1, 0, 4.5)
      // 5.1 — from inside the wall
      C.say(null, t.ow, 5.1, { x: 640, y: 760, w: 220, size: 64, tail: 0.85, pitch: 60, dur: 0.25, hold: 0.45 })
      // 5.8 — and the loop: here comes the next one
      C.say(null, t.ah, 5.8, { x: 560, y: 740, w: 320, size: 64, tail: 0.9, pitch: 66, dur: 0.6, hold: 0.2 })

      ctx.music([{ at: 0, bars: 1, part: 'cartoon', gain: 0.22 }])
    },
  })
}
