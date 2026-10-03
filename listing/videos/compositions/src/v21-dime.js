// Variation 21, "tell me… without telling me": the line types itself out,
// "I'll go first", then a hard cut to a month of trained days. No
// explanation: the screen is the punchline.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'
import * as K from '../../lib/kit.js'

const T = {
  es: {
    hook: 'Dime que vas al gym *sin* decirme que vas al gym.',
    first: 'Empiezo yo:',
    quiet: 'Sin decir nada.',
    turn: 'Te toca.',
  },
  en: {
    hook: 'Tell me you lift *without* telling me you lift.',
    first: "I'll go first:",
    quiet: "Didn't say a word.",
    turn: 'Your turn.',
  },
}

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 8,
    lang,
    clips: ['history'],
    build(ctx) {
      const { m, tl } = ctx
      C.backdrop(ctx)
      const month = C.shot(ctx, 'history')
      const list = C.shot(ctx, 'history')
      const shots = [month, list]
      const tag = C.brandTag(ctx)
      ctx.music([
        { at: 0, bars: 1, part: 'break' },
        { at: 2, bars: 3, part: 'drop' },
      ])
      ctx.sfx(0, 'impact', { gain: 0.6 })
      ctx.sfx(2.2, 'riser', { dur: 1, gain: 0.5 })

      /* ---------- 0:00 the line ---------- */
      C.words(ctx, t.hook, { at: 0, per: 0.17, y: 340, size: 100, out: 3.2, first: 5 })
      C.label(ctx, t.first, { y: 1060, size: 72, tone: 'red', at: 2.4, out: 3.2 })

      /* ---------- 0:03 the answer ---------- */
      C.still(ctx, month, m('history', 'prev-month') + 0.9)
      const view = C.frame('calendar', { cy: 900, fill: 0.98 })
      C.cut(ctx, shots, month, 3.2, view, { sound: 'hit' })
      K.flash(ctx, 3.2, 0.5)
      C.punch(ctx, month, 3.2, 1.12)
      tl.to(month.cam, { scale: view.scale * 1.1, x: view.x - 54, y: view.y - 60, duration: 2.4, ease: 'none' }, 3.25)
      tl.set(tag, { opacity: 0 }, 3.2)

      /* ---------- 0:05 and the list goes on ---------- */
      const from = m('history', 'calendar') + 2.5
      C.cut(ctx, shots, list, 5.6, C.full(0), { sound: 'hit' })
      C.play(ctx, list, { at: 5.6, from, to: from + 1.9, speed: 1.9 / 2.4 }, { sound: false })
      C.label(ctx, t.quiet, { y: 330, size: 66, at: 5.6, sound: false })
      C.label(ctx, t.turn, { y: 450, size: 80, tone: 'red', at: 6.6 })
    },
  })
}
