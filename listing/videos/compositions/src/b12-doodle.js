// A12 — a whiteboard doodle tutorial: "how to progress in 3 steps". Marker
// lines are drawn on (stroke-dash), wobble through a displacement filter and
// "boil" at 8 fps like hand animation. Educational is the highest-engagement
// fitness format (research A, Miracamp); the app is step 3's quiet answer.
// Sound: 100 BPM marimba + brushes, pen scratches for every stroke.

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: { hook: 'Cómo progresar<br>en el gym (3 pasos)', s1: '1. Anota el peso', s2: '2. Súbelo 2.5 kg', s3: '3. No lo olvides', rem: 'WTX lo recuerda' },
  en: { hook: 'How to progress<br>in the gym (3 steps)', s1: '1. Write the weight', s2: '2. Add 2.5 kg', s3: '3. Don’t forget it', rem: 'WTX remembers' },
}

const INK = '#16120f'
const RED = '#e0263a'
const GREEN = '#1f9d55'

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.8

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 14.4 + C,
    bpm: 100,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      A.node(ctx, 'layer', ctx.stage, { background: '#f6f6f1' })
      A.node(ctx, 'layer', ctx.stage, { background: 'linear-gradient(120deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.04) 100%)' })
      // marker tray
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', right: '0', top: '1620px', height: '40px', background: '#c9ccd1', boxShadow: '0 -6px 0 #dfe2e6' })
      for (const [x, c] of [[160, RED], [330, INK], [470, GREEN]]) A.node(ctx, '', ctx.stage, { position: 'absolute', left: x + 'px', top: '1566px', width: '130px', height: '54px', borderRadius: '10px', background: c, boxShadow: 'inset 0 8px 0 rgba(255,255,255,0.3)' })

      const rough = A.rough(ctx, 'rough12', { scale: 6, freq: 0.012 })
      rough.boil(0, ctx.duration, 8)
      const board = A.node(ctx, 'layer', ctx.stage, { filter: rough.css, zIndex: 10 })

      const stroke = (d, { at, dur = 0.6, color = INK, w = 9, parent = board, box = '0 0 1080 1920', sound = true } = {}) => {
        const svg = A.node(ctx, '', parent, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' }, `<svg viewBox="${box}" width="1080" height="1920" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" stroke-dasharray="1" d="${d}"/></svg>`)
        const p = svg.querySelector('path')
        tl.set(p, { strokeDashoffset: 1 }, 0)
        tl.to(p, { strokeDashoffset: 0, duration: dur, ease: 'power1.inOut' }, at)
        if (sound) ctx.sfx(at, 'pencil', { dur, gain: 0.7 })
        return p
      }
      const text = (html, o) => {
        const e = A.markerText(ctx, html, { sound: false, ...o })
        board.appendChild(e)
        if (o.sound !== false) ctx.sfx(o.at, 'pencil', { dur: o.dur ?? 0.6, gain: 0.7 })
        return e
      }

      // hook: on frame 0, no wipe
      const hook = A.node(ctx, 't-marker', board, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '92px', color: INK, lineHeight: 1.12 }, t.hook)
      tl.to(hook, { opacity: 0, duration: 0.3 }, 12.0)
      // underline the hook
      stroke('M170 560 C 400 580, 700 540, 910 566', { at: 0.4, dur: 0.5, color: RED, w: 12 })

      // step 1
      text(t.s1, { x: 90, y: 620, size: 72, at: 1.2, dur: 0.9 })
      stroke('M140 810 L700 810', { at: 2.3, dur: 0.35, w: 10 })
      stroke('M170 755 L170 865 L206 865 L206 755 Z', { at: 2.6, dur: 0.35, color: RED })
      stroke('M634 755 L634 865 L670 865 L670 755 Z', { at: 2.9, dur: 0.35, color: RED })
      text('70', { x: 790, y: 735, size: 100, at: 3.2, dur: 0.4, color: INK })
      stroke('M770 780 C 780 700, 940 700, 950 780 C 955 840, 775 850, 770 780', { at: 3.6, dur: 0.5, color: RED, w: 7 })

      // step 2
      text(t.s2, { x: 90, y: 930, size: 72, at: 4.6, dur: 0.9 })
      stroke('M200 1160 L200 1030 M160 1070 L200 1025 L240 1070', { at: 5.7, dur: 0.5, color: GREEN, w: 12 })
      text('+2.5', { x: 270, y: 1060, size: 76, at: 6.2, dur: 0.4, color: GREEN })
      text('72.5', { x: 560, y: 1040, size: 120, at: 6.6, dur: 0.5, color: RED, rotate: -3 })

      // step 3
      text(t.s3, { x: 90, y: 1250, size: 72, at: 7.8, dur: 0.9 })
      stroke('M800 1300 C 760 1300, 730 1340, 760 1380 C 740 1410, 780 1440, 810 1420 C 850 1450, 900 1420, 890 1380 C 930 1350, 900 1300, 860 1310 C 850 1290, 820 1290, 800 1300', { at: 8.9, dur: 0.7, w: 7, box: '0 90 1080 1920' })
      stroke('M770 1300 L900 1430 M900 1300 L770 1430', { at: 9.7, dur: 0.4, color: RED, w: 11, box: '0 90 1080 1920' })
      text(t.rem, { x: 90, y: 1390, size: 92, at: 10.2, dur: 0.9, color: RED, rotate: -2 })
      stroke('M90 1510 C 300 1530, 640 1490, 960 1516', { at: 11.1, dur: 0.5, color: RED, w: 12 })

      A.tag(ctx, { x: 90, y: 250, light: true })
      ctx.music([{ at: 0, bars: 6, part: 'doodle', gain: 0.9 }])
      A.sting(ctx, 12.7, { y: 520, light: true, scrim: true })
      A.grain(ctx, { opacity: 0.12 })
      COLD['a12-doodle'](ctx0, C, lang)
    },
  })
}
