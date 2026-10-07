// A11 — a quiet parallax mood piece: the camera dollies through an empty night
// gym (window, rack, bar, foreground silhouettes, dust in a light shaft).
// Research A: parallax 2.5D + cinematic openers; C: ambient pads + heartbeat,
// one distant clank. The calm counterpoint to the loud ones in this batch,
// and a quote people send ("nobody sees you train. your progress stays").

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: { a: 'Nadie te ve<br>entrenar a las 6 a. m.', b: 'Tu progreso<br>sí queda.' },
  en: { a: 'Nobody sees you<br>train at 6 a.m.', b: 'Your progress<br>stays.' },
}

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.6

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 12.8 + C,
    bpm: 75,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      const r = A.rng(21)
      const D = ctx.duration
      const full = (z, scale, dx = 0) => {
        const l = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: z, transformOrigin: '540px 980px' })
        tl.fromTo(l, { scale: 1, x: 0 }, { scale, x: dx, duration: D, ease: 'sine.inOut' }, 0)
        return l
      }

      // sky + window wall
      A.node(ctx, 'layer', ctx.stage, { background: 'linear-gradient(#03060a, #0a1220 55%, #101a2c)' })
      const L0 = full(1, 1.1, -20)
      A.node(ctx, '', L0, { position: 'absolute', left: '600px', top: '420px', width: '380px', height: '560px', background: 'linear-gradient(#1d3358, #0c1730 70%)', border: '14px solid #05080c', boxShadow: '0 0 120px rgba(120,160,255,0.25)' })
      A.node(ctx, '', L0, { position: 'absolute', left: '830px', top: '470px', width: '90px', height: '90px', borderRadius: '50%', background: '#f5f1d8', boxShadow: '0 0 60px 20px rgba(245,241,216,0.35)' })
      // skyline
      for (let i = 0; i < 9; i++) {
        const h = 80 + r() * 200
        A.node(ctx, '', L0, { position: 'absolute', left: 614 + i * 42 + 'px', top: 980 - 14 - h + 'px', width: '40px', height: h + 'px', background: '#070c18' })
      }
      // window bars
      A.node(ctx, '', L0, { position: 'absolute', left: '780px', top: '420px', width: '12px', height: '560px', background: '#05080c' })
      A.node(ctx, '', L0, { position: 'absolute', left: '600px', top: '690px', width: '380px', height: '12px', background: '#05080c' })
      // light shaft from the window
      const shaft = A.node(ctx, '', L0, { position: 'absolute', left: '420px', top: '700px', width: '560px', height: '1100px', background: 'linear-gradient(180deg, rgba(150,180,255,0.26), rgba(150,180,255,0))', clipPath: 'polygon(55% 0, 100% 0, 60% 100%, -30% 100%)', filter: 'blur(14px)' })
      tl.to(shaft, { opacity: 0.6, duration: 2.2, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 0)

      // back wall: pull-up rig + a neon strip
      const L1 = full(2, 1.25, 30)
      for (const x of [90, 300]) A.node(ctx, '', L1, { position: 'absolute', left: x + 'px', top: '560px', width: '26px', height: '520px', background: '#0a0f17', boxShadow: 'inset -4px 0 0 rgba(224,38,58,0.25)' })
      A.node(ctx, '', L1, { position: 'absolute', left: '80px', top: '560px', width: '270px', height: '24px', background: '#0a0f17', boxShadow: 'inset 0 4px 0 rgba(224,38,58,0.25)' })
      const neon = A.node(ctx, '', L1, { position: 'absolute', left: '120px', top: '300px', width: '420px', height: '10px', borderRadius: '5px', background: '#ff5468', boxShadow: '0 0 30px 8px rgba(224,38,58,0.7)' })
      for (let k = 0; k < 8; k++) tl.set(neon, { opacity: k % 3 === 2 ? 0.35 : 1 }, 1.2 + k * 0.7 + (k % 2) * 0.12)

      // the rack and the bar
      const L2 = full(3, 1.55, -60)
      for (const x of [250, 790]) {
        A.node(ctx, '', L2, { position: 'absolute', left: x + 'px', top: '640px', width: '42px', height: '740px', background: '#0b1018', boxShadow: 'inset -6px 0 0 rgba(224,38,58,0.55)' })
        A.node(ctx, '', L2, { position: 'absolute', left: x - 16 + 'px', top: '1360px', width: '74px', height: '26px', background: '#0b1018' })
      }
      A.node(ctx, '', L2, { position: 'absolute', left: '230px', top: '760px', width: '620px', height: '20px', background: 'linear-gradient(#5a6572, #1b222b)', boxShadow: '0 0 0 2px #0b1018' })
      for (const x of [170, 840]) {
        A.disc(ctx, L2, { x: x + 20, y: 770, r: 150, colors: ['#2a313a', '#1b2128', '#0c1015'], hole: 0.08 })
      }
      A.node(ctx, '', L2, { position: 'absolute', left: '60px', top: '1380px', width: '960px', height: '8px', background: 'rgba(224,38,58,0.25)', filter: 'blur(3px)' })

      // floor
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', right: '0', top: '1380px', bottom: '0', zIndex: 3, background: 'linear-gradient(#0a0e14, #04070a)' })

      // near, soft silhouettes
      const L3 = full(5, 2.2, 90)
      A.node(ctx, '', L3, { position: 'absolute', left: '-120px', top: '1000px', width: '360px', height: '800px', background: '#05070b', borderRadius: '30px', filter: 'blur(8px)', boxShadow: 'inset -8px 0 0 rgba(224,38,58,0.3)' })
      for (let i = 0; i < 4; i++) A.disc(ctx, L3, { x: 70 + i * 70, y: 1080 + i * 120, r: 70, colors: ['#10151c', '#0a0d12', '#05070a'], hole: 0.1 })
      A.node(ctx, '', L3, { position: 'absolute', left: '860px', top: '1180px', width: '420px', height: '260px', background: '#05070b', borderRadius: '20px', filter: 'blur(10px)' })

      // dust
      for (let i = 0; i < 38; i++) {
        const d = A.node(ctx, '', ctx.stage, { position: 'absolute', left: 100 + r() * 880 + 'px', top: 500 + r() * 900 + 'px', width: 3 + r() * 4 + 'px', height: 3 + r() * 4 + 'px', borderRadius: '50%', background: '#cfe0ff', opacity: 0.15 + r() * 0.5, zIndex: 6 })
        tl.to(d, { x: (r() - 0.5) * 160, y: -60 - r() * 160, duration: D, ease: 'none' }, 0)
      }

      // light, vignette and grain
      A.node(ctx, '', ctx.stage, { position: 'absolute', inset: '0', zIndex: 8, background: 'radial-gradient(70% 55% at 50% 48%, transparent 40%, rgba(0,0,0,0.65) 100%)' })

      // words
      const words = (html, a, b, y) => {
        const e = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', width: '1080px', top: y + 'px', textAlign: 'center', font: '600 88px Inter', color: '#eef3fa', letterSpacing: '-0.03em', lineHeight: 1.12, zIndex: 40, textShadow: '0 4px 30px rgba(0,0,0,0.7)' }, html)
        if (a > 0) {
          tl.set(e, { opacity: 0 }, 0)
          tl.fromTo(e, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out', immediateRender: false }, a)
        }
        tl.to(e, { opacity: 0, duration: 0.8 }, b)
        return e
      }
      words(t.a, 0, 4.6, 380)
      const wb = words(t.b, 5.4, 9.8, 380)
      wb.style.color = '#ff7a8a'

      A.tag(ctx, { x: 90, y: 250 })
      ctx.music([{ at: 0, bars: 4, part: 'ambient', gain: 1 }])
      ctx.sfx(0, 'impact', { gain: 0.35 })
      ctx.sfx(6.5, 'clank', { gain: 0.45 })
      ctx.sfx(9.6, 'riser', { dur: 0.9, gain: 0.45 })
      A.sting(ctx, 10.6, { y: 520, scrim: false })
      A.grain(ctx, { opacity: 0.16, blend: 'screen' })
      COLD['a11-noche'](ctx0, C, lang)
    },
  })
}
