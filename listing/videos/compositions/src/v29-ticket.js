// Variation 29, the experiment ("I did X for N weeks, here is what
// happened") as a till receipt: it prints one line at a time, and under it a
// window shows the piece of the app each line comes from.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'

const T = {
  es: {
    hook: 'Anoté cada entreno<br>durante 9 semanas.<br>La cuenta:',
    head: 'WTX · 9 SEMANAS',
    lines: [['Entrenos anotados', '25'], ['En septiembre', '11'], ['Semanas seguidas', '9'], ['Volumen vs. última vez', '+20 kg'], ['Récord en banca', '72.5 kg']],
    foot: 'GRACIAS POR ENTRENAR',
    ask: '¿Qué diría<br>la tuya?',
  },
  en: {
    hook: 'I logged every workout<br>for 9 weeks.<br>The bill:',
    head: 'WTX · 9 WEEKS',
    lines: [['Workouts logged', '25'], ['In September', '11'], ['Weeks in a row', '9'], ['Volume vs. last time', '+20 kg'], ['Bench PR', '72.5 kg']],
    foot: 'THANK YOU FOR LIFTING',
    ask: 'What would<br>yours say?',
  },
}

const CSS = `
.receipt { position: absolute; left: 110px; top: 590px; width: 860px; box-sizing: border-box; padding: 34px 44px 40px; background: #f6f8fa; color: #0b0d0f;
  font-family: var(--mono); font-size: 37px; line-height: 1; box-shadow: 0 30px 80px rgba(0,0,0,.6); z-index: 25; }
.receipt__head, .receipt__foot { text-align: center; font-weight: 700; letter-spacing: 0.06em; }
.receipt__head { padding-bottom: 26px; border-bottom: 4px dashed #0b0d0f; }
.receipt__foot { margin-top: 26px; padding-top: 26px; border-top: 4px dashed #0b0d0f; font-size: 30px; }
.receipt__row { display: flex; justify-content: space-between; margin-top: 30px; }
.receipt__row b { font-weight: 700; }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 14,
    lang,
    clips: ['workout', 'history'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      C.backdrop(ctx)
      C.brandTag(ctx)
      ctx.music([{ at: 0, bars: 7, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.7 })

      const hook = C.label(ctx, t.hook, { y: 330, size: 54, out: 12.4 })
      hook.style.lineHeight = 1.45

      /* ---------- the receipt ---------- */
      const paper = ctx.el('div', 'receipt', ctx.stage, `<div class="receipt__head">${t.head}</div>`)
      const rows = t.lines.map(([name, value]) => ctx.el('div', 'receipt__row', paper, `<span>${name}</span><b>${value}</b>`))
      const foot = ctx.el('div', 'receipt__foot', paper, t.foot)

      /* ---------- where each line comes from ---------- */
      const recap = m('workout', 'recap') + 1.4
      const proofs = [
        { clip: 'workout', at: recap, rect: 'recap-milestone' },
        { clip: 'history', at: m('history', 'prev-month') + 0.9, rect: { x: 39, y: 150, w: 808, h: 190 } },
        { clip: 'workout', at: recap, rect: 'recap-streak' },
        { clip: 'workout', at: recap, rect: 'recap-volume' },
        { clip: 'workout', at: recap, rect: 'recap-pr' },
      ]
      const times = [2, 4.2, 6.4, 8.6, 10.8, 12.4]
      const wins = proofs.map((p) => {
        const win = C.pane(ctx, p.clip, { x: 110, y: 1250, w: 860, h: 210, radius: 20 })
        C.still(ctx, win, p.at)
        gsap.set(win.cam, C.frameIn(win, p.rect))
        tl.set(win.root, { opacity: 0 }, 0)
        return win
      })

      rows.forEach((row, i) => {
        const at = times[i]
        tl.set(row, { opacity: 0 }, 0)
        tl.fromTo(row, { opacity: 1, y: -18 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', immediateRender: false }, at)
        // A printer: three short ticks per line.
        for (let k = 0; k < 3; k++) ctx.sfx(at + k * 0.07, 'tick', { gain: 0.8 })
        wins.forEach((win, j) => tl.set(win.root, { opacity: i === j ? 1 : 0 }, at + 0.3))
        tl.fromTo(wins[i].root, { scale: 1.08 }, { scale: 1, duration: 0.3, ease: 'expo.out', immediateRender: false }, at + 0.3)
        ctx.sfx(at + 0.3, 'pop', { gain: 0.7 })
      })
      tl.set(foot, { opacity: 0 }, 0)
      tl.set(foot, { opacity: 1 }, times[5])
      ctx.sfx(times[5], 'confirm', { gain: 0.8 })
      tl.fromTo(paper, { rotate: -1.2 }, { rotate: 0.8, duration: 14, ease: 'none' }, 0)

      /* ---------- 0:12 the question ---------- */
      C.label(ctx, t.ask, { y: 300, size: 80, at: times[5] })
    },
  })
}
