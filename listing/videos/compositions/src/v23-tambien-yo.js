// Variation 23, the "Me: / Also me:" meme: a white caption bar over the
// footage, like every meme since forever. Panel one is the plan, panel two
// is what actually happened, played in real time.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'
import * as K from '../../lib/kit.js'

const T = {
  es: { me: 'Yo: hoy entreno suave.', also: 'También yo:', ask: '¿Quién más? 🙋' },
  en: { me: "Me: I'll take it easy today.", also: 'Also me:', ask: 'Who else? 🙋' },
}

const CSS = `
.meme-bar { position: absolute; left: 0; top: 0; width: 1080px; height: 560px; background: #fff; z-index: 28; }
.meme { position: absolute; left: 90px; width: 810px; top: 310px; z-index: 30; color: #0b0d0f;
  font-weight: 900; font-size: 80px; line-height: 1.1; letter-spacing: -0.03em; }
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
      const w = C.shot(ctx, 'workout')
      const r = C.shot(ctx, 'workout')
      const shots = [w, r]
      ctx.el('div', 'meme-bar')
      ctx.music([{ at: 0, bars: 5, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.6 })

      const line = (text, at, out) => {
        const el = ctx.el('div', 'meme', ctx.stage, text)
        if (at > 0) tl.set(el, { opacity: 0 }, 0)
        tl.set(el, { opacity: 1 }, at)
        if (out !== undefined) tl.set(el, { opacity: 0 }, out)
      }

      const session = m('workout', 'session')
      const weight = m('workout', 'weight')
      const tick = m('workout', 'pr-set')
      const card = C.frame('session-card', { cy: 1180 })

      /* ---------- 0:00 the plan ---------- */
      line(t.me, 0, 3.2)
      C.cut(ctx, shots, w, 0, card)
      C.play(ctx, w, { at: 0, from: session + 0.1, to: weight - 0.1, speed: (weight - session - 0.2) / 3.2 }, { sound: false })
      tl.fromTo(w.cam, { ...card }, { scale: card.scale * 1.06, x: card.x - 32, y: card.y - 70, duration: 3.2, ease: 'none', immediateRender: false }, 0)

      /* ---------- 0:03 what happened ---------- */
      line(t.also, 3.2, 8)
      ctx.sfx(3.2, 'hit', { gain: 0.9 })
      tl.set(w.cam, { ...card }, 3.2)
      const live = { at: 3.2, from: weight - 0.1, to: weight + 1.9, speed: 1 }
      C.play(ctx, w, live)
      ctx.sfx(ctx.at(live, tick), 'confirm', { gain: 0.8 })
      C.cam(ctx, w, ctx.at(live, tick), C.frame('set-head', { cy: 1100, fill: 1 }))

      /* ---------- 0:06 and the app noticed ---------- */
      C.still(ctx, r, m('workout', 'recap') + 1.4, 6)
      C.cut(ctx, shots, r, 6, C.frame('recap-pr', { cy: 1150, fill: 0.98 }), { sound: 'hit' })
      K.flash(ctx, 6, 0.5)
      C.punch(ctx, r, 6, 1.12)
      K.shake(ctx, r.root, 6.02, 12)
      tl.to(r.cam, { scale: '+=0.08', x: '-=36', y: '-=40', duration: 4, ease: 'none' }, 6.3)

      /* ---------- 0:08 the question ---------- */
      line(t.ask, 8)
      ctx.sfx(8, 'pop', { gain: 0.8 })
    },
  })
}
