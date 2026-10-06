// C01 — "Me counting reps". Recognition comedy that heightens into nonsense,
// one count per beat (100 BPM), and ends on "from zero" so the loop restarts
// on "1" (research 11: recognition + escalation + a loop). No brand, no CTA.

import { composition } from '../../lib/engine.js'
import * as T from '../../lib/toon.js'
import { node } from '../../lib/art.js'

const TXT = {
  es: { cap: 'Yo contando repeticiones:', seq: ['1', '2', '3', '4', '¿cerré<br>la puerta?', '5…?', '8', '47', 'martes', '3', '…', 'desde<br>cero.'] },
  en: { cap: 'Me counting reps:', seq: ['1', '2', '3', '4', 'did I lock<br>the door?', '5…?', '8', '47', 'tuesday', '3', '…', 'from<br>zero.'] },
}
const FACE = ['focus', 'focus', 'focus', 'focus', 'up', 'worry', 'worry', 'panic', 'blank', 'sad', 'dead', 'focus']
const REP = 0.6

export default function run(lang) {
  const t = TXT[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: REP * 12,
    bpm: 100,
    lang,
    build(ctx) {
      const { tl } = ctx
      const scene = T.stage(ctx)
      T.caption(ctx, t.cap)
      const egg = T.egg(ctx, scene, { x: 170, y: 1338 })
      egg.look(1, -0.3, 0)

      const bro = T.person(ctx, scene, { x: 540, y: 1400, scale: 1.55, hair: 'band' })
      const db = T.dumbbell(ctx, bro.aR.hand, { w: 80, h: 44 })
      void db

      // the thought cloud
      const cloud = node(ctx, '', scene, { position: 'absolute', left: '230px', top: '440px', width: '620px', height: '250px', background: '#fff', border: `8px solid ${T.INK}`, borderRadius: '150px', boxSizing: 'border-box' })
      node(ctx, '', scene, { position: 'absolute', left: '600px', top: '700px', width: '46px', height: '46px', background: '#fff', border: `7px solid ${T.INK}`, borderRadius: '50%', boxSizing: 'border-box' })
      node(ctx, '', scene, { position: 'absolute', left: '580px', top: '752px', width: '26px', height: '26px', background: '#fff', border: `6px solid ${T.INK}`, borderRadius: '50%', boxSizing: 'border-box' })

      t.seq.forEach((txt, k) => {
        const at = k * REP
        const big = txt.length <= 3
        const e = node(ctx, 't-marker', cloud, { left: '0', width: '604px', top: big ? '18px' : txt.includes('<br>') ? '44px' : '66px', textAlign: 'center', fontSize: big ? '180px' : txt.includes('<br>') ? '70px' : '96px', color: k === 7 ? '#e0263a' : T.INK, lineHeight: 1.0, whiteSpace: 'normal' }, txt)
        if (k > 0) tl.set(e, { opacity: 0 }, 0)
        tl.set(e, { opacity: 1 }, at)
        tl.set(e, { opacity: 0 }, at + REP)
        if (k > 0) tl.fromTo(e, { scale: 1.35 }, { scale: 1, duration: 0.12, ease: 'power3.out', immediateRender: false }, at)
        // the rep: up, then down
        T.pose(ctx, bro, { aR: [-18, -150] }, at, 0.14, 'back.out(2)')
        T.pose(ctx, bro, { aR: [-10, -12] }, at + 0.3, 0.2, 'power2.in')
        T.face(ctx, bro, FACE[k], at)
      })
      // cloud wobbles when it stops being a number
      for (const k of [4, 7, 8, 10]) tl.fromTo(cloud, { rotation: -3 }, { rotation: 0, duration: 0.3, ease: 'elastic.out(1,0.4)', immediateRender: false }, k * REP)

      // the sound of each count: a scale that goes wrong
      const notes = [60, 62, 64, 65, null, 58, 70, 49, null, 55, null, null]
      notes.forEach((m, k) => {
        if (m) ctx.sfx(k * REP, 'note', { inst: 'marimba', midi: m + 12, dur: 0.4, gain: 1.2 })
        ctx.sfx(k * REP, 'tick', { gain: 0.6 })
      })
      ctx.sfx(4 * REP, 'ding', { gain: 0.8, midi: 91 })
      ctx.sfx(4 * REP + 0.05, 'blab', { dur: 0.35, pitch: 66, seed: 3, gain: 0.7 })
      ctx.sfx(7 * REP, 'boing', { gain: 0.9 })
      T.sweat(ctx, bro, 7 * REP, 4, 2)
      ctx.sfx(8 * REP, 'crickets', { gain: 1.6, dur: 1.1 })
      ctx.sfx(10 * REP, 'powerdown', { gain: 0.9 })
      ctx.sfx(11 * REP, 'blab', { dur: 0.45, pitch: 58, seed: 5, gain: 0.9 })

      // the plate has seen enough
      egg.look(0, -1, 7 * REP)
      egg.look(0, 0.2, 8 * REP)
      egg.hop(7 * REP)

      ctx.music([{ at: 0, bars: 2, part: 'cartoon', gain: 0.4 }])
      T.sign(ctx)
    },
  })
}
