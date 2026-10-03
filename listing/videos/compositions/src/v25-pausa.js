// Variation 25, the pause game: the three routine cards of the real list
// flick past ten times a second. Whatever is on screen when you pause is
// today's workout. It never settles, so it loops and gets replayed.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'

const T = {
  es: { hook: 'Pausa el vídeo:<br>hoy te toca…', ask: '¿Qué te tocó?' },
  en: { hook: 'Pause the video:<br>today you train…', ask: 'What did you get?' },
}

const CSS = `
.pointer { position: absolute; top: 846px; width: 0; height: 0; border: 44px solid transparent; z-index: 30; }
.pointer--l { left: 6px; border-left-color: #e0263a; }
.pointer--r { right: 6px; border-right-color: #e0263a; }
`

// The routine cards on the list screen (clip pixels).
const CARDS = [
  { x: 40, y: 146, w: 806, h: 253 },
  { x: 40, y: 420, w: 806, h: 250 },
  { x: 40, y: 696, w: 806, h: 250 },
]

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 8,
    lang,
    clips: ['workout'],
    build(ctx) {
      const { tl } = ctx
      C.style(CSS)
      C.backdrop(ctx)
      C.brandTag(ctx)
      ctx.music([{ at: 0, bars: 4, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.7 })

      C.label(ctx, t.hook, { y: 320, size: 80 })

      const win = C.pane(ctx, 'workout', { x: 60, y: 740, w: 960, h: 300, radius: 30 })
      C.still(ctx, win, 0.45)
      const frames = CARDS.map((rect) => C.frameIn(win, rect))
      gsap.set(win.cam, frames[0])
      ctx.el('div', 'pointer pointer--l')
      ctx.el('div', 'pointer pointer--r')

      // A fixed shuffle (the render must be identical every time), never the
      // same card twice in a row.
      let seed = 7
      let last = 0
      const STEP = 0.1
      for (let s = 0.6, i = 0; s < 8; s += STEP, i++) {
        seed = (seed * 1103515245 + 12345) % 2147483648
        const next = (last + 1 + (seed >> 8) % 2) % 3
        last = next
        tl.set(win.cam, frames[next], s)
        ctx.sfx(s, 'tick', { gain: 0.6 })
        if (i % 8 === 0) ctx.sfx(s, 'pop', { gain: 0.6 })
      }
      tl.fromTo(win.root, { scale: 1.04 }, { scale: 1, duration: 0.3, ease: 'expo.out', immediateRender: false }, 0.6)

      C.label(ctx, t.ask, { y: 1110, size: 84, tone: 'red', align: 'center', at: 5.4, sound: 'hit' })
      ctx.sfx(0.1, 'riser', { dur: 0.5, gain: 0.5 })
    },
  })
}
