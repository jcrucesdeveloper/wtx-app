// A10 — "Dumb ways to lose your progress": a jaunty tune, cute beans, one
// gag per bar, the sensible answer last. The format behind the most awarded
// animated campaign in Cannes history (research B: Dumb Ways to Die — cute
// characters + dark humour + an escalating list + the message LAST). Original
// tune: whistle + ukulele (music.mjs `uke`, 100 BPM, one bar = one gag).

import { composition } from '../../lib/engine.js'
import * as K from '../../lib/kit.js'
import * as A from '../../lib/art.js'
import { COLD } from './cold-opens.js'

const T = {
  es: {
    title: 'Maneras tontas<br>de perder tu progreso',
    n: ['Fiarte de tu memoria', 'Anotarlo en una servilleta', 'Enterrarlo en 400 notas', 'Usar la libreta del año pasado', 'Lavar la libreta con los vaqueros'],
    num: 'TONTA Nº',
    smart: 'Manera lista:',
    smart2: 'anotarlo en WTX',
    q: ['70…?', '72?', '75??'],
    ach: '¡ACHÍS!',
  },
  en: {
    title: 'Dumb ways<br>to lose your progress',
    n: ['Trusting your memory', 'Writing it on a napkin', 'Burying it in 400 notes', "Using last year's notebook", 'Washing the notebook with your jeans'],
    num: 'DUMB WAY #',
    smart: 'Smart way:',
    smart2: 'log it in WTX',
    q: ['70…?', '72?', '75??'],
    ach: 'ACHOO!',
  },
}

const BG = '#bfeadb'
const GROUND = 1360
const BEAT = 0.6 // 100 BPM
const BAR = 2.4

function bean(ctx, parent, { x, y = GROUND, color, dark, w = 190, h = 240 }) {
  const root = A.node(ctx, 'rig', parent, { left: x + 'px', top: y + 'px' })
  const legs = [-1, 1].map((s) => {
    const j = A.node(ctx, 'joint', root, { left: s * w * 0.2 + 'px', top: -40 + 'px' })
    A.node(ctx, 'bone', j, { left: '-9px', top: '0', width: '18px', height: '48px', borderRadius: '9px', '--bone': dark })
    j.firstChild.style.background = dark
    A.node(ctx, 'bone', j, { left: s < 0 ? '-30px' : '-6px', top: '34px', width: '36px', height: '16px', borderRadius: '10px' }).style.background = dark
    return j
  })
  const body = A.node(ctx, '', root, { position: 'absolute', left: -w / 2 + 'px', top: -(h + 36) + 'px', width: w + 'px', height: h + 'px', borderRadius: w / 2 + 'px', background: `linear-gradient(90deg, ${color} 0 70%, ${dark} 130%)`, boxShadow: `inset -14px 0 0 ${dark}55, 0 10px 0 rgba(0,0,0,0.12)`, transformOrigin: '50% 100%' })
  const eyes = [-1, 1].map((s) => {
    const e = A.node(ctx, '', body, { position: 'absolute', left: w / 2 + s * 36 - 26 + 'px', top: h * 0.2 + 'px', width: '52px', height: '56px', borderRadius: '50%', background: '#fff', overflow: 'hidden', border: '3px solid #1b1b1b' })
    const p = A.node(ctx, '', e, { position: 'absolute', left: '15px', top: '18px', width: '20px', height: '22px', borderRadius: '50%', background: '#1b1b1b' })
    return { e, p }
  })
  const mouth = A.node(ctx, '', body, { position: 'absolute', left: w / 2 - 24 + 'px', top: h * 0.46 + 'px', width: '48px', height: '24px', borderBottom: '7px solid #1b1b1b', borderRadius: '0 0 30px 30px' })
  const arms = [-1, 1].map((s) => {
    const j = A.node(ctx, 'joint', root, { left: s * (w / 2 - 4) + 'px', top: -(36 + h * 0.5) + 'px' })
    const b = A.node(ctx, 'bone', j, { left: '-9px', top: '-6px', width: '18px', height: '84px', borderRadius: '9px' })
    b.style.background = dark
    A.node(ctx, 'cap', j, { left: '-15px', top: '66px', width: '30px', height: '30px' }).style.background = dark
    gsap.set(j, { rotation: s * -18 })
    return j
  })
  return { root, body, eyes, mouth, legs, arms, w, h }
}

