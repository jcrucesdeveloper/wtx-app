// Variation 22, red flags and green flags: a deck of cards. Each statement
// gets its verdict stamped on, then is swiped away: left for a red flag,
// right for a green one. The green cards carry a window of the real app.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'

const T = {
  es: {
    hook: 'Red flags y green flags<br>en una app de gym',
    cards: ['Te pide crear cuenta antes de empezar', 'Ya trae tu peso de la última vez', 'Tus datos no pueden salir de ahí', 'Exportas todo con un botón', 'Te avisa cuando rompes un récord'],
    ask: '¿Cuál es<br>tu red flag?',
  },
  en: {
    hook: 'Red flags & green flags<br>in a gym app',
    cards: ['Makes you sign up before you start', 'Already has your last weight', "Your data can't leave", 'Export everything with one button', 'Tells you when you hit a PR'],
    ask: "What's your<br>red flag?",
  },
}

const CSS = `
.swipe { position: absolute; left: 90px; top: 580px; width: 900px; height: 640px; box-sizing: border-box; padding: 54px 56px;
  border-radius: 44px; background: #f6f8fa; color: #0b0d0f; box-shadow: 0 40px 100px rgba(0,0,0,.65); z-index: 25; }
.swipe__text { font-weight: 900; font-size: 62px; line-height: 1.12; letter-spacing: -0.03em; }
.swipe__stamp { position: absolute; right: 44px; bottom: 44px; padding: 10px 26px; border: 8px solid; border-radius: 18px;
  font-weight: 900; font-size: 54px; letter-spacing: 0.04em; transform: rotate(-8deg); background: #f6f8fa; }
.swipe__stamp--red { color: #e0263a; }
.swipe__icon { position: absolute; left: 56px; bottom: 30px; font-size: 230px; line-height: 1; }
.swipe__stamp--green { color: #14915a; }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 14,
    lang,
    clips: ['workout', 'accent'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      C.backdrop(ctx)
      C.brandTag(ctx)
      ctx.music([{ at: 0, bars: 7, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.7 })
      C.label(ctx, t.hook, { y: 310, size: 60, out: 12.4 })

      // What backs each green card: a region of the real screen.
      const proofs = {
        1: { clip: 'workout', at: () => m('workout', 'session') + 0.3, rect: 'set-head' },
        3: { clip: 'accent', at: () => m('accent', 'settings') + 1.7, rect: { x: 40, y: 965, w: 806, h: 190 } },
        4: { clip: 'workout', at: () => m('workout', 'recap') + 1.4, rect: 'recap-pr' },
      }
      const times = [0, 2.4, 5.2, 7.6, 10.2, 12.4]

      t.cards.forEach((text, i) => {
        const green = Boolean(proofs[i])
        const at = times[i]
        const out = times[i + 1]
        const el = ctx.el('div', 'swipe', ctx.stage, `<div class="swipe__text">${text}</div>`)
        if (green) {
          const p = proofs[i]
          const win = C.pane(ctx, p.clip, { x: 56, y: 230, w: 788, h: 250, radius: 20, parent: el })
          C.still(ctx, win, p.at())
          gsap.set(win.cam, C.frameIn(win, p.rect))
        }
        if (!green) ctx.el('div', 'swipe__icon', el, '🚩')
        const stamp = ctx.el('div', `swipe__stamp swipe__stamp--${green ? 'green' : 'red'}`, el, green ? 'GREEN FLAG ✅' : 'RED FLAG 🚩')

        // In from below the deck, verdict, then swiped off to its side.
        if (at > 0) {
          tl.set(el, { opacity: 0 }, 0)
          tl.fromTo(el, { opacity: 1, y: 90, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.6)', immediateRender: false }, at)
          ctx.sfx(at, 'pop', { gain: 0.6 })
        }
        const verdict = at + (green ? 1.2 : 1.0)
        tl.set(stamp, { opacity: 0 }, 0)
        tl.fromTo(stamp, { opacity: 1, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'expo.out', immediateRender: false }, verdict)
        ctx.sfx(verdict, green ? 'confirm' : 'hit', { gain: 0.9 })
        const side = green ? 1 : -1
        tl.to(el, { x: side * 1250, rotate: side * 16, duration: 0.3, ease: 'expo.in' }, out - 0.3)
        ctx.sfx(out - 0.3, 'whoosh', { gain: 0.6 })
      })

      /* ---------- 0:12 the question ---------- */
      C.label(ctx, t.ask, { y: 700, size: 104, align: 'center', at: 12.4 })
    },
  })
}
