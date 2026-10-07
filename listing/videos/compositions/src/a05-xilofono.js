// A05 — a weight plate bounces down a staircase of coloured plates and every
// landing plays a marimba note, so the animation PLAYS a tune (research C:
// sync is the whole trick; B: the format is a loop-able "satisfying" piece).
// The HUD counts the sets like a log: 1/24 … 24/24. Landing k happens at
// 1.0 + 0.5 k s, on the beat of the 120 BPM bed.

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'

const T = {
  es: { hook: 'Así suena<br>anotar 24 series', sets: 'SERIES', end: 'Cada serie cuenta.' },
  en: { hook: 'What logging<br>24 sets sounds like', sets: 'SETS', end: 'Every set counts.' },
}

const N = 24
const MELODY = [72, 76, 79, 76, 81, 79, 76, 74, 72, 76, 79, 76, 84, 81, 79, 76, 74, 76, 79, 81, 84, 81, 79, 84]
const PALS = [A.PAL.p25, A.PAL.p20, A.PAL.p15, A.PAL.p10, A.PAL.p5, A.PAL.chrome]
const KEY_W = 310
const KEY_H = 56
const R = 52

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
      A.node(ctx, 'layer', ctx.stage, { background: 'linear-gradient(#10152c, #1d1030 60%, #2a0f22)' })
      const grid = A.node(ctx, '', ctx.stage, { position: 'absolute', inset: '-10% 0', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)', backgroundSize: '100% 120px' })

      const world = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '5000px' })
      const keys = []
      for (let i = 0; i <= N; i++) {
        const last = i === N
        const x = 540 + Math.sin(i * 0.95) * 280
        const y = 900 + i * 150
        const w = last ? 560 : KEY_W
        const h = last ? 84 : KEY_H
        const pal = last ? ['#ffe08a', '#f7c52b', '#a87c06'] : PALS[i % PALS.length]
        const k = A.node(ctx, '', world, {
          position: 'absolute', left: x - w / 2 + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: '24px',
          background: `linear-gradient(180deg, ${pal[0]}, ${pal[1]} 60%, ${pal[2]})`,
          boxShadow: `0 14px 0 rgba(0,0,0,0.35), inset 0 4px 0 rgba(255,255,255,0.35)`, transformOrigin: '50% 100%',
        })
        // end caps like a plate seen from the side
        A.node(ctx, '', k, { position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.18)' })
        A.node(ctx, '', k, { position: 'absolute', right: '10px', top: '10px', bottom: '10px', width: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.18)' })
        if (last) A.node(ctx, 't-anton', k, { left: '0', right: '0', top: '10px', textAlign: 'center', fontSize: '64px', color: 'rgba(60,40,0,0.85)' }, 'PR 72.5')
        keys.push({ el: k, x, y, w, h })
      }
      const topOf = (k) => k.y - R

      // the ball: a little plate
      const ball = A.node(ctx, '', world, { position: 'absolute', left: '0', top: '0', width: '0', height: '0', zIndex: 10 })
      const spin = A.node(ctx, '', ball, { position: 'absolute', left: '0', top: '0' })
      A.disc(ctx, spin, { x: 0, y: 0, r: R, colors: A.PAL.p25, hole: 0.2 })

      const land = (k) => 1.0 + 0.5 * k
      const camY = (i) => 790 - topOf(keys[i])
      // camera and ball start above key 0
      gsap.set(world, { y: camY(0) })
      gsap.set(ball, { x: keys[0].x, y: topOf(keys[0]) - 420 })
      tl.to(ball, { y: topOf(keys[0]), duration: land(0), ease: 'power2.in' }, 0)
      tl.to(spin, { rotation: 360, duration: land(0), ease: 'none' }, 0)

      const hit = (k, at) => {
        const key = keys[k]
        const last = k === N
        tl.fromTo(key.el, { scaleY: 0.78, filter: 'brightness(1.6)' }, { scaleY: 1, filter: 'brightness(1)', duration: 0.4, ease: 'elastic.out(1,0.35)', immediateRender: false }, at)
        tl.fromTo(ball, { scaleX: 1.3, scaleY: 0.7, transformOrigin: '0 0' }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1,0.4)', immediateRender: false }, at)
        const midi = last ? 72 : MELODY[k]
        const pan = Math.max(-0.7, Math.min(0.7, (key.x - 540) / 400))
        if (last) {
          for (const m of [72, 76, 79, 84]) ctx.sfx(at, 'note', { inst: 'marimba', midi: m, dur: 0.9, gain: 1.1, pan: 0 })
          ctx.sfx(at, 'note', { inst: 'bell', midi: 96, dur: 1.2, gain: 1 })
          ctx.sfx(at, 'confirm', { gain: 1 })
        } else {
          ctx.sfx(at, 'note', { inst: 'marimba', midi, dur: 0.45, gain: 1.2, pan })
        }
      }
      for (let k = 0; k <= N; k++) hit(k, land(k))

      // the hops
      for (let k = 0; k < N; k++) {
        const a = keys[k]
        const b = keys[k + 1]
        const t0 = land(k)
        const apex = topOf(a) - 120
        tl.to(ball, { x: b.x, duration: 0.5, ease: 'none' }, t0)
        tl.to(ball, { y: apex, duration: 0.2, ease: 'power2.out' }, t0)
        tl.to(ball, { y: topOf(b), duration: 0.3, ease: 'power2.in' }, t0 + 0.2)
        tl.to(spin, { rotation: '+=' + (b.x > a.x ? 270 : -270), duration: 0.5, ease: 'none' }, t0)
        tl.to(world, { y: camY(k + 1), duration: 0.5, ease: 'sine.inOut' }, t0)
      }
      tl.to(grid, { y: -240, duration: land(N), ease: 'none' }, 0)

      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '760px', background: 'linear-gradient(#10152c 0%, #10152c 62%, rgba(16,21,44,0) 100%)', zIndex: 35 })
      // hook on frame 0, HUD that counts the sets
      const hook = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '92px', color: '#fff', zIndex: 40, whiteSpace: 'normal', textTransform: 'none' }, t.hook)
      tl.to(hook, { opacity: 0, duration: 0.3 }, 11.6)
      const hud = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '290px', width: '500px', top: '580px', padding: '14px 0', borderRadius: '999px', background: 'rgba(8,10,12,0.8)', border: '2px solid rgba(255,255,255,0.15)', textAlign: 'center', zIndex: 40 })
      for (let k = 0; k <= N; k++) {
        const e = A.node(ctx, 't-anton', hud, { position: 'absolute', left: '0', right: '0', top: '14px', fontSize: '60px', color: k === N ? '#ffd166' : '#fff', textTransform: 'none' }, `${k === N ? '✓ ' : ''}${k === N ? N : k} / ${N} ${t.sets}`)
        tl.set(e, { opacity: k === 0 ? 1 : 0 }, 0)
        if (k > 0) tl.set(e, { opacity: 1 }, land(k - 1))
        if (k < N) tl.set(e, { opacity: 0 }, land(k))
      }
      A.node(ctx, 't-anton', hud, { position: 'relative', fontSize: '60px', color: 'transparent', textTransform: 'none' }, `00 / ${N} ${t.sets}`)

      // payoff
      A.confetti(ctx, land(N), { x: 540, y: 1050, n: 50, up: 900, parent: ctx.stage })
      A.burst(ctx, land(N), { x: 540, y: 960, r: 560, color: '#ffd166', n: 18, parent: ctx.stage })
      const end = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '96px', color: '#fff', zIndex: 40, textTransform: 'none' }, t.end)
      tl.set(end, { opacity: 0 }, 0)
      tl.fromTo(end, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'expo.out', immediateRender: false }, land(N) + 0.3)

      A.tag(ctx, { x: 90, y: 250 })
      ctx.music([{ at: 0, bars: 8, part: 'doodle', gain: 0.55 }])
      A.sting(ctx, 14.3, { y: 1040, scrim: false })
      tl.to(end, { opacity: 0, duration: 0.2 }, 14.4)
      A.grain(ctx, { opacity: 0.1, blend: 'screen' })
    },
  })
}
