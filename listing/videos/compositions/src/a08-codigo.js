// A08 — "your workout is just text": a .wtt routine is typed, glitches, and
// resolves into the exercise list it describes. Retro-digital/glitch is the
// 2026 counter to polished AI sameness (research A). The syntax is the real
// .wtt format from the README. Sound: 120 BPM synth with key clicks and glitch hits.

import { composition } from '../../lib/engine.js'
import * as K from '../../lib/kit.js'
import * as A from '../../lib/art.js'

const T = {
  es: { hook: 'Tu rutina es<br>solo texto', end: 'Pégala.<br>Y a entrenar.', file: 'push.wtt' },
  en: { hook: 'Your routine is<br>just text', end: 'Paste it.<br>Then train.', file: 'push.wtt' },
}

const CODE = '# Push Day\nunit: kg\nBench Press | reps 4x8 | 72.5\nOverhead Press | reps 3x10 | 30\nPlank | time 1m30s'
const CHIPS = [
  ['Bench Press', '4 × 8 · 72.5 kg'],
  ['Overhead Press', '3 × 10 · 30 kg'],
  ['Plank', '1:30'],
]

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 12,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const r = A.rng(5)
      A.node(ctx, 'layer', ctx.stage, { background: 'radial-gradient(80% 55% at 50% 45%, #14202a, #05080a)' })
      A.node(ctx, 'layer', ctx.stage, { zIndex: 61, pointerEvents: 'none', background: 'repeating-linear-gradient(rgba(255,255,255,0.045) 0 2px, transparent 2px 5px)' })

      // hook, on frame 0 — with a chromatic jitter now and then
      const hook = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '130px', color: '#fff', zIndex: 40, whiteSpace: 'normal', textTransform: 'none', lineHeight: 1.0 }, t.hook)

      // terminal
      const term = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '70px', width: '940px', top: '700px', height: '560px', borderRadius: '28px', background: '#0a0e13', border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 80px rgba(224,38,58,0.18)', zIndex: 20, overflow: 'hidden' })
      const bar = A.node(ctx, '', term, { position: 'absolute', left: '0', right: '0', top: '0', height: '66px', background: '#11171e', borderBottom: '2px solid rgba(255,255,255,0.08)' })
      for (let i = 0; i < 3; i++) A.node(ctx, '', bar, { position: 'absolute', left: 26 + i * 34 + 'px', top: '23px', width: '20px', height: '20px', borderRadius: '50%', background: ['#e0263a', '#f7c52b', '#2fb36d'][i] })
      A.node(ctx, 't-inter', bar, { left: '0', right: '0', top: '16px', textAlign: 'center', fontSize: '30px', color: '#74818f', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace' }, t.file)
      const code = A.node(ctx, '', term, { position: 'absolute', left: '34px', top: '100px', right: '30px', font: '500 42px/1.5 "JetBrains Mono", monospace', color: '#e6edf3', whiteSpace: 'pre' })
      const done = K.typewrite(ctx, code, CODE, 0.0, { cps: 19, format: K.highlightWtt })
      // the first line is there on frame 0
      code.innerHTML = '<span class="c-h"># </span><span class="caret"></span>'
      for (let i = 0; i < CODE.length; i += 2) ctx.sfx(0.05 + i / 19 + (r() - 0.5) * 0.03, 'keyclick', { gain: 0.55 })

      // glitch helper: a few frames of tear + colour split + bars
      const glitch = (at, targets, { amp = 26, frames = 4 } = {}) => {
        ctx.sfx(at, 'glitch', { gain: 1, dur: 0.22 })
        for (let f = 0; f < frames; f++) {
          const tt = at + f / 30
          for (const el of targets) tl.set(el, { x: (r() - 0.5) * amp * 2, skewX: (r() - 0.5) * 16, filter: `hue-rotate(${Math.round((r() - 0.5) * 140)}deg) saturate(1.6)` }, tt)
          const b = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', width: '1080px', top: 500 + r() * 800 + 'px', height: 8 + r() * 26 + 'px', background: r() > 0.5 ? '#ff2a44' : '#00e5ff', mixBlendMode: 'screen', zIndex: 62, opacity: 0 })
          tl.set(b, { opacity: 0.8 }, tt)
          tl.set(b, { opacity: 0 }, tt + 1 / 30)
        }
        for (const el of targets) tl.set(el, { x: 0, skewX: 0, filter: 'none' }, at + frames / 30)
      }
      glitch(2.6, [hook], { amp: 14, frames: 3 })
      glitch(done + 0.5, [term, hook], { amp: 30, frames: 5 })
      glitch(done + 0.9, [term], { amp: 40, frames: 3 })
      const swap = done + 1.1
      tl.set(term, { opacity: 0 }, swap)

      // the parsed result
      const chips = CHIPS.map(([name, detail], i) => {
        const c = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '90px', width: '900px', top: 720 + i * 190 + 'px', height: '160px', borderRadius: '34px', background: 'rgba(24,30,38,0.96)', border: '2px solid rgba(255,255,255,0.14)', zIndex: 20, display: 'flex', alignItems: 'center', padding: '0 36px', gap: '28px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' })
        A.node(ctx, '', c, { flex: '0 0 76px', height: '76px', borderRadius: '50%', background: '#e0263a', color: '#fff', display: 'grid', placeItems: 'center' }, `<div style="width:42px;height:42px">${K.ICONS.check}</div>`)
        A.node(ctx, '', c, { flex: '1', font: '800 52px Inter', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }, `${name}<div style="font:600 36px 'JetBrains Mono',monospace;color:#8b97a4;margin-top:6px">${detail}</div>`)
        tl.set(c, { opacity: 0 }, 0)
        tl.fromTo(c, { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, swap + i * 0.14)
        ctx.sfx(swap + i * 0.14, 'pop', { gain: 0.8 })
        ctx.sfx(swap + i * 0.14 + 0.03, 'ding', { gain: 0.5, midi: 84 + i * 4 })
        return c
      })
      void chips
      const end = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '1330px', textAlign: 'center', fontSize: '100px', color: '#fff', zIndex: 40, whiteSpace: 'normal', textTransform: 'none', lineHeight: 1.02 }, t.end)
      tl.set(end, { opacity: 0 }, 0)
      tl.fromTo(end, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'expo.out', immediateRender: false }, swap + 0.7)
      ctx.sfx(swap + 0.7, 'hit', { gain: 0.7 })

      A.tag(ctx, { x: 90, y: 250 })
      ctx.music([{ at: 0, bars: 6, part: 'synth', gain: 0.8 }])
      A.sting(ctx, 10.6, { y: 420, scrim: true })
      A.grain(ctx, { opacity: 0.1, blend: 'screen' })
    },
  })
}
