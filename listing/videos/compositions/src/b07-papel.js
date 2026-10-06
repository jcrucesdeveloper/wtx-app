// A07 — paper cut-out craft, shot "on twos": the gym notebook crumples, goes in
// the bin, and one clean strip of text replaces it. Research A: 2026's answer
// to polished AI is the handmade look (grain, paper edges, imperfect stepped
// motion). Every piece jitters at 6 fps ("line boil"); moves use steps().
// Sound: lo-fi 90 BPM with paper, pencil and stamp foley.

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: { hook: 'Tu libreta del gym<br>ya no da más', s1: '¿70?', s2: '¿72?', s3: '75??', strip: 'Press de banca<br>72.5 kg × 8', stamp: 'ANOTADO', cap: 'Texto simple.<br>Sin cuenta.' },
  en: { hook: 'Your gym notebook<br>has had enough', s1: '70?', s2: '72?', s3: '75??', strip: 'Bench press<br>72.5 kg × 8', stamp: 'LOGGED', cap: 'Plain text.<br>No account.' },
}

const KRAFT = '#c9a878'
const r = A.rng(11)
const TORN = 'polygon(0% 3%, 6% 0%, 13% 3%, 21% 0%, 30% 3%, 38% 0%, 47% 3%, 55% 0%, 64% 3%, 72% 0%, 81% 3%, 90% 0%, 100% 3%, 100% 100%, 0% 100%)'

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.3333

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 13.3333 + C,
    bpm: 90,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      const steps = (d, fps = 12) => `steps(${Math.max(1, Math.round(d * fps))})`
      A.node(ctx, 'layer', ctx.stage, { background: KRAFT })
      A.node(ctx, 'layer', ctx.stage, { background: 'radial-gradient(80% 60% at 50% 40%, rgba(255,240,210,0.35), rgba(90,55,20,0.28))' })

      // a paper piece = outer (moved by the story) + inner (boils at 6 fps)
      const piece = (css, { boil = 1 } = {}) => {
        const outer = A.node(ctx, '', ctx.stage, { position: 'absolute', ...css })
        const inner = A.node(ctx, '', outer, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' })
        for (let s = 0; s < ctx.duration; s += 1 / 6) tl.set(inner, { rotation: (r() - 0.5) * 2.4 * boil, x: (r() - 0.5) * 5 * boil, y: (r() - 0.5) * 5 * boil }, s)
        return { outer, inner }
      }
      const shadow = '0 10px 0 rgba(60,35,10,0.28), 0 18px 28px rgba(60,35,10,0.25)'

      // ---------- the notebook page ----------
      const page = piece({ left: '210px', top: '520px', width: '660px', height: '820px', zIndex: 10 })
      Object.assign(page.inner.style, {
        background: 'repeating-linear-gradient(#fbf7ec 0 54px, #9db6d6 54px 56px)', clipPath: TORN, filter: 'drop-shadow(0 12px 0 rgba(60,35,10,0.3))',
      })
      A.node(ctx, '', page.inner, { position: 'absolute', left: '86px', top: '0', bottom: '0', width: '3px', background: 'rgba(224,38,58,0.5)' })
      for (let i = 0; i < 9; i++) A.node(ctx, '', page.inner, { position: 'absolute', left: '22px', top: 70 + i * 88 + 'px', width: '30px', height: '30px', borderRadius: '50%', background: KRAFT, boxShadow: 'inset 0 3px 4px rgba(0,0,0,0.35)' })
      // a coffee ring
      A.node(ctx, '', page.inner, { position: 'absolute', left: '380px', top: '560px', width: '190px', height: '190px', borderRadius: '50%', border: '14px solid rgba(120,70,30,0.22)' })
      const scrib = (txt, x, y, size, rot, color, at, strike) => {
        const e = A.node(ctx, 't-marker', page.inner, { left: x + 'px', top: y + 'px', fontSize: size + 'px', color, transform: `rotate(${rot}deg)` }, txt)
        if (at > 0) {
          tl.set(e, { opacity: 0 }, 0)
          tl.set(e, { opacity: 1 }, at)
          ctx.sfx(at, 'pencil', { dur: 0.3, gain: 0.7 })
        }
        if (strike) {
          const s = A.node(ctx, '', e, { position: 'absolute', left: '-8px', right: '-8px', top: '52%', height: '9px', background: A.PAL.red, borderRadius: '5px', transform: 'rotate(-4deg)' })
          tl.set(s, { opacity: 0 }, 0)
          tl.set(s, { opacity: 1 }, strike)
          ctx.sfx(strike, 'pencil', { dur: 0.2, gain: 0.6 })
        }
        return e
      }
      scrib('Press banca', 110, 110, 64, -2, '#2a2a2a', 0)
      scrib('60 · 60 · 62.5', 110, 210, 54, 1, '#2a2a2a', 0, 1.0)
      scrib(t.s1, 110, 330, 96, -4, '#3a3a3a', 0, 1.5)
      scrib(t.s2, 300, 430, 90, 3, '#3a3a3a', 1.2, 2.0)
      scrib(t.s3, 120, 640, 120, -3, A.PAL.red, 1.7)
      scrib('???', 400, 330, 90, 6, '#555', 0)

      // tape + title strip
      const tape = (x, y, w, rot) => {
        const p = piece({ left: x + 'px', top: y + 'px', width: w + 'px', height: '70px', zIndex: 12 }, { boil: 0.6 })
        Object.assign(p.inner.style, { background: 'rgba(255,232,120,0.82)', clipPath: 'polygon(0 10%, 4% 0, 8% 12%, 100% 0, 96% 100%, 92% 85%, 88% 100%, 0 90%)' })
        gsap.set(p.outer, { rotation: rot })
        return p
      }
      const tapes = [tape(170, 500, 190, -35), tape(760, 500, 190, 35)]
      const title = piece({ left: '90px', top: '300px', width: '900px', height: '170px', zIndex: 14 })
      Object.assign(title.inner.style, { background: '#fff8e8', boxShadow: shadow, clipPath: 'polygon(0 0, 100% 3%, 98% 100%, 2% 96%)' })
      const hook = A.node(ctx, 't-marker', title.inner, { left: '0', right: '0', top: '16px', textAlign: 'center', fontSize: '68px', color: '#2a2a2a', whiteSpace: 'normal' }, t.hook)

      // ---------- the bin ----------
      const bin = piece({ left: '730px', top: '1230px', width: '280px', height: '300px', zIndex: 8 })
      Object.assign(bin.inner.style, { background: 'repeating-linear-gradient(90deg, #8f6a3c 0 38px, #7a5830 38px 76px)', clipPath: 'polygon(6% 0, 94% 0, 82% 100%, 18% 100%)', boxShadow: shadow })
      A.node(ctx, '', bin.inner, { position: 'absolute', left: '0', right: '0', top: '0', height: '26px', background: '#a07a48' })

      // ---------- crumple (steps) and throw ----------
      const group = [page.outer, ...tapes.map((p) => p.outer)]
      // tape comes off first
      tapes.forEach((p, i) => {
        tl.set(p.outer, { opacity: 0 }, 2.5 + i * 0.1)
      })
      ctx.sfx(2.5, 'paper', { gain: 0.9, dur: 0.3 })
      tl.set(title.outer, { opacity: 0 }, 2.5)
      // crumple: three stepped poses
      const crumple = [
        [2.6, { scale: 0.86, rotation: -6 }, 'polygon(5% 8%, 20% 0, 40% 6%, 60% 0, 80% 7%, 100% 0, 96% 40%, 100% 70%, 90% 100%, 60% 94%, 30% 100%, 0 90%, 4% 55%)'],
        [2.8, { scale: 0.62, rotation: 14 }, 'polygon(15% 12%, 35% 0, 55% 10%, 85% 4%, 100% 30%, 90% 60%, 95% 90%, 60% 100%, 30% 92%, 5% 100%, 0 60%, 10% 35%)'],
        [3.0, { scale: 0.38, rotation: -22 }, 'polygon(25% 10%, 50% 0, 80% 14%, 100% 45%, 82% 85%, 50% 100%, 18% 88%, 0 50%, 8% 22%)'],
      ]
      crumple.forEach(([at, vars, clip]) => {
        tl.set(page.outer, vars, at)
        tl.set(page.inner, { clipPath: clip }, at)
        ctx.sfx(at, 'paper', { gain: 0.8, dur: 0.18 })
      })
      // the throw: an arc into the bin, on twos
      tl.to(page.outer, { x: 400, duration: 0.6, ease: steps(0.6) }, 3.3)
      tl.to(page.outer, { y: -240, duration: 0.3, ease: steps(0.3) }, 3.3)
      tl.to(page.outer, { y: 480, duration: 0.3, ease: steps(0.3) }, 3.6)
      tl.to(page.outer, { rotation: 400, duration: 0.6, ease: 'none' }, 3.3)
      tl.set(page.outer, { opacity: 0 }, 3.9)
      ctx.sfx(3.9, 'thud', { gain: 0.8 })
      tl.fromTo(bin.outer, { scaleX: 1.08, scaleY: 0.92 }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: steps(0.3), immediateRender: false }, 3.9)
      void group

      // ---------- the clean strip ----------
      const strip = piece({ left: '140px', top: '620px', width: '800px', height: '300px', zIndex: 16 })
      Object.assign(strip.inner.style, { background: '#fffdf6', boxShadow: shadow, clipPath: 'polygon(0 0, 100% 2%, 99% 100%, 1% 98%)' })
      const line = A.node(ctx, 't-inter', strip.inner, { left: '0', right: '0', top: '44px', textAlign: 'center', fontSize: '80px', fontWeight: '800', color: '#222', whiteSpace: 'normal', lineHeight: 1.18, fontFamily: 'JetBrains Mono, monospace' }, t.strip)
      void line
      tl.set(strip.outer, { opacity: 0, y: -900 }, 0)
      tl.set(strip.outer, { opacity: 1 }, 4.6)
      tl.to(strip.outer, { y: 0, duration: 0.5, ease: steps(0.5) }, 4.6)
      ctx.sfx(4.6, 'whoosh', { gain: 0.6 })
      ctx.sfx(5.1, 'clack', { gain: 0.9 })
      tl.fromTo(strip.outer, { rotation: 4 }, { rotation: -1.5, duration: 0.2, ease: steps(0.2), immediateRender: false }, 5.1)

      // stamp
      const stamp = piece({ left: '250px', top: '980px', width: '580px', height: '170px', zIndex: 20 }, { boil: 0.5 })
      Object.assign(stamp.inner.style, { border: '14px solid #c1121f', borderRadius: '20px', color: '#c1121f', font: '400 120px Anton', textAlign: 'center', lineHeight: '140px', mixBlendMode: 'multiply', letterSpacing: '0.04em' })
      stamp.inner.textContent = t.stamp
      gsap.set(stamp.outer, { rotation: -8 })
      tl.set(stamp.outer, { opacity: 0 }, 0)
      tl.set(stamp.outer, { opacity: 1 }, 6.3)
      tl.fromTo(stamp.outer, { scale: 1.9 }, { scale: 1, duration: 0.15, ease: steps(0.15), immediateRender: false }, 6.3)
      ctx.sfx(6.3, 'stamp', { gain: 1 })

      // caption on tape
      const cap = piece({ left: '150px', top: '1240px', width: '700px', height: '210px', zIndex: 18 })
      Object.assign(cap.inner.style, { background: 'rgba(255,232,120,0.9)', clipPath: 'polygon(0 6%, 3% 0, 6% 8%, 100% 0, 97% 100%, 94% 92%, 91% 100%, 0 94%)' })
      A.node(ctx, 't-marker', cap.inner, { left: '0', right: '0', top: '26px', textAlign: 'center', fontSize: '76px', color: '#2a2a2a', whiteSpace: 'normal' }, t.cap)
      tl.set(cap.outer, { opacity: 0 }, 0)
      tl.set(cap.outer, { opacity: 1 }, 8.0)
      tl.fromTo(cap.outer, { y: 60, rotation: -5 }, { y: 0, rotation: -2, duration: 0.3, ease: steps(0.3), immediateRender: false }, 8.0)
      ctx.sfx(8.0, 'paper', { gain: 0.7 })

      // paper confetti: cut shapes falling
      for (let i = 0; i < 18; i++) {
        const w = 26 + r() * 30
        const c = A.node(ctx, '', ctx.stage, { position: 'absolute', left: 80 + r() * 920 + 'px', top: '-60px', width: w + 'px', height: w * 0.7 + 'px', background: ['#e0263a', '#fff8e8', '#2f6df6', '#f7c52b'][i % 4], clipPath: 'polygon(0 20%, 100% 0, 90% 100%, 10% 80%)', zIndex: 30, opacity: 0 })
        const at = 6.4 + r() * 1.2
        tl.set(c, { opacity: 1 }, at)
        tl.to(c, { y: 2100, rotation: (r() - 0.5) * 720, x: (r() - 0.5) * 200, duration: 2.6 + r(), ease: steps(2.8) }, at)
      }

      A.tag(ctx, { x: 90, y: 250, light: true })
      ctx.music([{ at: 0, bars: 5, part: 'lofi', gain: 0.85 }])
      A.sting(ctx, 11.8, { y: 520, light: true, scrim: true })
      A.grain(ctx, { opacity: 0.3 })
      COLD['a07-papel'](ctx0, C, lang)
    },
  })
}
