// Variation 27, the hidden feature: the screen is dark except for a
// spotlight that searches it, settles on a tiny link, and opens up when the
// link is tapped.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'

const T = {
  es: {
    hook: 'La función escondida<br>de mi app de gym',
    link: '¿Ves este enlace diminuto?',
    text: 'Tu rutina es<br>texto plano.',
    uses: 'Cópialo. Edítalo.<br>Pásaselo a quien quieras.',
    ask: '¿Tu app te deja<br>ver esto?',
  },
  en: {
    hook: 'The hidden feature<br>in my gym app',
    link: 'See this tiny link?',
    text: 'Your routine is<br>plain text.',
    uses: 'Copy it. Edit it.<br>Send it to anyone.',
    ask: 'Does your app<br>let you see this?',
  },
}

const CSS = `
.spot { position: absolute; inset: 0; z-index: 20; }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 12,
    lang,
    clips: ['routine'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      const r = C.shot(ctx, 'routine')
      const view = C.full(330)
      C.cut(ctx, [r], r, 0, view)
      C.still(ctx, r, m('routine', 'detail') + 1.5)
      C.brandTag(ctx)
      ctx.music([
        { at: 0, bars: 2, part: 'break' },
        { at: 4, bars: 4, part: 'drive' },
      ])
      ctx.sfx(0, 'riser', { dur: 2.4, gain: 0.4 })

      /* ---------- the spotlight ---------- */
      const spot = ctx.el('div', 'spot')
      const s = { x: 720, y: 780, r: 190 }
      const draw = () => {
        spot.style.background = `radial-gradient(circle at ${s.x}px ${s.y}px, transparent 0, transparent ${s.r}px, rgba(0,0,0,0.92) ${s.r + 80}px)`
      }
      draw()
      const move = (to, at, dur, ease = 'sine.inOut') => tl.to(s, { ...to, duration: dur, ease, onUpdate: draw }, at)
      // Where the link is on the stage with this framing.
      const tap = m('routine', 'show-source')
      const link = { x: 128 * view.scale + view.x + 30, y: 1175 * view.scale + view.y }
      move({ x: 300, y: 620 }, 0, 0.8)
      move({ x: 760, y: 940 }, 0.8, 0.8)
      move({ ...link, r: 130 }, 1.6, 0.8)

      C.label(ctx, t.hook, { y: 310, size: 62, out: 2.4 })
      C.label(ctx, t.link, { y: 330, size: 58, at: 2.4, out: 4.1 })
      tl.to(s, { r: 105, duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut', onUpdate: draw }, 2.5)

      /* ---------- 0:04 tapped: it opens up ---------- */
      const seg = { at: 4, from: tap - 0.15, to: tap + 1.6, speed: 1 }
      C.play(ctx, r, seg)
      move({ r: 2400 }, 4.15, 0.6, 'expo.out')
      ctx.sfx(4.15, 'whoosh', { gain: 0.7 })
      C.label(ctx, t.text, { y: 310, size: 72, tone: 'red', at: 4.2, out: 6.6 })

      /* ---------- 0:06 closer ---------- */
      C.cam(ctx, r, 6.6, C.frame('source', { cy: 1040, fill: 0.99 }), { dur: 0.5 })
      C.label(ctx, t.uses, { y: 310, size: 58, at: 6.6, out: 9.6 })
      tl.to(r.cam, { y: '-=30', duration: 2.6, ease: 'none' }, 7.1)

      /* ---------- 0:09 the question ---------- */
      C.label(ctx, t.ask, { y: 310, size: 72, at: 9.6 })
    },
  })
}
