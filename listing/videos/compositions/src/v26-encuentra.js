// Variation 26, the find-it game: a screen full of sets, three seconds on a
// countdown, one of them is the record. Then the answer is ringed, and the
// app shows it had already found it.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'
import * as K from '../../lib/kit.js'

const T = {
  es: { hook: 'Encuentra el récord.<br>Tienes 3 segundos.', here: 'Aquí estaba.', app: 'La app lo encuentra<br>por ti.', ask: '¿Lo viste<br>a tiempo?' },
  en: { hook: 'Find the PR.<br>You have 3 seconds.', here: 'There it was.', app: 'The app finds it<br>for you.', ask: 'Did you spot it<br>in time?' },
}

const CSS = `
.ring { position: absolute; border: 7px solid #e0263a; border-radius: 14px; box-shadow: 0 0 40px rgba(224,38,58,.9); }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 10,
    lang,
    clips: ['workout'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      const list = C.shot(ctx, 'workout')
      const top = C.shot(ctx, 'workout')
      const shots = [list, top]
      C.brandTag(ctx, { y: 1250 })
      ctx.music([
        { at: 0, bars: 2, part: 'build' },
        { at: 4, bars: 3, part: 'drop' },
      ])
      ctx.sfx(0, 'impact', { gain: 0.7 })

      /* ---------- 0:00 the challenge, over the whole list ---------- */
      // The finish screen after it scrolls: every set of the workout.
      C.still(ctx, list, m('workout', 'recap') + 4.5)
      C.cut(ctx, shots, list, 0, C.full(0))
      const dim = ctx.el('div', 'scrim')
      tl.set(dim, { opacity: 0.6 }, 0)
      tl.set(dim, { opacity: 0 }, 1.6)
      const hook = C.label(ctx, t.hook, { y: 310, size: 66 })
      // The hook sits right over the answer, then shrinks out of the way.
      tl.to(hook, { scale: 0.52, y: -160, duration: 0.25, ease: 'expo.out' }, 1.6)
      ctx.sfx(1.6, 'whoosh', { gain: 0.6 })

      /* ---------- 0:01 three seconds ---------- */
      C.progressBar(ctx, { y: 236, at: 1.6, until: 4.6 })
      C.steps(ctx, ['3', '2', '1'], [1.6, 2.6, 3.6], { y: 1010, x: 760, size: 200, out: 4.6 })
      for (let s = 1.6; s < 4.6; s += 0.5) ctx.sfx(s, 'tick', { gain: s >= 3.6 ? 1 : 0.7 })

      /* ---------- 0:04 the answer ---------- */
      const ring = ctx.el('div', 'ring', list.cam)
      Object.assign(ring.style, { left: '58px', top: '306px', width: '300px', height: '58px' })
      tl.set(ring, { opacity: 0 }, 0)
      tl.fromTo(ring, { opacity: 1, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'expo.out', immediateRender: false }, 4.6)
      ctx.sfx(4.6, 'hit', { gain: 1 })
      K.flash(ctx, 4.6, 0.3)
      tl.set(hook, { opacity: 0 }, 4.6)
      C.cam(ctx, list, 4.9, C.frame({ x: 38, y: 180, w: 810, h: 340 }, { cy: 980, fill: 1 }), { dur: 0.5 })
      C.label(ctx, t.here, { y: 330, size: 80, tone: 'red', at: 4.9, out: 6.6 })

      /* ---------- 0:06 the app had it already ---------- */
      C.still(ctx, top, m('workout', 'recap') + 1.4, 6.6)
      C.cut(ctx, shots, top, 6.6, C.frame('recap-top', { cy: 1220, fill: 0.92 }), { sound: 'hit' })
      C.cam(ctx, top, 7.1, C.frame('recap-pr', { cy: 1050, fill: 0.98 }))
      C.label(ctx, t.app, { y: 310, size: 66, at: 6.6, out: 8.4, sound: false })
      C.label(ctx, t.ask, { y: 310, size: 80, at: 8.4 })
    },
  })
}
