// A02 — "Placa", a 25 kg plate with attitude, sends ever-more-passive-aggressive
// notifications until you log the workout. Duolingo's lesson (research B): a
// mascot with ONE trait, entertain first, the app is the quiet answer.
// Sound: comedic stings over a soft brush-and-marimba bed.

import { composition } from '../../lib/engine.js'
import * as K from '../../lib/kit.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: {
    hook: 'Cuando no has entrenado<br>y ella lo sabe:',
    n: [
      ['09:00', 'Buenos días. Hoy toca pierna.'],
      ['13:10', '¿Ya comiste? Perfecto.<br>Ahora entrena.'],
      ['18:30', 'Vi que abriste Instagram.<br>Pero no el gym.'],
      ['20:45', 'ESTOY.<br>ESPERANDO.'],
    ],
    forgive: 'Vale… te perdono.',
    cap: 'Anótalo en WTX<br>y te deja en paz.',
  },
  en: {
    hook: "When you skipped the gym<br>and she knows:",
    n: [
      ['09:00', "Good morning. It's leg day."],
      ['13:10', 'Had lunch? Great.<br>Now train.'],
      ['18:30', 'I saw you open Instagram.<br>Not the gym.'],
      ['20:45', 'I AM.<br>WAITING.'],
    ],
    forgive: "Fine… I forgive you.",
    cap: 'Log it in WTX<br>and she leaves you alone.',
  },
}

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
      const bg = K.background(ctx, { floor: false, glows: 3 })
      void bg
      A.tag(ctx, { x: 90, y: 250 })

      const hook = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '86px', color: '#fff', zIndex: 40, whiteSpace: 'normal', textTransform: 'none' }, t.hook)

      // Placa
      const m = A.mascot(ctx, ctx.stage, { x: 540, y: 1260, size: 430, limbs: '#e9edf2' })
      m.root.style.zIndex = 20
      gsap.set(m.root, { transformOrigin: '0 0' })
      for (let i = 0; i < 24; i++) tl.to(m.body, { y: i % 2 ? 0 : -10, duration: 0.6, ease: 'sine.inOut' }, i * 0.6)
      A.emote(ctx, m, 'smug', 0, 0.01)

      // notification stack
      const notifs = t.n.map(([time, text], i) => {
        const n = A.node(ctx, '', ctx.stage, {
          position: 'absolute', left: '90px', width: '900px', top: '610px', padding: '26px 30px', borderRadius: '38px',
          background: i === 3 ? '#e0263a' : 'rgba(34,38,45,0.94)', border: '2px solid rgba(255,255,255,0.14)', zIndex: 30,
          display: 'flex', gap: '26px', alignItems: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        })
        const ic = A.node(ctx, '', n, { position: 'relative', width: '96px', height: '96px', flex: '0 0 96px' })
        A.disc(ctx, ic, { x: 48, y: 48, r: 46, colors: A.PAL.p25, hole: 0.0 })
        const body = A.node(ctx, '', n, { flex: '1', font: '700 24px Inter', color: i === 3 ? '#ffd5da' : '#8b97a4' }, `PLACA <span style="float:right">${time}</span>`)
        const tx = A.node(ctx, '', body, { font: `800 ${i === 3 ? 62 : 44}px Inter`, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.12, marginTop: '6px', clear: 'both' }, text)
        void tx
        return n
      })
      const show = (i, at, snd = 'pop') => {
        tl.set(notifs[i], { opacity: 0 }, 0)
        tl.fromTo(notifs[i], { opacity: 0, y: -140, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2.2)', immediateRender: false }, at)
        ctx.sfx(at, snd, { gain: 0.8 })
        ctx.sfx(at + 0.02, 'ding', { gain: 0.5, midi: 96 - i * 3 })
      }
      // notification 1 is already there on frame 0
      tl.set(notifs[0], { opacity: 1 }, 0)

      // 2.4 — second, first one pushed down
      tl.to(notifs[0], { y: 200, scale: 0.94, opacity: 0.55, duration: 0.3, ease: 'power3.out' }, 2.4)
      show(1, 2.4)
      A.emote(ctx, m, 'side', 2.5)
      tl.to(m.armR, { rotation: -50, duration: 0.25, ease: 'back.out(2)' }, 2.6)
      tl.to(m.armR, { rotation: -18, duration: 0.3 }, 3.3)

      // 4.8 — third, she gets angrier
      tl.to(notifs[1], { y: 200, scale: 0.94, opacity: 0.55, duration: 0.3, ease: 'power3.out' }, 4.8)
      tl.to(notifs[0], { opacity: 0, duration: 0.2 }, 4.8)
      show(2, 4.8)
      A.emote(ctx, m, 'angry', 4.9)
      tl.to(m.root, { scale: 1.12, duration: 0.5, ease: 'power2.out' }, 4.9)
      ctx.sfx(4.9, 'boing', { gain: 0.6 })
      A.shakeX(ctx, m.root, 5.4, { amp: 8, n: 6, dur: 0.4 })

      // 7.2 — the big one
      tl.to(notifs[2], { opacity: 0, duration: 0.2 }, 7.2)
      tl.to(notifs[1], { opacity: 0, duration: 0.2 }, 7.2)
      show(3, 7.2, 'hit')
      ctx.sfx(7.2, 'impact', { gain: 0.8 })
      A.emote(ctx, m, 'shock', 7.3)
      tl.to(m.root, { scale: 1.45, y: 60, duration: 0.5, ease: 'expo.out' }, 7.3)
      A.shakeX(ctx, ctx.stage, 7.3, { amp: 14, n: 10, dur: 0.6 })
      tl.to(m.armL, { rotation: 55, duration: 0.2 }, 7.4)
      tl.to(m.armR, { rotation: -55, duration: 0.2 }, 7.4)
      ctx.sfx(7.3, 'riser', { dur: 0.6, gain: 0.4 })

      // 9.6 — she forgives you
      tl.to(notifs[3], { opacity: 0, y: -60, duration: 0.25 }, 9.5)
      tl.to(hook, { opacity: 0, duration: 0.2 }, 9.5)
      tl.to(m.root, { scale: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }, 9.6)
      tl.to([m.armL, m.armR], { rotation: (i) => (i ? -18 : 18), duration: 0.3 }, 9.6)
      A.emote(ctx, m, 'happy', 9.7)
      ctx.sfx(9.7, 'confirm', { gain: 1 })
      A.bubble(ctx, t.forgive, { x: 160, y: 600, w: 760, at: 9.9, out: 12.6, size: 66, tailX: 0.5, sound: 'pop' })
      A.confetti(ctx, 10.1, { x: 540, y: 1050, n: 34, up: 800, parent: ctx.stage, colors: [A.PAL.red, '#f7c52b', '#fff'] })

      const cap = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '1580px', textAlign: 'center', fontSize: '84px', color: '#fff', zIndex: 40, whiteSpace: 'normal', textTransform: 'none' }, t.cap)
      tl.set(cap, { opacity: 0 }, 0)
      tl.fromTo(cap, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 11.2)
      ctx.sfx(11.2, 'tick', { gain: 0.6 })

      ctx.music([{ at: 0, bars: 6, part: 'doodle', gain: 0.8 }])
      A.sting(ctx, 12.8, { y: 330, scrim: false })
      A.grain(ctx, { opacity: 0.1, blend: 'screen' })
      COLD['a02-placa'](ctx0, C, lang)
    },
  })
}
