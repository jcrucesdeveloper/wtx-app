// D08 — "The one who never unloads the bar". Frame 0: a note ("brb :)") in
// close-up; the camera snaps out to a bar carrying every plate in the gym and
// one very small man. One plate off, and the bar is a catapult. The second
// hook is "(still going up)"; the peak is the return, and the owner's "I'm back".

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node, rng } from '../../lib/art.js'

const TXT = {
  es: { cap: 'El que no descarga la barra:', cap2: '(sigue subiendo)', note: 'ya vuelvo :)', back: '¡ya volví!' },
  en: { cap: 'The one who never unloads the bar:', cap2: '(still going up)', note: 'brb :)', back: "I'm back!" },
}
const FLOOR = 1400
const COLS = ['#e0263a', '#2f6df6', '#f7c52b', '#2fb36d', '#e0263a', '#2f6df6', '#f7c52b', '#2fb36d', '#e0263a']

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 6.2,
    bpm: 120,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx, { bg: '#8fe3f0' })
      T.caption(ctx, t.cap, { size: 54 })
      T.caption(ctx, t.cap2, { y: 400, at: 2.9, out: 4.2, sound: 'bonk' })
      const r = rng(19)

      // the rack and the see-saw of a bar
      T.box(ctx, scene, { x: 525, y: 1010, w: 30, h: 390, fill: '#9aa3ad', r: 6 })
      const bar = node(ctx, '', scene, { position: 'absolute', left: '540px', top: '1010px', width: '0', height: '0' })
      node(ctx, '', bar, { position: 'absolute', left: '-500px', top: '-9px', width: '1000px', height: '18px', background: '#9aa3ad', border: `6px solid ${T.INK}`, borderRadius: '9px', boxSizing: 'border-box' })
      const first = []
      for (const s of [-1, 1]) COLS.forEach((c, i) => {
        const h = 330 - i * 16
        const p = node(ctx, '', bar, { position: 'absolute', left: (s < 0 ? -150 - (i + 1) * 36 : 150 + i * 36) + 'px', top: -h / 2 + 'px', width: '36px', height: h + 'px', background: c, border: `8px solid ${T.INK}`, borderRadius: '10px', boxSizing: 'border-box' })
        if (s < 0 && i === COLS.length - 1) first.push(p)
      })
      const note = T.box(ctx, bar, { x: -110, y: -150, w: 220, h: 110, fill: '#fff8b8', r: 6 })
      node(ctx, 't-marker', note, { left: '0', width: '204px', top: '22px', textAlign: 'center', fontSize: '44px', color: T.INK }, t.note)
      gsap.set(note, { rotation: -5 })

      const egg = T.egg(ctx, scene, { x: 930, y: 1338 })
      egg.look(-1, -0.6, 0)
      const bro = T.person(ctx, scene, { x: 130, y: FLOOR, scale: 1.1, hair: 'band' })
      const owner = T.person(ctx, scene, { x: 1500, y: FLOOR, scale: 1.6, shirt: '#2f6df6', hair: 'cap', torsoW: 190, torsoH: 150, armW: 34, legW: 13, leg: [46, 42], headR: 54, arm: [70, 62] })
      T.face(ctx, owner, 'happy', 0)

      // 0.0 — the note, then all of it
      T.closeup(scene, { x: 540, y: 905, scale: 3.0 })
      ctx.sfx(0, 'dundun', { gain: 1 })
      T.unzoom(ctx, scene, 0.55, 0.14)
      ctx.sfx(0.55, 'boom', { gain: 0.7 })
      T.face(ctx, bro, 'up', 0, { brow: -16, mouth: 'wavy' })
      T.sweat(ctx, bro, 0.7, 3, 1)
      // 1.0 — fine. One plate.
      T.face(ctx, bro, 'blank', 1.0)
      ctx.sfx(1.0, 'blab', { dur: 0.3, pitch: 56, seed: 3, gain: 0.8 })
      T.pose(ctx, bro, { arms: [150, 20] }, 1.2, 0.12, 'back.out(3)')
      T.face(ctx, bro, 'strain', 1.3)
      for (const s of [1.3, 1.45, 1.6]) ctx.sfx(s, 'squeak', { gain: 0.8, pitch: 76 })
      tl.to(first[0], { x: -80, y: 150, rotation: -30, duration: 0.2, ease: 'power2.in' }, 1.75)
      ctx.sfx(1.75, 'pop', { gain: 1 })
      ctx.sfx(1.95, 'clank', { gain: 1 })
      // 2.0 — it tips. He was holding on.
      tl.to(bar, { rotation: 14, duration: 0.16, ease: 'power3.in' }, 2.0)
      ctx.sfx(2.16, 'boom', { gain: 1 })
      tl.fromTo(scene, { y: 26 }, { y: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', immediateRender: false }, 2.16)
      T.face(ctx, bro, 'panic', 2.02)
      tl.to(bro.root, { y: -1700, x: 120, rotation: 400, duration: 0.5, ease: 'power2.out' }, 2.05)
      ctx.sfx(2.05, 'slidewhistle', { dur: 0.6, from: 66, to: 100, gain: 0.9 })
      ctx.sfx(2.05, 'scream', { dur: 0.5, pitch: 70, gain: 0.8 })
      egg.hop(2.16)
      egg.look(-1, -1, 2.2)

      // 2.9 — the second hook: nothing. He is still going up.
      ctx.sfx(3.0, 'crickets', { gain: 1.8, dur: 1.0 })
      for (const s of [3.3, 3.7]) T.blink(ctx, owner, s)
      // 4.2 — and down
      ctx.sfx(4.0, 'slidewhistle', { dur: 0.3, from: 100, to: 60, gain: 0.9 })
      tl.set(bro.root, { x: 760 - 130, y: -1600, rotation: 180 }, 4.05)
      tl.to(bro.root, { y: -330, duration: 0.2, ease: 'power2.in' }, 4.1)
      ctx.sfx(4.3, 'boom', { gain: 1 })
      ctx.sfx(4.3, 'plate', { gain: 0.8 })
      tl.to(bar, { rotation: -16, duration: 0.14, ease: 'power3.out' }, 4.3)
      tl.to(bar, { rotation: -6, duration: 0.6, ease: 'elastic.out(1,0.3)' }, 4.44)
      T.pow(ctx, scene, 4.3, { x: 760, y: 1000, r: 320, n: 12 })
      tl.fromTo(scene, { y: 30 }, { y: 0, duration: 0.5, ease: 'elastic.out(1,0.25)', immediateRender: false }, 4.3)
      T.face(ctx, bro, 'dead', 4.3)
      tl.to(bro.root, { y: 0, x: 760 - 130 + 60, rotation: 270, duration: 0.3, ease: 'bounce.out' }, 4.34)
      for (let i = 0; i < 5; i++) {
        const d = node(ctx, '', scene, { position: 'absolute', left: '700px', top: '1290px', width: '110px', height: '110px', borderRadius: '50%', background: COLS[i], border: `8px solid ${T.INK}`, boxSizing: 'border-box', opacity: 0 })
        tl.set(d, { opacity: 1 }, 4.3)
        tl.to(d, { x: (r() - 0.5) * 900, rotation: (r() - 0.5) * 900, duration: 1.2, ease: 'power2.out' }, 4.3)
      }
      egg.hop(4.3)
      // 5.0 — the peak: guess who
      tl.to(owner.root, { x: -560, duration: 0.2, ease: 'power4.out' }, 5.0)
      ctx.sfx(5.0, 'zip', { gain: 0.9 })
      T.pose(ctx, owner, { aR: [-150, -20] }, 5.2, 0.1, 'back.out(3)')
      T.say(ctx, owner, t.back, 5.2, { x: 520, y: 600, w: 400, size: 66, tail: 0.75, pitch: 46, dur: 0.4, hold: 0.9 })
      ctx.sfx(5.25, 'tada', { gain: 0.8 })

      T.sign(ctx, { x: 60, y: 1470 })
    },
  })
}