function mood(ctx, b, kind, at) {
  const tl = ctx.tl
  if (kind === 'happy') tl.set(b.mouth, { height: 24, width: 52, borderBottomWidth: 7, borderRadius: '0 0 30px 30px', background: 'transparent' }, at)
  if (kind === 'worry') tl.set(b.mouth, { height: 14, width: 40, borderBottomWidth: 0, borderTop: '7px solid #1b1b1b', borderRadius: '30px 30px 0 0', background: 'transparent' }, at)
  if (kind === 'o') tl.set(b.mouth, { height: 36, width: 36, borderBottomWidth: 0, borderTop: '0', borderRadius: '50%', background: '#1b1b1b' }, at)
}

// b-series: the same reel behind a cold open (research 10). See cold-opens.js.
const C = 1.8

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 19.2 + C,
    bpm: 100,
    lang,
    build(ctx0) {
      const ctx = A.shift(ctx0, C)
      const { tl } = ctx
      A.node(ctx, 'layer', ctx.stage, { background: BG })
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', right: '0', top: GROUND + 'px', bottom: '0', background: '#7fcfb8' })
      A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', right: '0', top: GROUND + 'px', height: '12px', background: '#5bb89e' })
      // far hills
      for (const [x, w, h] of [[-100, 600, 220], [500, 700, 300]]) A.node(ctx, '', ctx.stage, { position: 'absolute', left: x + 'px', top: GROUND - h + 'px', width: w + 'px', height: h * 2 + 'px', borderRadius: '50%', background: '#a6e0cf' })

      const show = (el, at, out) => {
        tl.set(el, { opacity: 0 }, 0)
        tl.fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2.5)', immediateRender: false }, at)
        if (out !== undefined) tl.set(el, { opacity: 0 }, out)
      }
      const scenes = []
      const scene = (i) => {
        const s = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 10 })
        gsap.set(s, { scale: 1.3, transformOrigin: '540px 1360px' })
        const a = BAR * (i + 1)
        tl.set(s, { opacity: 0 }, 0)
        tl.set(s, { opacity: 1 }, a - 0.001)
        tl.set(s, { opacity: 0 }, a + BAR - 0.001)
        scenes.push(s)
        return { s, a }
      }
      const caption = (i, a) => {
        const lab = A.node(ctx, 't-inter', ctx.stage, { left: '0', width: '1080px', top: '322px', textAlign: 'center', fontSize: '40px', color: '#0f6b5a', letterSpacing: '0.16em', fontWeight: '900', zIndex: 40 }, `${t.num}${i + 1}`)
        const cap = A.node(ctx, 't-anton', ctx.stage, { left: '60px', width: '960px', top: '385px', textAlign: 'center', fontSize: '86px', color: '#173a33', zIndex: 40, whiteSpace: 'normal', textTransform: 'none', lineHeight: 1.02 }, t.n[i])
        for (const e of [lab, cap]) {
          tl.set(e, { opacity: 0 }, 0)
          tl.fromTo(e, { opacity: 0, y: -40, scale: 1.2 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(2.4)', immediateRender: false }, a)
          tl.set(e, { opacity: 0 }, a + BAR - 0.001)
        }
        ctx.sfx(a, 'pop', { gain: 0.8 })
      }

      // ---- title (bar 0), on frame 0 ----
      const title = A.node(ctx, 't-anton', ctx.stage, { left: '40px', width: '1000px', top: '330px', textAlign: 'center', fontSize: '98px', color: '#173a33', zIndex: 40, whiteSpace: 'normal', textTransform: 'none', lineHeight: 1.04 }, t.title)
      tl.set(title, { opacity: 0 }, BAR - 0.001)
      const hero = bean(ctx, ctx.stage, { x: 540, color: '#ff8a7a', dark: '#e0614f' })
      hero.root.style.zIndex = 12
      gsap.set(hero.root, { scale: 1.3 })
      tl.set(hero.root, { opacity: 0 }, BAR - 0.001)
      mood(ctx, hero, 'happy', 0)
      for (let i = 0; i < 3; i++) tl.to(hero.body, { y: i % 2 ? 0 : -24, duration: 0.6, ease: 'sine.inOut' }, i * 0.6)
      tl.to(hero.arms[1], { rotation: -150, duration: 0.3, ease: 'back.out(2)' }, 0.3)
      for (let i = 0; i < 6; i++) tl.to(hero.arms[1], { rotation: i % 2 ? -150 : -120, duration: 0.15 }, 0.6 + i * 0.2)

      // ---- 1: memory ----
      {
        const { s, a } = scene(0)
        caption(0, a)
        const b = bean(ctx, s, { x: 420, color: '#ffd166', dark: '#e0a82e' })
        mood(ctx, b, 'worry', a)
        const cloud = A.node(ctx, '', s, { position: 'absolute', left: '560px', top: '740px', width: '330px', height: '190px', borderRadius: '95px', background: '#fff', boxShadow: '0 8px 0 rgba(0,0,0,0.1)', display: 'grid', placeItems: 'center' })
        A.node(ctx, '', s, { position: 'absolute', left: '540px', top: '900px', width: '34px', height: '34px', borderRadius: '50%', background: '#fff' })
        A.node(ctx, '', s, { position: 'absolute', left: '500px', top: '960px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff' })
        t.q.forEach((q, i) => {
          const e = A.node(ctx, 't-anton', cloud, { position: 'absolute', left: '0', right: '0', top: '34px', textAlign: 'center', fontSize: '100px', color: '#173a33', textTransform: 'none' }, q)
          tl.set(e, { opacity: 0 }, 0)
          tl.set(e, { opacity: 1 }, a + 0.35 + i * 0.4)
          tl.set(e, { opacity: 0 }, a + 0.35 + (i + 1) * 0.4)
          ctx.sfx(a + 0.35 + i * 0.4, 'blip', { midi: 76 - i * 3, gain: 0.6 })
        })
        show(cloud, a + 0.2)
        // eyes dart, then it all goes wrong: spirals and stars
        for (let i = 0; i < 4; i++) b.eyes.forEach(({ p }) => tl.to(p, { x: i % 2 ? -12 : 12, duration: 0.1 }, a + 0.4 + i * 0.25))
        tl.to(b.root, { rotation: 8, duration: 0.2 }, a + 1.5)
        mood(ctx, b, 'o', a + 1.6)
        b.eyes.forEach(({ e }) => {
          const sp = A.node(ctx, 't-inter', e, { left: '6px', top: '2px', fontSize: '44px', color: '#1b1b1b', fontWeight: '900' }, '@')
          tl.set(sp, { opacity: 0 }, 0)
          tl.set(sp, { opacity: 1 }, a + 1.6)
          tl.to(sp, { rotation: 720, duration: 0.8, ease: 'none' }, a + 1.6)
        })
        ctx.sfx(a + 1.6, 'slidewhistle', { from: 90, to: 60, dur: 0.6, gain: 0.7 })
        ctx.sfx(a + 1.5, 'boing')
      }

      // ---- 2: napkin ----
      {
        const { s, a } = scene(1)
        caption(1, a)
        const b = bean(ctx, s, { x: 330, color: '#7ec8ff', dark: '#4a9bd9' })
        mood(ctx, b, 'happy', a)
        const table = A.node(ctx, '', s, { position: 'absolute', left: '470px', top: '1230px', width: '300px', height: '130px', background: '#c08a5a', borderRadius: '14px 14px 0 0' })
        const napkin = A.node(ctx, '', s, { position: 'absolute', left: '540px', top: '1170px', width: '170px', height: '120px', background: '#fff', borderRadius: '10px', boxShadow: '0 6px 0 rgba(0,0,0,0.12)', transform: 'rotate(-4deg)' })
        A.node(ctx, 't-marker', napkin, { left: '14px', top: '20px', fontSize: '50px', color: '#444' }, '72.5')
        void table
        // he writes (arm scribbles), a gust takes it
        for (let i = 0; i < 6; i++) tl.to(b.arms[1], { rotation: i % 2 ? -85 : -105, duration: 0.1 }, a + 0.2 + i * 0.12)
        ctx.sfx(a + 0.2, 'pencil', { dur: 0.7, gain: 0.8 })
        tl.to(napkin, { x: 700, y: -420, rotation: 540, duration: 1.2, ease: 'power1.in' }, a + 1.0)
        ctx.sfx(a + 1.0, 'whoosh', { gain: 1 })
        mood(ctx, b, 'o', a + 1.0)
        tl.to(b.root, { x: 420, duration: 0.9, ease: 'power1.in' }, a + 1.1)
        for (let i = 0; i < 6; i++) tl.to(b.legs[i % 2], { rotation: 30, yoyo: true, repeat: 1, duration: 0.07 }, a + 1.1 + i * 0.14)
        tl.to(b.root, { y: GROUND - 80, duration: 0.25, ease: 'power2.out' }, a + 1.5)
        tl.to(b.root, { y: GROUND, duration: 0.25, ease: 'power2.in' }, a + 1.75)
        ctx.sfx(a + 1.5, 'boing', { gain: 0.8 })
      }

      // ---- 3: 400 notes ----
      {
        const { s, a } = scene(2)
        caption(2, a)
        const b = bean(ctx, s, { x: 400, color: '#c9a7ff', dark: '#9570d9' })
        mood(ctx, b, 'worry', a)
        const stack = A.node(ctx, '', s, { position: 'absolute', left: '600px', top: '0', width: '300px', height: '1920px' })
        for (let i = 0; i < 7; i++) {
          const n = A.node(ctx, '', stack, { position: 'absolute', left: (i % 2 ? 6 : -6) + 'px', top: GROUND - 100 - i * 82 + 'px', width: '280px', height: '78px', background: ['#fff7d1', '#ffe0e6', '#d9f0ff'][i % 3], borderRadius: '10px', boxShadow: '0 6px 0 rgba(0,0,0,0.1)' })
          A.node(ctx, '', n, { position: 'absolute', left: '20px', top: '28px', width: '150px', height: '8px', background: '#999', borderRadius: '4px' })
          const at = a + 0.15 + i * 0.12
          tl.set(n, { opacity: 0 }, 0)
          tl.fromTo(n, { opacity: 1, y: -700 }, { y: 0, duration: 0.25, ease: 'power2.in', immediateRender: false }, at)
          tl.set(n, { opacity: 1 }, at)
          ctx.sfx(at + 0.25, 'tick', { gain: 0.9 })
        }
        // it topples onto him
        tl.to(stack, { rotation: -22, x: -180, duration: 0.5, ease: 'power2.in', transformOrigin: '50% 100%' }, a + 1.4)
        tl.to(stack, { rotation: -75, x: -420, y: 40, duration: 0.35, ease: 'power3.in' }, a + 1.9)
        ctx.sfx(a + 1.45, 'riser', { dur: 0.5, gain: 0.5 })
        ctx.sfx(a + 2.25, 'thud', { gain: 1 })
        mood(ctx, b, 'o', a + 1.5)
      }

      // ---- 4: last year's notebook ----
      {
        const { s, a } = scene(3)
        caption(3, a)
        const b = bean(ctx, s, { x: 360, color: '#ffb36b', dark: '#e0842f' })
        mood(ctx, b, 'happy', a)
        const nb = A.node(ctx, '', s, { position: 'absolute', left: '560px', top: '1130px', width: '260px', height: '230px', background: '#7a5530', borderRadius: '14px', boxShadow: '0 8px 0 rgba(0,0,0,0.15)' })
        A.node(ctx, 't-marker', nb, { left: '30px', top: '70px', fontSize: '40px', color: '#e7d2a6' }, '2023')
        // cobweb + spider
        const web = A.node(ctx, '', s, { position: 'absolute', left: '540px', top: '1050px', width: '300px', height: '90px' }, '<svg viewBox="0 0 300 90" width="300" height="90" fill="none" stroke="#fff" stroke-width="3" opacity=".8"><path d="M0 0 L150 80 L300 0 M0 40 Q150 110 300 40 M70 0 L150 80 L230 0"/></svg>')
        void web
        const spider = A.node(ctx, '', s, { position: 'absolute', left: '680px', top: '1000px', width: '40px', height: '40px', borderRadius: '50%', background: '#222', zIndex: 14 })
        tl.fromTo(spider, { y: -300 }, { y: 80, duration: 0.5, ease: 'power2.out', immediateRender: false }, a + 0.2)
        // he opens it: dust puff, sneeze
        for (let i = 0; i < 7; i++) {
          const d = A.node(ctx, '', s, { position: 'absolute', left: 630 + i * 14 + 'px', top: '1100px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(160,140,110,0.7)', opacity: 0 })
          tl.set(d, { opacity: 1 }, a + 1.0)
          tl.to(d, { x: -80 + i * 40, y: -200 - i * 20, scale: 2.2, opacity: 0, duration: 0.9, ease: 'power2.out' }, a + 1.0)
        }
        ctx.sfx(a + 1.0, 'paper', { gain: 0.9 })
        mood(ctx, b, 'o', a + 1.3)
        const ach = A.node(ctx, 't-anton', s, { left: '0', width: '1080px', top: '780px', textAlign: 'center', fontSize: '120px', color: '#e0842f', textTransform: 'none' }, t.ach)
        tl.set(ach, { opacity: 0 }, 0)
        tl.set(ach, { opacity: 1 }, a + 1.5)
        tl.fromTo(ach, { scale: 0.4 }, { scale: 1, duration: 0.2, ease: 'back.out(3)', immediateRender: false }, a + 1.5)
        tl.to(b.root, { x: -140, rotation: -14, duration: 0.25, ease: 'power3.out' }, a + 1.5)
        tl.to(b.root, { x: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' }, a + 1.8)
        ctx.sfx(a + 1.5, 'boing')
        ctx.sfx(a + 1.5, 'whoosh', { gain: 0.6 })
      }

      // ---- 5: the washing machine ----
      {
        const { s, a } = scene(4)
        caption(4, a)
        const b = bean(ctx, s, { x: 340, color: '#7be0a7', dark: '#3fb877' })
        mood(ctx, b, 'worry', a)
        const m = A.node(ctx, '', s, { position: 'absolute', left: '560px', top: '1020px', width: '340px', height: '340px', background: '#eef2f5', borderRadius: '30px', boxShadow: '0 10px 0 rgba(0,0,0,0.15)' })
        const port = A.node(ctx, '', m, { position: 'absolute', left: '50px', top: '90px', width: '240px', height: '240px', borderRadius: '50%', background: '#8fc9ee', border: '16px solid #b9c3cc', overflow: 'hidden' })
        const drum = A.node(ctx, '', port, { position: 'absolute', inset: '0' })
        const nb = A.node(ctx, '', drum, { position: 'absolute', left: '60px', top: '70px', width: '90px', height: '100px', background: '#fff', borderRadius: '8px', border: '4px solid #333' })
        A.node(ctx, '', nb, { position: 'absolute', left: '14px', top: '20px', width: '50px', height: '8px', background: '#2f6df6', borderRadius: '4px' })
        A.node(ctx, '', drum, { position: 'absolute', left: '120px', top: '120px', width: '70px', height: '70px', background: '#3b5fa8', borderRadius: '10px' })
        tl.to(drum, { rotation: 1440, duration: 2.2, ease: 'power1.inOut' }, a + 0.2)
        for (let i = 0; i < 5; i++) {
          const bub = A.node(ctx, '', m, { position: 'absolute', left: 60 + i * 44 + 'px', top: '260px', width: 20 + (i % 3) * 8 + 'px', height: 20 + (i % 3) * 8 + 'px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', opacity: 0 })
          tl.set(bub, { opacity: 1 }, a + 0.4 + i * 0.25)
          tl.to(bub, { y: -140, opacity: 0, duration: 0.6 }, a + 0.4 + i * 0.25)
          ctx.sfx(a + 0.5 + i * 0.25, 'bubble', { gain: 0.7 })
        }
        const inkd = A.node(ctx, '', port, { position: 'absolute', inset: '0', background: '#2f6df6', opacity: 0 })
        tl.to(inkd, { opacity: 0.55, duration: 1.4 }, a + 0.6)
        mood(ctx, b, 'o', a + 1.4)
        tl.to(b.arms[0], { rotation: 150, duration: 0.2 }, a + 1.4)
        tl.to(b.arms[1], { rotation: -150, duration: 0.2 }, a + 1.4)
        ctx.sfx(a + 1.4, 'fail', { gain: 0.8 })
      }

      // ---- 6: the smart way ----
      {
        const a = BAR * 6
        const s = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 10 })
        gsap.set(s, { scale: 1.3, transformOrigin: '540px 1360px' })
        tl.set(s, { opacity: 0 }, 0)
        tl.set(s, { opacity: 1 }, a - 0.001)
        const b = bean(ctx, s, { x: 380, color: '#7ec8ff', dark: '#4a9bd9' })
        mood(ctx, b, 'happy', a)
        // glasses and a halo
        for (const sx of [-1, 1]) A.node(ctx, '', b.body, { position: 'absolute', left: b.w / 2 + sx * 36 - 36 + 'px', top: b.h * 0.2 - 8 + 'px', width: '72px', height: '72px', borderRadius: '50%', border: '6px solid #173a33' })
        A.node(ctx, '', b.body, { position: 'absolute', left: b.w / 2 - 12 + 'px', top: b.h * 0.2 + 18 + 'px', width: '24px', height: '6px', background: '#173a33' })
        const halo = A.node(ctx, '', b.body, { position: 'absolute', left: b.w / 2 - 70 + 'px', top: '-60px', width: '140px', height: '34px', borderRadius: '50%', border: '10px solid #ffd166', boxShadow: '0 0 30px #ffd166' })
        tl.to(halo, { y: -14, duration: 0.5, yoyo: true, repeat: 5, ease: 'sine.inOut' }, a)
        tl.to(b.arms[1], { rotation: -125, duration: 0.3, ease: 'back.out(2)' }, a + 0.2)
        // the phone: a generic phone with a tick
        const ph = A.node(ctx, '', s, { position: 'absolute', left: '640px', top: '980px', width: '230px', height: '400px', borderRadius: '40px', background: '#14181d', border: '8px solid #2a3139', boxShadow: '0 14px 0 rgba(0,0,0,0.15)' })
        A.node(ctx, '', ph, { position: 'absolute', left: '24px', top: '30px', width: '170px', height: '340px', borderRadius: '24px', background: '#1d242c' })
        A.node(ctx, '', ph, { position: 'absolute', left: '60px', top: '70px', width: '100px', height: '100px', borderRadius: '50%', background: '#e0263a', color: '#fff', display: 'grid', placeItems: 'center' }, `<div style="width:60px;height:60px">${K.ICONS.check}</div>`)
        A.node(ctx, '', ph, { position: 'absolute', left: '44px', top: '210px', width: '130px', height: '12px', borderRadius: '6px', background: '#3a4552' })
        A.node(ctx, '', ph, { position: 'absolute', left: '44px', top: '240px', width: '90px', height: '12px', borderRadius: '6px', background: '#3a4552' })
        tl.set(ph, { opacity: 0 }, 0)
        tl.fromTo(ph, { opacity: 0, y: -400, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)', immediateRender: false }, a + 0.1)
        ctx.sfx(a + 0.4, 'confirm', { gain: 1 })
        A.confetti(ctx, a + 0.6, { x: 540, y: 1000, n: 36, up: 800, parent: ctx.stage, colors: ['#ff8a7a', '#ffd166', '#7ec8ff', '#c9a7ff', '#7be0a7'] })
        const l1 = A.node(ctx, 't-inter', ctx.stage, { left: '0', width: '1080px', top: '322px', textAlign: 'center', fontSize: '44px', color: '#0f6b5a', letterSpacing: '0.16em', fontWeight: '900', zIndex: 40 }, t.smart.toUpperCase())
        const l2 = A.node(ctx, 't-anton', ctx.stage, { left: '0', width: '1080px', top: '385px', textAlign: 'center', fontSize: '120px', color: '#173a33', zIndex: 40, textTransform: 'none' }, t.smart2)
        for (const e of [l1, l2]) {
          tl.set(e, { opacity: 0 }, 0)
          tl.fromTo(e, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2.4)', immediateRender: false }, a)
        }
        ctx.sfx(a, 'pop')
      }

      A.tag(ctx, { x: 90, y: 250, light: true })
      ctx.music([{ at: 0, bars: 8, part: 'uke', gain: 0.95 }])
      A.sting(ctx, 17.6, { y: 560, light: true, scrim: true })
      A.grain(ctx, { opacity: 0.1 })
      COLD['a10-tontas'](ctx0, C, lang)
    },
  })
}
