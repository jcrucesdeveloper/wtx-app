// A06 — a "Wrapped"-style data story, built for sharing (research B: Spotify
// Wrapped = one stat per screen, bold type, vertical, gradient per card).
// Each card takes one of the app's accent colours. The figures are the ones
// WTX's own demo account produces (25 workouts, a 9-week streak, +20 kg
// volume vs last time, bench PR 70 → 72.5), so nothing is invented.
// Sound: bright 120 BPM major pop-house, whooshes between cards.

import { composition } from '../../lib/engine.js'
import * as K from '../../lib/kit.js'
import * as A from '../../lib/art.js'

const T = {
  es: { title: 'Tu mes<br>en el gym,<br>en números', k1: 'ENTRENOS', k2: 'SEMANAS SEGUIDAS', k3: 'DE VOLUMEN', k3b: 'vs. la última vez', k4: 'RÉCORD · PRESS DE BANCA', share: '¿Cuál fue el tuyo?' },
  en: { title: 'Your month<br>in the gym,<br>in numbers', k1: 'WORKOUTS', k2: 'WEEKS IN A ROW', k3: 'OF VOLUME', k3b: 'vs. last time', k4: 'BENCH PRESS RECORD', share: "What's yours?" },
}

const GRAD = [
  ['#e0263a', '#5a0a16'],
  ['#7c4dff', '#241055'],
  ['#ffb020', '#7a3a00'],
  ['#17c3d6', '#05424b'],
  ['#1fb36b', '#06432a'],
]

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 16,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const starts = [0, 2.5, 5.5, 8.5, 11.5]
      const cards = GRAD.map(([c1, c2], i) => {
        const w = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 10 + i, background: `radial-gradient(90% 60% at 30% 20%, ${c1}, ${c2})`, overflow: 'hidden' })
        // soft rings drifting
        for (let r = 0; r < 3; r++) {
          const ring = A.node(ctx, '', w, { position: 'absolute', left: 150 + r * 260 + 'px', top: 400 + r * 380 + 'px', width: 520 + r * 120 + 'px', height: 520 + r * 120 + 'px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.14)' })
          tl.fromTo(ring, { scale: 0.9 }, { scale: 1.15, duration: 3, ease: 'sine.inOut' }, starts[i])
        }
        if (i > 0) {
          tl.set(w, { y: 1920 }, 0)
          tl.to(w, { y: 0, duration: 0.45, ease: 'power3.inOut' }, starts[i] - 0.2)
          ctx.sfx(starts[i] - 0.2, 'whoosh', { gain: 0.8 })
        }
        return w
      })
      const txt = (card, cls, css, html) => A.node(ctx, cls, card, css, html)
      const eyebrow = (card, html, at) => {
        const e = txt(card, 't-inter', { left: '90px', top: '380px', fontSize: '44px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.85)', fontWeight: '800' }, html)
        tl.set(e, { opacity: 0 }, 0)
        tl.fromTo(e, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', immediateRender: false }, at)
        return e
      }
      const slam = (el, at, snd = 'hit') => {
        tl.set(el, { opacity: 0 }, 0)
        tl.fromTo(el, { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'expo.out', immediateRender: false }, at)
        if (snd) ctx.sfx(at, snd, { gain: 0.8 })
      }

      // 0 — title, on frame 0
      txt(cards[0], 't-anton', { left: '90px', top: '470px', fontSize: '184px', color: '#fff', textTransform: 'none', lineHeight: 1.04 }, t.title)
      txt(cards[0], 't-inter', { left: '90px', top: '1180px', fontSize: '44px', color: 'rgba(255,255,255,0.8)' }, '▲ ▲ ▲')

      // 1 — workouts
      eyebrow(cards[1], t.k1, 2.8)
      const n1 = txt(cards[1], 't-anton', { left: '90px', top: '440px', fontSize: '520px', color: '#fff', lineHeight: 1 }, '0')
      K.counter(ctx, n1, 0, 25, 2.9, 1.2, { ease: 'power2.out' })
      ctx.sfx(2.9, 'riser', { dur: 1.2, gain: 0.4 })
      tl.set(n1, { opacity: 0 }, 0)
      tl.set(n1, { opacity: 1 }, 2.9)
      const bars = [2, 3, 3, 3, 2, 3, 3, 3, 3]
      bars.forEach((v, i) => {
        const b = txt(cards[1], '', { position: 'absolute', left: 90 + i * 100 + 'px', width: '78px', top: 1260 - v * 90 + 'px', height: v * 90 + 'px', background: '#fff', borderRadius: '16px 16px 6px 6px', transformOrigin: '50% 100%', opacity: i === 8 ? 1 : 0.85 })
        tl.set(b, { scaleY: 0 }, 0)
        tl.to(b, { scaleY: 1, duration: 0.35, ease: 'back.out(2)' }, 3.5 + i * 0.09)
        ctx.sfx(3.5 + i * 0.09, 'tick', { gain: 0.5 })
      })

      // 2 — streak
      eyebrow(cards[2], t.k2, 5.8)
      const n2 = txt(cards[2], 't-anton', { left: '90px', top: '440px', fontSize: '520px', color: '#fff', lineHeight: 1 }, '9')
      slam(n2, 5.9)
      for (let i = 0; i < 9; i++) {
        const f = txt(cards[2], '', { position: 'absolute', left: 90 + (i % 5) * 190 + 'px', top: 1010 + Math.floor(i / 5) * 190 + 'px', width: '130px', height: '130px', color: '#fff', transformOrigin: '50% 100%' }, K.ICONS.flame)
        tl.set(f, { scale: 0 }, 0)
        tl.to(f, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 6.5 + i * 0.12)
        ctx.sfx(6.5 + i * 0.12, 'pop', { gain: 0.5 })
        tl.to(f, { scale: 1.12, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 7.7 + i * 0.05)
      }

      // 3 — volume
      eyebrow(cards[3], t.k3, 8.8)
      const n3 = txt(cards[3], 't-anton', { left: '90px', top: '440px', fontSize: '400px', color: '#fff', lineHeight: 1 }, '+20<span style="font-size:150px"> kg</span>')
      slam(n3, 8.9)
      txt(cards[3], 't-inter', { left: '90px', top: '860px', fontSize: '56px', color: 'rgba(255,255,255,0.9)' }, t.k3b)
      const svg = txt(cards[3], '', { position: 'absolute', left: '90px', top: '1000px', width: '900px', height: '300px' }, '<svg viewBox="0 0 900 300" width="900" height="300" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" stroke-dasharray="1" id="vol" d="M10 270 L130 220 L250 240 L370 170 L490 190 L610 110 L730 130 L880 20"/></svg>')
      const path = svg.querySelector('#vol')
      tl.set(path, { strokeDashoffset: 1 }, 0)
      tl.to(path, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 9.3)
      ctx.sfx(9.3, 'riser', { dur: 1.2, gain: 0.35 })

      // 4 — record
      eyebrow(cards[4], t.k4, 11.8)
      const old = txt(cards[4], 't-anton', { left: '90px', top: '470px', fontSize: '200px', color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through', lineHeight: 1 }, '70')
      const rec = txt(cards[4], 't-anton', { left: '90px', top: '640px', fontSize: '420px', color: '#fff', lineHeight: 1 }, '72.5<span style="font-size:130px"> kg</span>')
      tl.set(old, { opacity: 0 }, 0)
      tl.set(old, { opacity: 1 }, 12.0)
      slam(rec, 12.5)
      const trophy = txt(cards[4], '', { position: 'absolute', left: '640px', top: '1120px', width: '300px', height: '300px', color: '#fff' }, K.ICONS.trophy)
      tl.set(trophy, { scale: 0 }, 0)
      tl.to(trophy, { scale: 1, rotation: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' }, 12.9)
      A.confetti(ctx, 12.55, { x: 540, y: 900, n: 44, up: 900, parent: ctx.stage })
      ctx.sfx(12.55, 'confirm', { gain: 1 })
      const share = txt(cards[4], 't-anton', { left: '90px', top: '1180px', fontSize: '84px', color: '#fff', textTransform: 'none', lineHeight: 1.05, width: '520px', whiteSpace: 'normal' }, t.share)
      tl.set(share, { opacity: 0 }, 0)
      tl.to(share, { opacity: 1, duration: 0.3 }, 13.3)

      A.tag(ctx, { x: 90, y: 250 })
      ctx.music([{ at: 0, bars: 8, part: 'pop', gain: 0.9 }])
      A.sting(ctx, 14.6, { y: 400, scrim: true })
      A.grain(ctx, { opacity: 0.08, blend: 'overlay' })
    },
  })
}
