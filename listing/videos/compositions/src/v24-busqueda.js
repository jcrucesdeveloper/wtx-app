// Variation 24, the search bar: a question being typed, suggestions dropping
// down under it, the last one tapped. Then the answer is the app, in real
// time. A generic search box, not any real one's look.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'
import * as K from '../../lib/kit.js'

const T = {
  es: {
    typed: 'cómo anotar ',
    rest: 'mis series sin perder tiempo',
    options: ['…en una libreta', '…en las notas del móvil', '…en un Excel', '…con un toque'],
    tap: 'Con un toque.',
    filled: 'Y ya trae tu último peso.',
    total: '16 series. 16 segundos.',
    ask: '¿Tú cómo<br>las anotas?',
  },
  en: {
    typed: 'how to log ',
    rest: 'my sets without wasting time',
    options: ['…in a notebook', '…in my notes app', '…in a spreadsheet', '…with one tap'],
    tap: 'One tap.',
    filled: 'Your last weights are already in.',
    total: '16 sets. 16 seconds.',
    ask: 'How do you<br>log yours?',
  },
}

const CSS = `
.search { position: absolute; left: 70px; top: 330px; width: 940px; height: 132px; box-sizing: border-box; padding: 0 44px 0 118px;
  display: flex; align-items: center; border-radius: 66px; background: #fff; color: #0b0d0f; font-weight: 600; font-size: 42px;
  letter-spacing: -0.02em; white-space: pre; box-shadow: 0 20px 60px rgba(0,0,0,.6); z-index: 30; }
.search::before { content: ''; position: absolute; left: 46px; top: 40px; width: 34px; height: 34px; border: 7px solid #74818f; border-radius: 50%; }
.search::after { content: ''; position: absolute; left: 84px; top: 82px; width: 22px; height: 7px; border-radius: 4px; background: #74818f; transform: rotate(45deg); }
.search .caret { display: inline-block; width: 4px; height: 1.1em; margin-left: 4px; background: #e0263a; vertical-align: -0.18em; }
.option { position: absolute; left: 100px; width: 880px; height: 112px; box-sizing: border-box; padding: 0 40px; display: flex; align-items: center;
  border-radius: 24px; background: #1b2128; color: #aebac6; font-weight: 600; font-size: 46px; letter-spacing: -0.02em; z-index: 29; }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 12,
    lang,
    clips: ['workout'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      C.backdrop(ctx)
      const w = C.shot(ctx, 'workout')
      const r = C.shot(ctx, 'workout')
      const shots = [w, r]
      const band = C.topBand(ctx, 520)
      tl.set(band, { opacity: 0 }, 0)
      tl.set(band, { opacity: 1 }, 4.4)
      C.brandTag(ctx)
      ctx.music([
        { at: 0, bars: 2, part: 'break' },
        { at: 4, bars: 4, part: 'drive' },
      ])
      ctx.sfx(0, 'pop', { gain: 0.7 })

      /* ---------- 0:00 the search ---------- */
      const box = ctx.el('div', 'search', ctx.stage, `<span>${t.typed}</span><span></span>`)
      const done = K.typewrite(ctx, box.lastElementChild, t.rest, 0.3, { cps: 17 })
      for (let s = 0.3; s < done; s += 0.12) ctx.sfx(s, 'tick', { gain: 0.3 })
      const options = t.options.map((text, i) => {
        const el = ctx.el('div', 'option', ctx.stage, text)
        el.style.top = 500 + i * 128 + 'px'
        C.appear(ctx, el, 0.9 + i * 0.45, { from: { y: -30 }, dur: 0.2, ease: 'expo.out', sound: 'pop' })
        return el
      })
      const pick = options[options.length - 1]
      tl.to(pick, { background: '#e0263a', color: '#fff', duration: 0.15 }, 3.1)
      ctx.sfx(3.1, 'hit', { gain: 0.6 })
      K.tapRipple(ctx, pick, 0.8, 0.5, 3.9, 70)
      ctx.sfx(3.9, 'tap', { gain: 1 })
      tl.fromTo(pick, { scale: 1 }, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1, immediateRender: false }, 3.9)
      tl.set([box, ...options], { opacity: 0 }, 4.4)

      /* ---------- 0:04 the answer, in real time ---------- */
      const view = { scale: 1.05, x: (1080 - 886 * 1.05) / 2, y: 520 - 330 * 1.05 }
      C.cut(ctx, shots, w, 4.4, view, { sound: 'hit' })
      const from = m('workout', 'set-5') - 0.25
      const to = m('workout', 'fast-end') + 0.25
      C.play(ctx, w, { at: 4.4, from, to, speed: (to - from) / 4.8 })
      C.label(ctx, t.tap, { y: 330, size: 76, tone: 'red', at: 4.4, out: 6.8, sound: false })
      C.label(ctx, t.filled, { y: 340, size: lang === 'en' ? 48 : 56, at: 6.8, out: 9.2 })

      /* ---------- 0:09 what the app says it took ---------- */
      C.still(ctx, r, m('workout', 'recap') + 1.4, 9.2)
      C.cut(ctx, shots, r, 9.2, C.frame('recap-stats', { cy: 800, fill: 1 }), { sound: 'hit' })
      K.flash(ctx, 9.2, 0.35)
      C.label(ctx, t.total, { y: 340, size: 62, at: 9.2, out: 10.6, sound: false })
      C.label(ctx, t.ask, { y: 300, size: 76, at: 10.6 })
    },
  })
}
