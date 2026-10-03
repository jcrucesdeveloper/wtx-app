// Variation 30, "rate my…": the routine, one exercise at a time, the camera
// stepping down the list with a frame around the current one. Then a row of
// scores from 1 to 10 and the question.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'

const T = {
  es: {
    hook: 'Puntúa mi rutina de push<br>del 1 al 10',
    notes: ['El clásico.', 'Hombros de verdad.', 'Pecho alto.', 'Tríceps, obvio.', 'Y el remate.'],
    ask: '¿Qué nota<br>le pones?',
  },
  en: {
    hook: 'Rate my push routine<br>from 1 to 10',
    notes: ['The classic.', 'Real shoulders.', 'Upper chest.', 'Triceps, obviously.', 'And the finisher.'],
    ask: "What's your<br>score?",
  },
}

const CSS = `
.focus { position: absolute; left: 22px; top: 908px; width: 1036px; height: 190px; box-sizing: border-box; border: 8px solid #e0263a; border-radius: 22px;
  box-shadow: 0 0 0 2000px rgba(0,0,0,.5); z-index: 20; }
.score { position: absolute; top: 560px; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%;
  background: #f6f8fa; color: #0b0d0f; font-weight: 900; font-size: 36px; z-index: 30; }
`

/** Exercise row `i` on the routine screen (clip pixels). */
const row = (i) => ({ x: 41, y: 298 + 150 * i, w: 804, h: 134 })

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
      C.still(ctx, r, m('routine', 'detail') + 1.5)
      const all = C.frame({ x: 41, y: 60, w: 804, h: 1000 }, { cy: 1130, fill: 0.84 })
      C.cut(ctx, [r], r, 0, all)
      C.brandTag(ctx)
      ctx.music([{ at: 0, bars: 6, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.7 })

      C.label(ctx, t.hook, { y: 310, size: 60, out: 1.8 })
      tl.to(r.cam, { scale: all.scale * 1.03, x: all.x - 14, y: all.y - 20, duration: 1.8, ease: 'none' }, 0)

      /* ---------- 0:01 one exercise at a time ---------- */
      const focus = ctx.el('div', 'focus')
      tl.set(focus, { opacity: 0 }, 0)
      tl.set(focus, { opacity: 1 }, 1.8)
      tl.set(focus, { opacity: 0 }, 8.8)
      t.notes.forEach((note, i) => {
        const at = 1.8 + i * 1.4
        C.cam(ctx, r, at, C.frame(row(i), { cy: 1003, fill: 0.94 }), { dur: 0.35 })
        tl.fromTo(focus, { scale: 1.06 }, { scale: 1, duration: 0.3, ease: 'expo.out', immediateRender: false }, at + 0.1)
        ctx.sfx(at + 0.1, 'hit', { gain: 0.6 })
        C.label(ctx, `${i + 1}/5`, { y: 330, size: 60, tone: 'red', at, out: at + 1.4, sound: false })
        C.label(ctx, note, { y: 330, x: 250, size: 60, at: at + 0.15, out: at + 1.4 })
      })

      /* ---------- 0:08 the score ---------- */
      C.cam(ctx, r, 8.8, C.frame({ x: 41, y: 60, w: 804, h: 1000 }, { cy: 1270, fill: 0.8 }), { dur: 0.5 })
      C.label(ctx, t.ask, { y: 300, size: 80, at: 8.8 })
      for (let n = 1; n <= 10; n++) {
        const el = ctx.el('div', 'score', ctx.stage, String(n))
        el.style.left = 96 + (n - 1) * 82 + 'px'
        C.appear(ctx, el, 9.3 + (n - 1) * 0.14, { from: { y: 40, scale: 0.4 }, dur: 0.22, sound: 'tick' })
        if (n === 10) tl.to(el, { background: '#e0263a', color: '#fff', scale: 1.25, duration: 0.25, ease: 'back.out(3)' }, 11)
      }
      ctx.sfx(11, 'confirm', { gain: 0.8 })
    },
  })
}
