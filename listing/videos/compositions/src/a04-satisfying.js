// A04 — an oddly satisfying loop: loading 72.5 kg onto a bar (20 kg bar +
// 2 × 25 + 2 × 1.25) and unloading it again, so the last frame is the first.
// "Visual ASMR": perfect timing, every clank on the frame it lands, NO music
// (research A: loops; C: ASMR/sound-led). 72.5 is the PR WTX's own demo shows.

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'

const T = {
  es: { hook: 'EL SONIDO DE<br>CARGAR 72.5 KG', kg: 'KG' },
  en: { hook: 'THE SOUND OF<br>LOADING 72.5 KG', kg: 'KG' },
}

const BAR_Y = 980
const LX = 345 // inner shoulder of the left sleeve
const RX = 735

function plateEl(ctx, parent, { w, h, pal, label }) {
  const e = A.node(ctx, '', parent, {
    position: 'absolute', width: w + 'px', height: h + 'px', top: BAR_Y - h / 2 + 'px', borderRadius: Math.min(14, w / 2) + 'px',
    background: `linear-gradient(90deg, ${pal[2]} 0%, ${pal[1]} 14%, ${pal[0]} 42%, ${pal[1]} 74%, ${pal[2]} 100%)`,
    boxShadow: 'inset 0 6px 0 rgba(255,255,255,0.28), inset 0 -10px 20px rgba(0,0,0,0.35), 0 24px 40px rgba(0,0,0,0.5)',
  })
  // a ring and the weight, like the real thing
  A.node(ctx, '', e, { position: 'absolute', left: '0', right: '0', top: h * 0.12 + 'px', height: '5px', background: 'rgba(0,0,0,0.22)' })
  A.node(ctx, '', e, { position: 'absolute', left: '0', right: '0', bottom: h * 0.12 + 'px', height: '5px', background: 'rgba(0,0,0,0.22)' })
  if (label) A.node(ctx, 't-anton', e, { left: '0', width: h * 0.5 + 'px', top: h * 0.5 - w * 0.5 + 'px', fontSize: w * 0.62 + 'px', color: 'rgba(0,0,0,0.5)', transformOrigin: '0 0', textTransform: 'none', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1 }, label)
  return e
}

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 10,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      // stage: dark teal-black with a soft spot, and the floor
      A.node(ctx, 'layer', ctx.stage, { background: 'radial-gradient(70% 45% at 50% 50%, #1b2a33 0%, #0a1014 70%, #05080a 100%)' })
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', right: '0', top: BAR_Y + 250 + 'px', bottom: '0', background: 'linear-gradient(#0e1519, #070b0e)' })
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '60px', width: '960px', top: BAR_Y + 232 + 'px', height: '60px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.65), transparent)' })

      const rig = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' })
      const leftEnd = A.node(ctx, '', rig, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' })
      const rightEnd = A.node(ctx, '', rig, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' })
      gsap.set(rig, { scale: 1.3, transformOrigin: `540px ${BAR_Y}px` })
      gsap.set(leftEnd, { transformOrigin: `${LX}px ${BAR_Y}px` })
      gsap.set(rightEnd, { transformOrigin: `${RX}px ${BAR_Y}px` })

      // shaft (knurled) and sleeves
      A.node(ctx, '', rig, { position: 'absolute', left: LX + 'px', width: RX - LX + 'px', top: BAR_Y - 13 + 'px', height: '26px', borderRadius: '6px', background: 'repeating-linear-gradient(90deg, #8d96a0 0 3px, #aab2bb 3px 6px)', boxShadow: 'inset 0 5px 4px rgba(255,255,255,0.35), inset 0 -6px 6px rgba(0,0,0,0.4)' })
      for (const [x, w] of [[205, LX - 205], [RX, 880 - RX]]) {
        A.node(ctx, '', x < 500 ? leftEnd : rightEnd, { position: 'absolute', left: x + 'px', width: w + 'px', top: BAR_Y - 21 + 'px', height: '42px', borderRadius: '8px', background: 'linear-gradient(#f4f6f8, #98a1ab 55%, #dfe3e8)', boxShadow: 'inset 0 -4px 6px rgba(0,0,0,0.25), 0 3px 0 rgba(0,0,0,0.3)' })
      }

      // the plates: [side, slot x, w, h, palette, label, appear time]
      const plates = []
      const add = (side, w, h, pal, label, x, at, out, snd) => {
        const g = side < 0 ? leftEnd : rightEnd
        const e = plateEl(ctx, g, { w, h, pal, label })
        const final = side < 0 ? x - w : x
        e.style.left = final + 'px'
        const dist = side < 0 ? -760 : 760
        tl.set(e, { opacity: 0 }, 0)
        tl.fromTo(e, { x: dist, opacity: 1 }, { x: 0, duration: 0.26, ease: 'power3.in', immediateRender: false }, at - 0.26)
        tl.set(e, { opacity: 1 }, at - 0.26)
        // squash on landing
        tl.fromTo(e, { scaleX: 0.86, scaleY: 1.02 }, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1.2,0.35)', immediateRender: false }, at)
        // and off again
        tl.to(e, { x: dist, duration: 0.22, ease: 'power2.in' }, out - 0.22)
        tl.set(e, { opacity: 0 }, out)
        ctx.sfx(at, snd, { gain: snd === 'clank' ? 1 : 0.9 })
        plates.push(e)
        // the bar answers every landing
        tl.fromTo(rig, { y: 9 }, { y: 0, duration: 0.5, ease: 'elastic.out(1,0.3)', immediateRender: false }, at)
        return e
      }
      // sequence: load, lift, unload
      add(-1, 60, 460, A.PAL.p25, '25', LX, 0.9, 8.3, 'clank')
      add(1, 60, 460, A.PAL.p25, '25', RX + 0, 1.6, 7.9, 'clank')
      add(-1, 26, 170, A.PAL.chrome, '1.25', LX - 60, 2.4, 7.5, 'clack')
      add(1, 26, 170, A.PAL.chrome, '1.25', RX + 60, 3.0, 7.1, 'clack')
      // collars
      const collar = (side, x, at, out) => {
        const g = side < 0 ? leftEnd : rightEnd
        const e = A.node(ctx, '', g, { position: 'absolute', left: (side < 0 ? x - 30 : x) + 'px', top: BAR_Y - 42 + 'px', width: '30px', height: '84px', borderRadius: '8px', background: 'linear-gradient(90deg, #555c64, #9aa2ab 40%, #3a4047)', boxShadow: '0 10px 18px rgba(0,0,0,0.5)' })
        const dist = side < 0 ? -90 : 90
        tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, at - 0.15)
        tl.fromTo(e, { x: dist, y: -50 }, { x: 0, y: 0, duration: 0.15, ease: 'power2.in', immediateRender: false }, at - 0.15)
        tl.to(e, { x: dist, y: -50, duration: 0.15, ease: 'power2.out' }, out - 0.15)
        tl.set(e, { opacity: 0 }, out)
        ctx.sfx(at, 'clack', { gain: 0.8 })
        ctx.sfx(out - 0.15, 'clack', { gain: 0.7 })
      }
      collar(-1, LX - 60 - 26, 3.7, 6.7)
      collar(1, RX + 60 + 26, 3.9, 6.5)

      // lift: the bar bows
      tl.to(rig, { y: -150, duration: 0.55, ease: 'power2.out' }, 4.6)
      tl.to(leftEnd, { rotation: -5, duration: 0.3, ease: 'power2.out' }, 4.7)
      tl.to(rightEnd, { rotation: 5, duration: 0.3, ease: 'power2.out' }, 4.7)
      tl.to([leftEnd, rightEnd], { rotation: 0, duration: 1.0, ease: 'elastic.out(1,0.25)' }, 5.0)
      ctx.sfx(4.6, 'riser', { dur: 0.5, gain: 0.5 })
      ctx.sfx(5.1, 'plate', { gain: 0.7 })
      tl.to(rig, { y: 0, duration: 0.4, ease: 'power2.in' }, 6.1)
      tl.fromTo(rig, { y: -0 }, { y: 0, duration: 0.01 }, 6.5)
      ctx.sfx(6.5, 'thud', { gain: 0.9 })

      // hook (on frame 0) and the running total
      const hook = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '100px', color: '#fff', zIndex: 40, whiteSpace: 'normal' }, t.hook)
      tl.set(hook, { opacity: 0 }, 4.5)
      tl.set(hook, { opacity: 1 }, 7.1)
      const totals = [['20', 0], ['45', 0.9], ['70', 1.6], ['71.25', 2.4], ['72.5', 3.0], ['71.25', 7.1], ['70', 7.5], ['45', 7.9], ['20', 8.3]]
      totals.forEach(([v, at], i) => {
        const e = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '1320px', textAlign: 'center', fontSize: '200px', color: v === '72.5' ? '#ff5468' : '#fff', zIndex: 40 }, `${v}<span style="font-size:80px;color:#8b97a4"> ${t.kg}</span>`)
        if (at > 0) tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, at + (at > 0 ? 0 : 0))
        const until = totals[i + 1]?.[1]
        if (until !== undefined) tl.set(e, { opacity: 0 }, until)
        if (at > 0) tl.fromTo(e, { scale: 1.15 }, { scale: 1, duration: 0.2, ease: 'expo.out', immediateRender: false }, at)
      })
      // PR sparkle at the top of the lift
      A.burst(ctx, 5.1, { x: 540, y: 820, r: 520, color: '#ffd166', n: 16, w: 10, parent: ctx.stage })
      const pr = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '1180px', textAlign: 'center', fontSize: '70px', color: '#ffd166', letterSpacing: '0.2em', zIndex: 40 }, 'PR')
      tl.set(pr, { opacity: 0 }, 0)
      tl.set(pr, { opacity: 1 }, 5.1)
      tl.set(pr, { opacity: 0 }, 6.3)

      A.tag(ctx, { x: 90, y: 250 })
      // the logo rides on the lift, then clears so the loop is clean
      A.sting(ctx, 4.6, { y: 320, scrim: false, out: 7.0 })
      A.grain(ctx, { opacity: 0.1, blend: 'screen' })
      // (no ctx.music: this one is the sound of the iron)
    },
  })
}
