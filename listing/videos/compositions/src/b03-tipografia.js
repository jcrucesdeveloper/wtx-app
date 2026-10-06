// A03 — kinetic typography on phonk. One vocabulary only (research A: "the
// most common mistake is animating every word differently"): a slam-in, a
// colour invert, an RGB split on the kick. 150 BPM = one beat every 12 frames.
// Works fully muted. Sound: Brazilian phonk (808, cowbell tresillo, bells).

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const BEAT = 0.4

// [startBeat, lengthBeats, lines, style]. `*x*` accents a word in red.
const CARDS = {
  es: [
    [0, 4, ['LO QUE NO', 'SE ANOTA'], 'w'],
    [4, 4, ['NO', 'CUENTA.'], 'r'],
    [8, 1, ['70'], 'num', '70'],
    [9, 1, ['72.5'], 'num', '72.5'],
    [10, 2, ['75'], 'num', '75'],
    [12, 4, ['SI NO LO', 'ANOTAS,', 'NO LO SABES.'], 'w3'],
    [16, 1, ['SERIE'], 'w'],
    [17, 1, ['TRAS'], 'r'],
    [18, 2, ['SERIE.'], 'w'],
    [20, 2, ['SIN', 'CUENTA.'], 'r'],
    [22, 2, ['SIN', 'PRISAS.'], 'w'],
    [24, 12, ['ANÓTALO.'], 'rbig'],
  ],
  en: [
    [0, 4, ['IF IT ISN’T', 'LOGGED'], 'w'],
    [4, 4, ['IT', 'DOESN’T COUNT.'], 'r'],
    [8, 1, ['70'], 'num', '70'],
    [9, 1, ['72.5'], 'num', '72.5'],
    [10, 2, ['75'], 'num', '75'],
    [12, 4, ['IF YOU DON’T', 'LOG IT,', 'YOU DON’T KNOW.'], 'w3'],
    [16, 1, ['SET'], 'w'],
    [17, 1, ['AFTER'], 'r'],
    [18, 2, ['SET.'], 'w'],
    [20, 2, ['NO', 'ACCOUNT.'], 'r'],
    [22, 2, ['NO', 'RUSH.'], 'w'],
    [24, 12, ['LOG IT.'], 'rbig'],
  ],
}
const TOP = { es: 'TU PROGRESO', en: 'YOUR PROGRESS' }

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.6

export default function run(lang) {
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 16 + C,
    bpm: 150,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      const bg = A.node(ctx, 'layer', ctx.stage, { background: '#000' })
      // diagonal stripes drifting behind everything
      const stripes = A.node(ctx, '', ctx.stage, { position: 'absolute', inset: '-30%', background: 'repeating-linear-gradient(115deg, rgba(224,38,58,0.0) 0 90px, rgba(224,38,58,0.12) 90px 180px)' })
      tl.fromTo(stripes, { x: 0 }, { x: 360, duration: ctx.duration, ease: 'none' }, 0)

      const cards = CARDS[lang]
      const BG = { w: '#050505', w3: '#050505', r: '#e0263a', rbig: '#e0263a', num: '#050505' }
      const FG = { w: '#fff', w3: '#fff', r: '#fff', rbig: '#fff', num: '#fff' }

      cards.forEach(([b, len, lines, style, num], ci) => {
        const at = b * BEAT
        const end = (b + len) * BEAT
        const wrap = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 20 })
        const size = style === 'rbig' ? 250 : style === 'num' ? 520 : style === 'w3' ? 170 : lines.length > 1 ? 210 : 330
        const total = lines.length * size * 0.98
        const y0 = (1920 - total) / 2 - 120
        const els = lines.map((ln, i) => {
          const accent = style === 'w' && i === lines.length - 1
          const e = A.node(ctx, 't-anton', wrap, {
            left: '0', width: '1080px', textAlign: 'center', top: y0 + i * size * 0.98 + 'px', fontSize: size + 'px',
            color: FG[style], textShadow: 'none', transformOrigin: '50% 60%',
          }, accent && ci === 0 ? `<span style="color:#e0263a">${ln}</span>` : ln)
          return e
        })
        if (style === 'num') {
          A.node(ctx, 't-anton', wrap, { left: '0', width: '1080px', textAlign: 'center', top: y0 - 150 + 'px', fontSize: '70px', color: '#e0263a', letterSpacing: '0.2em' }, TOP[lang])
          A.node(ctx, 't-anton', wrap, { left: '0', width: '1080px', textAlign: 'center', top: y0 + size * 1.0 + 'px', fontSize: '110px', color: '#aab3bd' }, 'KG')
        }
        void num
        if (ci > 0) tl.set(wrap, { opacity: 0 }, 0)
        tl.set(wrap, { opacity: 1 }, ci === 0 ? 0 : at)
        tl.set(wrap, { opacity: 0 }, end)
        if (ci > 0) tl.set(bg, { background: BG[style] }, at)
        // first card is already complete on frame 0; the rest slam in per line
        els.forEach((e, i) => {
          const t0 = at + (style === 'w3' ? i * BEAT : style === 'w' || style === 'r' ? i * BEAT * 0.5 : 0)
          if (ci > 0) {
            tl.set(e, { opacity: 0 }, 0)
            tl.fromTo(e, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, duration: 0.13, ease: 'power4.out', immediateRender: false }, t0)
          }
          // RGB split for two frames on the hit
          tl.set(e, { textShadow: '14px 0 #ff2a44, -14px 0 #00e5ff' }, t0 + 0.02)
          tl.set(e, { textShadow: 'none' }, t0 + 0.1)
          ctx.sfx(t0, style === 'rbig' ? 'hit' : 'tick', { gain: 0.7 })
        })
        A.shakeX(ctx, wrap, at, { amp: 18, n: 6, dur: 0.22 })
        if (style === 'r' || style === 'rbig') tl.fromTo(wrap, { y: -12 }, { y: 0, duration: 0.2, ease: 'power3.out', immediateRender: false }, at)
      })

      // ticker, always moving
      const tick = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', width: '2400px', top: '1250px', height: '90px', background: '#e0263a', zIndex: 30, display: 'flex', alignItems: 'center', overflow: 'hidden' })
      const word = lang === 'es' ? 'ANÓTALO' : 'LOG IT'
      A.node(ctx, 't-anton', tick, { position: 'relative', fontSize: '58px', color: '#fff', letterSpacing: '0.04em' }, Array(18).fill(`${word} <span style="opacity:.6">✕</span> `).join(' '))
      tl.fromTo(tick, { x: 0 }, { x: -1100, duration: ctx.duration, ease: 'none' }, 0)
      A.tag(ctx, { x: 90, y: 250 })

      // outro: the sting replaces the last bar
      ctx.music([{ at: 0, bars: 2, part: 'phonk-lite' }, { at: 3.2, bars: 8, part: 'phonk' }])
      ctx.sfx(0, 'impact', { gain: 0.6 })
      ctx.sfx(2.8, 'riser', { dur: 0.4, gain: 0.5 })
      A.sting(ctx, 14.4, { y: 520, scrim: true })
      A.grain(ctx, { opacity: 0.12, blend: 'screen' })
      COLD['a03-tipografia'](ctx0, C, lang)
    },
  })
}
