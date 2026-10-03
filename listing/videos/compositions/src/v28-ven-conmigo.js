// Variation 28, "come with me": a whole push day as a vlog in chapters. A
// rail down the left fills as it goes; the window on the right is the take,
// one chapter at a time.

import { composition } from '../../lib/engine.js'
import * as C from '../../lib/cuts.js'
import * as K from '../../lib/kit.js'

const T = {
  es: {
    hook: 'Ven conmigo: día de push<br>en 15 segundos',
    chapters: ['Abro la rutina', 'Banca: hoy 72.5', '16 series, un toque cada una', 'Terminar y guardar', 'Récord y racha'],
    ask: '¿Vienes mañana?',
  },
  en: {
    hook: 'Come with me: push day<br>in 15 seconds',
    chapters: ['Open the routine', 'Bench: 72.5 today', '16 sets, one tap each', 'Finish and save', 'PR and streak'],
    ask: 'Coming tomorrow?',
  },
}

const CSS = `
.rail { position: absolute; left: 112px; top: 600px; width: 10px; height: 880px; border-radius: 5px; background: rgba(255,255,255,.16); z-index: 25; }
.rail i { position: absolute; inset: 0; border-radius: 5px; background: #e0263a; transform-origin: 50% 0; }
.stop { position: absolute; left: 82px; width: 70px; height: 70px; display: grid; place-items: center; border-radius: 50%;
  background: #2a3038; color: #aebac6; font-weight: 900; font-size: 38px; z-index: 26; }
`

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 16,
    lang,
    clips: ['workout'],
    build(ctx) {
      const { m, tl } = ctx
      C.style(CSS)
      C.backdrop(ctx)
      C.brandTag(ctx)
      ctx.music([{ at: 0, bars: 8, part: 'drive' }])
      ctx.sfx(0, 'impact', { gain: 0.7 })

      const win = C.pane(ctx, 'workout', { x: 200, y: 560, w: 790, h: 960, radius: 34 })
      const look = (y) => C.frameIn(win, { x: 0, y, w: 886, h: 960 / (790 / 886) })
      C.still(ctx, win, 0.45)
      gsap.set(win.cam, look(0))

      const starts = [1.6, 4.2, 6.8, 9.6, 12, 14.6]
      const takes = [
        { from: 0.45, to: m('workout', 'session') + 0.3, y: 0 },
        { from: m('workout', 'weight') - 0.2, to: m('workout', 'pr-set') + 0.8, y: 140 },
        { from: m('workout', 'set-5') - 0.2, to: m('workout', 'fast-end') + 0.2, y: 500 },
        { from: m('workout', 'finish') - 0.4, to: m('workout', 'confirm') + 0.6, y: 820 },
        { from: m('workout', 'recap') + 0.2, to: m('workout', 'recap') + 2.3, y: 60 },
      ]

      /* ---------- the rail ---------- */
      const rail = ctx.el('div', 'rail')
      const fill = ctx.el('i', '', rail)
      tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: starts[5] - starts[0], ease: 'none' }, starts[0])
      const stops = takes.map((_, i) => {
        const el = ctx.el('div', 'stop', ctx.stage, String(i + 1))
        el.style.top = 600 + i * 202 - 4 + 'px'
        return el
      })

      C.label(ctx, t.hook, { y: 300, size: 58, out: starts[0] })

      /* ---------- the chapters ---------- */
      takes.forEach((take, i) => {
        const at = starts[i]
        const out = starts[i + 1]
        tl.set(win.cam, look(take.y), at)
        C.play(ctx, win, { at, from: take.from, to: take.to, speed: (take.to - take.from) / (out - at - 0.1) })
        tl.fromTo(win.root, { scale: 1.035 }, { scale: 1, duration: 0.25, ease: 'expo.out', immediateRender: false }, at)
        ctx.sfx(at, 'hit', { gain: 0.6 })
        tl.to(stops[i], { background: '#e0263a', color: '#fff', scale: 1.25, duration: 0.2, ease: 'back.out(3)' }, at)
        tl.to(stops[i], { scale: 1, duration: 0.2 }, out)
        C.label(ctx, t.chapters[i], { y: 330, size: i === 2 ? 50 : 60, tone: i === 4 ? 'red' : 'white', at, out, sound: false })
      })
      K.flash(ctx, starts[4], 0.3)

      /* ---------- 0:14 the invitation ---------- */
      C.label(ctx, t.ask, { y: 320, size: 84, at: starts[5] })
      ctx.sfx(starts[5], 'confirm', { gain: 0.8 })
    },
  })
}
