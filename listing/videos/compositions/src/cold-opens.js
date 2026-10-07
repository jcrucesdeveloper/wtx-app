// Cold opens for the "b" series (research 10, the Hook Gate): the first 1.2–1.8 s
// of every reel shows the PAYOFF, a 3–7 word text hook (negative or numeric),
// a sound hit at t = 0 and a motion punch, then rewinds into the story.
// Each builder gets the REAL ctx (times 0 … C), the cold-open length C and the
// language. They return nothing; the cover comes off at C.

import * as A from '../../lib/art.js'
import * as K from '../../lib/kit.js'

const L = (lang, es, en) => (lang === 'es' ? es : en)

/** Everything inside `box` can be glitched by the rewind. */
function open(ctx, C, bg) {
  const c = A.cover(ctx, C, bg)
  const box = A.node(ctx, '', c, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' })
  return { c, box }
}
const punch = (ctx, box, from = 1.12) => ctx.tl.fromTo(box, { scale: from }, { scale: 1, duration: 0.5, ease: 'expo.out', immediateRender: false, transformOrigin: '540px 960px' }, 0)

export const COLD = {
  /* a01: the crushed stick figure */
  'a01-olvido'(ctx, C, lang) {
    const { box } = open(ctx, C, '#f3ead8')
    const rough = A.rough(ctx, 'roughC1', { scale: 4, freq: 0.014 })
    rough.boil(0, C, 8)
    box.style.filter = rough.css
    A.node(ctx, '', box, { position: 'absolute', left: '60px', width: '960px', top: '1300px', height: '10px', background: A.PAL.ink, borderRadius: '6px' })
    const rig = A.stickRig(ctx, box, { x: 470, y: 1330, scale: 2.2 })
    A.poseNow(rig, { hip: 96, lean: 40, head: 10, aF: [-6, 0], aB: [-6, 0], lF: [-85, 130, -135], lB: [-70, 120, -130] })
    A.mood(ctx, rig, 'o', 0)
    const h = A.handPos(ctx, rig)
    for (let i = 2; i >= 0; i--) A.disc(ctx, box, { x: h.x + i * 36, y: h.y - i * 36, r: 130, colors: A.PAL.p25, hole: 0.16 })
    A.node(ctx, 't-anton', box, { left: h.x + 72 - 90 + 'px', top: h.y - 72 - 50 + 'px', width: '180px', textAlign: 'center', fontSize: '100px', color: 'rgba(0,0,0,0.55)', textTransform: 'none' }, '75')
    ctx.tl.fromTo(rig.root, { scaleX: 3.0, scaleY: 1.5 }, { scaleX: 2.2, scaleY: 2.2, duration: 0.6, ease: 'elastic.out(1,0.35)', immediateRender: false }, 0)
    A.hookText(ctx, box, L(lang, '¿75? ¿60?<br>NI IDEA.', '75? 60?<br>NO IDEA.'), { y: 380, size: 150, color: A.PAL.ink })
    ctx.sfx(0, 'slam', { gain: 1 })
    ctx.sfx(0.05, 'fail', { gain: 0.9 })
    A.shakeX(ctx, box, 0, { amp: 18, n: 8, dur: 0.4 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a02: Placa, shouting */
  'a02-placa'(ctx, C, lang) {
    const { box } = open(ctx, C, 'radial-gradient(80% 60% at 50% 55%, #7a0f1f, #14050a)')
    A.hookText(ctx, box, L(lang, 'ELLA SABE QUE<br>NO ENTRENASTE', 'SHE KNOWS<br>YOU SKIPPED'), { y: 330, size: 124 })
    const n = A.node(ctx, '', box, { position: 'absolute', left: '90px', width: '900px', top: '660px', padding: '26px 30px', borderRadius: '38px', background: '#e0263a', border: '2px solid rgba(255,255,255,0.3)', zIndex: 30, display: 'flex', gap: '26px', alignItems: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' })
    const ic = A.node(ctx, '', n, { position: 'relative', width: '96px', height: '96px', flex: '0 0 96px' })
    A.disc(ctx, ic, { x: 48, y: 48, r: 46, colors: A.PAL.p25, hole: 0 })
    A.node(ctx, '', n, { flex: '1', font: '700 24px Inter', color: '#ffd5da' }, `PLACA <span style="float:right">20:45</span><div style="font:800 64px Inter;color:#fff;letter-spacing:-0.02em;line-height:1.1;margin-top:6px;clear:both">${L(lang, 'ESTOY.<br>ESPERANDO.', 'I AM.<br>WAITING.')}</div>`)
    const m = A.mascot(ctx, box, { x: 540, y: 1260, size: 640, limbs: '#e9edf2' })
    A.emote(ctx, m, 'angry', 0, 0.01)
    ctx.tl.fromTo(m.root, { scale: 0.7 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', immediateRender: false, transformOrigin: '0 0' }, 0)
    ctx.tl.to(m.armL, { rotation: 60, duration: 0.2 }, 0)
    ctx.tl.to(m.armR, { rotation: -60, duration: 0.2 }, 0)
    ctx.sfx(0, 'slam', { gain: 1 })
    ctx.sfx(0.05, 'boing', { gain: 0.8 })
    A.shakeX(ctx, box, 0.05, { amp: 14, n: 8, dur: 0.5 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a03: "stop writing it in Notes" */
  'a03-tipografia'(ctx, C, lang) {
    const { box } = open(ctx, C, '#e0263a')
    const a = A.node(ctx, 't-anton', box, { left: '0', width: '1080px', top: '560px', textAlign: 'center', fontSize: '190px', color: '#fff', whiteSpace: 'normal', lineHeight: 1.0 }, L(lang, 'DEJA DE<br>ANOTAR EN', 'STOP WRITING<br>IT IN'))
    const b = A.node(ctx, 't-anton', box, { left: '0', width: '1080px', top: '960px', textAlign: 'center', fontSize: '260px', color: '#05080a', lineHeight: 1.0 }, L(lang, 'NOTAS.', 'NOTES.'))
    const strike = A.node(ctx, '', box, { position: 'absolute', left: '170px', width: '740px', top: '1075px', height: '34px', background: '#fff', borderRadius: '8px', transformOrigin: '0 50%' })
    ctx.tl.fromTo(strike, { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'power3.out', immediateRender: false }, 0.5)
    ctx.sfx(0.5, 'hit', { gain: 0.8 })
    for (const e of [a, b]) {
      ctx.tl.fromTo(e, { scale: 1.6 }, { scale: 1, duration: 0.18, ease: 'power4.out', immediateRender: false }, 0)
      ctx.tl.set(e, { textShadow: '14px 0 #ff2a44, -14px 0 #00e5ff' }, 0.02)
      ctx.tl.set(e, { textShadow: 'none' }, 0.12)
    }
    ctx.sfx(0, 'slam', { gain: 1 })
    ctx.sfx(0, 'cowbell', { gain: 0.9 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a04: the loaded bar at the top of the lift */
  'a04-satisfying'(ctx, C, lang) {
    const { box } = open(ctx, C, 'radial-gradient(70% 45% at 50% 50%, #1b2a33 0%, #0a1014 70%, #05080a 100%)')
    const Y = 980
    const g = A.node(ctx, '', box, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', transformOrigin: `540px ${Y}px` })
    gsap.set(g, { scale: 1.3, y: -40 })
    const rect = (css) => A.node(ctx, '', g, { position: 'absolute', ...css })
    rect({ left: '345px', width: '390px', top: Y - 13 + 'px', height: '26px', borderRadius: '6px', background: 'repeating-linear-gradient(90deg, #8d96a0 0 3px, #aab2bb 3px 6px)' })
    rect({ left: '205px', width: '140px', top: Y - 21 + 'px', height: '42px', borderRadius: '8px', background: 'linear-gradient(#f4f6f8, #98a1ab 55%, #dfe3e8)' })
    rect({ left: '735px', width: '145px', top: Y - 21 + 'px', height: '42px', borderRadius: '8px', background: 'linear-gradient(#f4f6f8, #98a1ab 55%, #dfe3e8)' })
    const plate = (x, w, h, pal) => rect({ left: x + 'px', width: w + 'px', top: Y - h / 2 + 'px', height: h + 'px', borderRadius: Math.min(14, w / 2) + 'px', background: `linear-gradient(90deg, ${pal[2]} 0%, ${pal[1]} 14%, ${pal[0]} 42%, ${pal[1]} 74%, ${pal[2]} 100%)`, boxShadow: 'inset 0 6px 0 rgba(255,255,255,0.28), inset 0 -10px 20px rgba(0,0,0,0.35)' })
    plate(285, 60, 460, A.PAL.p25)
    plate(735, 60, 460, A.PAL.p25)
    plate(259, 26, 170, A.PAL.chrome)
    plate(795, 26, 170, A.PAL.chrome)
    ctx.tl.fromTo(g, { y: -220, rotation: 0 }, { y: -40, duration: 0.5, ease: 'elastic.out(1,0.3)', immediateRender: false }, 0)
    A.burst(ctx, 0, { x: 540, y: 820, r: 520, color: '#ffd166', n: 16, w: 10, parent: box })
    A.hookText(ctx, box, L(lang, 'SONIDO ON.<br>ESCUCHA.', 'SOUND ON.<br>LISTEN.'), { y: 330, size: 130 })
    A.node(ctx, 't-anton', box, { left: '0', width: '1080px', top: '1320px', textAlign: 'center', fontSize: '200px', color: '#ff5468' }, '72.5<span style="font-size:80px;color:#8b97a4"> KG</span>')
    ctx.sfx(0, 'clank', { gain: 1.2 })
    ctx.sfx(0, 'plate', { gain: 0.9 })
    ctx.sfx(0.02, 'slam', { gain: 0.7 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a05: the last key, 24/24 */
  'a05-xilofono'(ctx, C, lang) {
    const { box } = open(ctx, C, 'linear-gradient(#10152c, #1d1030 60%, #2a0f22)')
    A.hookText(ctx, box, L(lang, '24 SERIES.<br>UNA CANCIÓN.', '24 SETS.<br>ONE SONG.'), { y: 330, size: 130 })
    const key = A.node(ctx, '', box, { position: 'absolute', left: '260px', top: '1000px', width: '560px', height: '84px', borderRadius: '24px', background: 'linear-gradient(180deg, #ffe08a, #f7c52b 60%, #a87c06)', boxShadow: '0 14px 0 rgba(0,0,0,0.35), inset 0 4px 0 rgba(255,255,255,0.35)' })
    A.node(ctx, 't-anton', key, { left: '0', right: '0', top: '10px', textAlign: 'center', fontSize: '64px', color: 'rgba(60,40,0,0.85)' }, 'PR 72.5')
    const ball = A.node(ctx, '', box, { position: 'absolute', left: '0', top: '0', width: '0', height: '0' })
    A.disc(ctx, ball, { x: 0, y: 0, r: 52, colors: A.PAL.p25, hole: 0.2 })
    gsap.set(ball, { x: 540, y: 880 })
    ctx.tl.fromTo(ball, { y: 300 }, { y: 940, duration: 0.3, ease: 'power2.in', immediateRender: false }, 0)
    ctx.tl.fromTo(key, { scaleY: 0.78, filter: 'brightness(1.8)' }, { scaleY: 1, filter: 'brightness(1)', duration: 0.5, ease: 'elastic.out(1,0.35)', immediateRender: false, transformOrigin: '50% 100%' }, 0.3)
    A.confetti(ctx, 0.3, { x: 540, y: 1000, n: 40, up: 800, parent: box, sound: false })
    for (const m of [72, 76, 79, 84]) ctx.sfx(0.3, 'note', { inst: 'marimba', midi: m, dur: 0.9, gain: 1.1 })
    ctx.sfx(0.3, 'confirm', { gain: 1 })
    ctx.sfx(0, 'slam', { gain: 0.8 })
    const hud = A.node(ctx, 't-anton', box, { left: '290px', width: '500px', top: '600px', padding: '14px 0', borderRadius: '999px', background: 'rgba(8,10,12,0.8)', border: '2px solid rgba(255,255,255,0.15)', textAlign: 'center', fontSize: '60px', color: '#ffd166', textTransform: 'none' }, `✓ 24 / 24 ${L(lang, 'SERIES', 'SETS')}`)
    void hud
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a06: the record card first, then "the receipts" */
  'a06-resumen'(ctx, C, lang) {
    const { box } = open(ctx, C, 'radial-gradient(90% 60% at 30% 20%, #1fb36b, #06432a)')
    A.hookText(ctx, box, L(lang, 'BATÍ MI RÉCORD.', 'I BEAT MY PR.'), { y: 340, size: 140 })
    const n = A.node(ctx, 't-anton', box, { left: '0', width: '1080px', top: '620px', textAlign: 'center', fontSize: '420px', color: '#fff', lineHeight: 1 }, '72.5<span style="font-size:130px"> kg</span>')
    ctx.tl.fromTo(n, { scale: 1.7 }, { scale: 1, duration: 0.22, ease: 'expo.out', immediateRender: false }, 0)
    A.node(ctx, '', box, { position: 'absolute', left: '390px', top: '1130px', width: '300px', height: '300px', color: '#fff' }, K.ICONS.trophy)
    A.node(ctx, 't-inter', box, { left: '0', width: '1080px', top: '1480px', textAlign: 'center', fontSize: '64px', color: 'rgba(255,255,255,0.9)', fontWeight: '800' }, L(lang, 'las pruebas ↓', 'the receipts ↓'))
    A.confetti(ctx, 0.05, { x: 540, y: 900, n: 44, up: 900, parent: box })
    ctx.sfx(0, 'slam', { gain: 1 })
    ctx.sfx(0.05, 'confirm', { gain: 1 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a07: the notebook, mid-air above the bin */
  'a07-papel'(ctx, C, lang) {
    const { box } = open(ctx, C, '#c9a878')
    A.node(ctx, '', box, { position: 'absolute', inset: '0', background: 'radial-gradient(80% 60% at 50% 40%, rgba(255,240,210,0.35), rgba(90,55,20,0.28))' })
    const bin = A.node(ctx, '', box, { position: 'absolute', left: '560px', top: '1180px', width: '340px', height: '360px', background: 'repeating-linear-gradient(90deg, #8f6a3c 0 38px, #7a5830 38px 76px)', clipPath: 'polygon(6% 0, 94% 0, 82% 100%, 18% 100%)', boxShadow: '0 10px 0 rgba(60,35,10,0.28)' })
    A.node(ctx, '', bin, { position: 'absolute', left: '0', right: '0', top: '0', height: '30px', background: '#a07a48' })
    const ball = A.node(ctx, '', box, { position: 'absolute', left: '0', top: '0', width: '200px', height: '200px' })
    A.node(ctx, '', ball, { position: 'absolute', inset: '0', background: '#fbf7ec', clipPath: 'polygon(25% 10%, 50% 0, 80% 14%, 100% 45%, 82% 85%, 50% 100%, 18% 88%, 0 50%, 8% 22%)', filter: 'drop-shadow(0 8px 0 rgba(60,35,10,0.3))' })
    A.node(ctx, 't-marker', ball, { left: '40px', top: '70px', fontSize: '46px', color: A.PAL.red, transform: 'rotate(-12deg)' }, '75??')
    gsap.set(ball, { x: 300, y: 560 })
    const steps = (d) => `steps(${Math.max(1, Math.round(d * 12))})`
    ctx.tl.to(ball, { x: 640, duration: 0.7, ease: steps(0.7) }, 0)
    ctx.tl.to(ball, { y: 360, duration: 0.2, ease: steps(0.2) }, 0)
    ctx.tl.to(ball, { y: 1150, duration: 0.5, ease: steps(0.5) }, 0.2)
    ctx.tl.to(ball, { rotation: 500, duration: 0.7, ease: 'none' }, 0)
    ctx.tl.set(ball, { opacity: 0 }, 0.72)
    ctx.tl.fromTo(bin, { scaleX: 1.1, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: steps(0.3), immediateRender: false }, 0.72)
    const tape = A.node(ctx, '', box, { position: 'absolute', left: '80px', width: '920px', top: '330px', height: '230px', background: 'rgba(255,232,120,0.92)', clipPath: 'polygon(0 6%, 3% 0, 6% 8%, 100% 0, 97% 100%, 94% 92%, 91% 100%, 0 94%)', transform: 'rotate(-2deg)', boxShadow: '0 10px 0 rgba(60,35,10,0.25)' })
    A.node(ctx, 't-marker', tape, { left: '0', right: '0', top: '30px', textAlign: 'center', fontSize: '92px', color: '#2a2a2a', whiteSpace: 'normal' }, L(lang, 'TIRA TU LIBRETA<br>DEL GYM', 'BIN YOUR<br>GYM NOTEBOOK'))
    ctx.tl.fromTo(tape, { scale: 1.3, rotation: -6 }, { scale: 1, rotation: -2, duration: 0.2, ease: 'steps(3)', immediateRender: false }, 0)
    ctx.sfx(0, 'slam', { gain: 0.9 })
    ctx.sfx(0, 'paper', { gain: 1 })
    ctx.sfx(0.72, 'thud', { gain: 1 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a08: the finished list, glitching */
  'a08-codigo'(ctx, C, lang) {
    const { box } = open(ctx, C, 'radial-gradient(80% 55% at 50% 45%, #14202a, #05080a)')
    A.hookText(ctx, box, L(lang, 'TU RUTINA:<br>5 LÍNEAS.', 'YOUR ROUTINE:<br>5 LINES.'), { y: 330, size: 140 })
    const items = [['Bench Press', '4 × 8 · 72.5 kg'], ['Overhead Press', '3 × 10 · 30 kg'], ['Plank', '1:30']]
    items.forEach(([name, d], i) => {
      const c = A.node(ctx, '', box, { position: 'absolute', left: '90px', width: '900px', top: 760 + i * 190 + 'px', height: '160px', borderRadius: '34px', background: 'rgba(24,30,38,0.96)', border: '2px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', padding: '0 36px', gap: '28px' })
      A.node(ctx, '', c, { flex: '0 0 76px', height: '76px', borderRadius: '50%', background: '#e0263a', color: '#fff', display: 'grid', placeItems: 'center' }, `<div style="width:42px;height:42px">${K.ICONS.check}</div>`)
      A.node(ctx, '', c, { flex: '1', font: '800 52px Inter', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }, `${name}<div style="font:600 36px 'JetBrains Mono',monospace;color:#8b97a4;margin-top:6px">${d}</div>`)
      ctx.tl.fromTo(c, { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.2, ease: 'back.out(2)', immediateRender: false }, i * 0.1)
      ctx.sfx(i * 0.1, 'pop', { gain: 0.8 })
    })
    const r = A.rng(8)
    for (let f = 0; f < 5; f++) {
      const b = A.node(ctx, '', box, { position: 'absolute', left: '0', width: '1080px', top: 600 + r() * 800 + 'px', height: 8 + r() * 26 + 'px', background: r() > 0.5 ? '#ff2a44' : '#00e5ff', mixBlendMode: 'screen', zIndex: 62, opacity: 0 })
      ctx.tl.set(b, { opacity: 0.8 }, 0.1 + f / 30)
      ctx.tl.set(b, { opacity: 0 }, 0.1 + (f + 1) / 30)
    }
    ctx.sfx(0, 'slam', { gain: 0.9 })
    ctx.sfx(0.1, 'glitch', { gain: 1, dur: 0.22 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a09: K.O. */
  'a09-boss'(ctx, C, lang) {
    const { box } = open(ctx, C, '#0b0a1f')
    A.node(ctx, '', box, { position: 'absolute', inset: '0', background: 'linear-gradient(#0b0a1f, #2e1a52)' })
    A.hookText(ctx, box, L(lang, 'TU RÉCORD =<br>JEFE FINAL', 'YOUR PR =<br>FINAL BOSS'), { y: 330, size: 70, font: 't-pixel', color: '#fff' })
    const ko = A.node(ctx, 't-pixel', box, { left: '0', width: '1080px', top: '760px', textAlign: 'center', fontSize: '230px', color: '#ff5468', textShadow: '10px 10px 0 #14101c' }, 'K.O.')
    ctx.tl.fromTo(ko, { scale: 2.4 }, { scale: 1, duration: 0.25, ease: 'steps(5)', immediateRender: false }, 0)
    const r = A.rng(4)
    for (let i = 0; i < 30; i++) {
      const sz = (2 + Math.floor(r() * 3)) * 8
      const d = A.node(ctx, '', box, { position: 'absolute', left: '540px', top: '860px', width: sz + 'px', height: sz + 'px', background: ['#e0263a', '#ff5468', '#7d0f1d', '#fff', '#14101c'][i % 5], zIndex: 30 })
      ctx.tl.to(d, { x: (r() - 0.5) * 1100, duration: 1.0, ease: 'steps(12)' }, 0)
      ctx.tl.to(d, { y: -200 - r() * 500 + 900, duration: 1.0, ease: 'steps(12)' }, 0)
    }
    const flash = A.node(ctx, '', box, { position: 'absolute', inset: '0', background: '#fff', zIndex: 90, opacity: 0.9 })
    ctx.tl.to(flash, { opacity: 0, duration: 0.2 }, 0.04)
    ctx.sfx(0, 'ko', { gain: 1 })
    ctx.sfx(0, 'slam', { gain: 0.8 })
    A.shakeX(ctx, box, 0.02, { amp: 28, n: 10, dur: 0.5 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a10: a bean losing it over a washing machine */
  'a10-tontas'(ctx, C, lang) {
    const { box } = open(ctx, C, '#bfeadb')
    A.node(ctx, '', box, { position: 'absolute', left: '0', right: '0', top: '1360px', bottom: '0', background: '#7fcfb8' })
    A.hookText(ctx, box, L(lang, '¡MI RÉCORD!<br>¡ESTABA AHÍ!', 'MY PR!<br>IT WAS IN THERE!'), { y: 330, size: 124, color: '#173a33' })
    const m = A.node(ctx, '', box, { position: 'absolute', left: '560px', top: '960px', width: '400px', height: '400px', background: '#eef2f5', borderRadius: '36px', boxShadow: '0 10px 0 rgba(0,0,0,0.15)' })
    const port = A.node(ctx, '', m, { position: 'absolute', left: '60px', top: '100px', width: '280px', height: '280px', borderRadius: '50%', background: '#2f6df6', border: '18px solid #b9c3cc', overflow: 'hidden' })
    const drum = A.node(ctx, '', port, { position: 'absolute', inset: '0' })
    A.node(ctx, '', drum, { position: 'absolute', left: '70px', top: '80px', width: '100px', height: '110px', background: '#fff', borderRadius: '8px', border: '4px solid #333' })
    ctx.tl.to(drum, { rotation: 720, duration: C, ease: 'none' }, 0)
    // the bean, arms up, screaming
    const root = A.node(ctx, 'rig', box, { left: '340px', top: '1360px' })
    const w = 250
    const h = 310
    A.node(ctx, '', root, { position: 'absolute', left: -w / 2 + 'px', top: -(h + 36) + 'px', width: w + 'px', height: h + 'px', borderRadius: w / 2 + 'px', background: 'linear-gradient(90deg, #7be0a7 0 70%, #3fb877 130%)', boxShadow: 'inset -14px 0 0 #3fb87755' })
    const body = root.lastChild
    for (const s of [-1, 1]) {
      const e = A.node(ctx, '', body, { position: 'absolute', left: w / 2 + s * 46 - 34 + 'px', top: h * 0.2 + 'px', width: '68px', height: '72px', borderRadius: '50%', background: '#fff', border: '4px solid #1b1b1b', overflow: 'hidden' })
      A.node(ctx, '', e, { position: 'absolute', left: '22px', top: '26px', width: '24px', height: '26px', borderRadius: '50%', background: '#1b1b1b' })
      const arm = A.node(ctx, 'joint', root, { left: s * (w / 2 - 4) + 'px', top: -(36 + h * 0.55) + 'px' })
      A.node(ctx, 'bone', arm, { left: '-11px', top: '-6px', width: '22px', height: '110px', borderRadius: '11px' }).style.background = '#3fb877'
      gsap.set(arm, { rotation: s * 160 })
      ctx.tl.to(arm, { rotation: s * 130, duration: 0.12, yoyo: true, repeat: 8 }, 0)
    }
    A.node(ctx, '', body, { position: 'absolute', left: w / 2 - 34 + 'px', top: h * 0.5 + 'px', width: '68px', height: '90px', borderRadius: '50%', background: '#1b1b1b' })
    ctx.tl.fromTo(root, { y: -40 }, { y: 0, duration: 0.3, ease: 'bounce.out', immediateRender: false }, 0)
    ctx.sfx(0, 'slam', { gain: 0.9 })
    ctx.sfx(0.05, 'fail', { gain: 0.9 })
    ctx.sfx(0.1, 'bubble', { gain: 0.8 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a11: a jolt of light and the time */
  'a11-noche'(ctx, C, lang) {
    const { box } = open(ctx, C, '#03060a')
    A.node(ctx, '', box, { position: 'absolute', inset: '0', background: 'radial-gradient(70% 50% at 70% 35%, rgba(150,180,255,0.35), transparent 70%)' })
    const t = A.node(ctx, '', box, { position: 'absolute', left: '0', width: '1080px', top: '700px', textAlign: 'center', font: '700 300px "JetBrains Mono", monospace', color: '#ff5468', textShadow: '0 0 60px rgba(224,38,58,0.8)' }, '6:00')
    ctx.tl.set(t, { opacity: 0.2 }, 0.45)
    ctx.tl.set(t, { opacity: 1 }, 0.55)
    A.hookText(ctx, box, L(lang, 'NADIE<br>TE VE.', "NOBODY'S<br>WATCHING."), { y: 1050, size: 170 })
    const flash = A.node(ctx, '', box, { position: 'absolute', inset: '0', background: '#dbe7ff', zIndex: 90, opacity: 1 })
    ctx.tl.to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 0.03)
    ctx.tl.fromTo(box, { scale: 1.25 }, { scale: 1, duration: C, ease: 'power2.out', transformOrigin: '540px 960px' }, 0)
    ctx.sfx(0, 'slam', { gain: 1 })
    ctx.sfx(0, 'clank', { gain: 0.7 })
    ctx.sfx(0.45, 'heartbeat', { gain: 1 })
    ctx.sfx(1.0, 'heartbeat', { gain: 1 })
    A.rewind(ctx, C, { targets: [box] })
  },

  /* a12: the answer, scribbled huge */
  'a12-doodle'(ctx, C, lang) {
    const { box } = open(ctx, C, '#f6f6f1')
    const rough = A.rough(ctx, 'roughC12', { scale: 6, freq: 0.012 })
    rough.boil(0, C, 8)
    box.style.filter = rough.css
    A.node(ctx, 't-marker', box, { left: '0', width: '1080px', top: '560px', textAlign: 'center', fontSize: '200px', color: '#16120f', whiteSpace: 'nowrap' }, '70<span style="color:#e0263a"> → </span>72.5')
    A.hookText(ctx, box, L(lang, 'SIN MAGIA:<br>3 PASOS.', 'NO MAGIC:<br>3 STEPS.'), { y: 960, size: 150, color: '#16120f', font: 't-marker' })
    const svg = A.node(ctx, '', box, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' }, '<svg viewBox="0 0 1080 1920" width="1080" height="1920" fill="none" stroke="#e0263a" stroke-width="12" stroke-linecap="round"><path d="M180 880 C 400 920, 700 860, 900 900"/></svg>')
    void svg
    ctx.sfx(0, 'slam', { gain: 0.9 })
    ctx.sfx(0.05, 'pencil', { dur: 0.5, gain: 0.8 })
    A.rewind(ctx, C, { targets: [box] })
  },
}
