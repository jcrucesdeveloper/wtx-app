// A09 — 8-bit boss fight: your personal record as the final boss. Progressive
// overload told as a game (70 kg takes almost all its HP, +2.5 kg finishes it).
// Gaming × gym is a proven overlap (research A: pixel art; B: absurd, language-
// free, escalating). Sprites are drawn procedurally on low-res canvases and
// scaled with nearest-neighbour. Sound: 150 BPM chiptune + 8-bit effects.
// Figures match WTX's demo: bench PR 70 → 72.5, a 9-week streak.

import { composition } from '../../lib/engine.js'
import * as A from '../../lib/art.js'

const T = {
  es: { hook: 'TU RÉCORD ES<br>UN JEFE FINAL', boss: 'PLACA 72.5', fight: '¡LUCHA!', no: '¡NO BASTA!', plus: '+2.5', ko: 'K.O.', rec: 'NUEVO RÉCORD', lvl: 'NIVEL +1', streak: 'RACHA ×9', cta: 'ANÓTALO<br>EN WTX' },
  en: { hook: 'YOUR PR IS<br>A FINAL BOSS', boss: 'PLATE 72.5', fight: 'FIGHT!', no: 'NOT ENOUGH!', plus: '+2.5', ko: 'K.O.', rec: 'NEW RECORD', lvl: 'LEVEL UP', streak: 'STREAK ×9', cta: 'LOG IT<br>IN WTX' },
}

const S = 8 // one logical pixel = 8 screen px (135 × 240 logical)
const C = { k: '#14101c', red: '#e0263a', hi: '#ff5468', deep: '#7d0f1d', skin: '#f2b48a', hair: '#5a3a22', shirt: '#e0263a', pants: '#3b4a78', shoe: '#1b1b28', w: '#fff', chrome: '#c9ced4', gold: '#f7c52b' }

function cv(parent, w, h, draw, css = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  Object.assign(c.style, { position: 'absolute', width: w * S + 'px', height: h * S + 'px', imageRendering: 'pixelated', ...css })
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = false
  draw(g)
  parent.appendChild(c)
  return c
}
const rect = (g, x, y, w, h, col) => {
  g.fillStyle = col
  g.fillRect(x, y, w, h)
}
const box = (g, x, y, w, h, col) => {
  rect(g, x - 1, y - 1, w + 2, h + 2, C.k)
  rect(g, x, y, w, h, col)
}

function drawLifter(g, pose) {
  const up = pose === 'lift' || pose === 'win'
  const crouch = pose === 'crouch'
  const dy = crouch ? 5 : up ? 6 : 2
  // legs
  if (crouch) {
    box(g, 2, dy + 14, 4, 5, C.pants)
    box(g, 10, dy + 14, 4, 5, C.pants)
    box(g, 1, dy + 19, 5, 2, C.shoe)
    box(g, 10, dy + 19, 5, 2, C.shoe)
  } else {
    box(g, 4, dy + 14, 3, 7, C.pants)
    box(g, 9, dy + 14, 3, 7, C.pants)
    box(g, 3, dy + 21, 4, 2, C.shoe)
    box(g, 9, dy + 21, 4, 2, C.shoe)
  }
  // arms
  if (up) {
    box(g, 1, dy - 6, 3, 12, C.skin)
    box(g, 12, dy - 6, 3, 12, C.skin)
  } else {
    box(g, 1, dy + 6, 3, 8, C.skin)
    box(g, 12, dy + 6, 3, 8, C.skin)
  }
  // torso
  box(g, 4, dy + 6, 8, 8, C.shirt)
  rect(g, 6, dy + 8, 4, 2, C.hi)
  // head
  box(g, 5, dy - 1, 6, 6, C.skin)
  rect(g, 5, dy - 1, 6, 2, C.hair)
  rect(g, 6, dy + 2, 1, 1, C.k)
  rect(g, 9, dy + 2, 1, 1, C.k)
  if (pose === 'win') rect(g, 7, dy + 4, 2, 1, C.k)
}

function drawBar(g, plates) {
  // 36 × 8 barbell: bar, then plates from the ends in
  rect(g, 0, 3, 36, 2, C.chrome)
  rect(g, 0, 3, 36, 1, C.w)
  const stack = plates === 3 ? [[5, 8, C.red], [3, 6, C.chrome], [2, 4, C.gold]] : [[5, 8, C.red], [3, 6, C.chrome]]
  let xl = 3
  let xr = 33
  for (const [w, h, col] of stack) {
    box(g, xl, 4 - h / 2, w, h, col)
    xl += w + 1
    box(g, xr - w, 4 - h / 2, w, h, col)
    xr -= w + 1
  }
}

function drawBoss(g) {
  for (let y = 0; y < 36; y++) {
    for (let x = 0; x < 36; x++) {
      const d = Math.hypot(x - 17.5, y - 17.5)
      if (d > 17.6) continue
      let col = C.red
      if (d > 17) col = C.k
      else if (d > 14.6) col = C.deep
      else if (Math.hypot(x - 11, y - 10) < 5) col = C.hi
      rect(g, x, y, 1, 1, col)
    }
  }
  // angry eyes
  for (const ex of [9, 20]) {
    rect(g, ex, 12, 7, 6, C.w)
    rect(g, ex + (ex < 15 ? 3 : 1), 14, 3, 3, C.k)
  }
  // slanted brows
  for (let i = 0; i < 7; i++) {
    rect(g, 9 + i, 9 + Math.floor(i / 2), 1, 2, C.k)
    rect(g, 26 - i, 9 + Math.floor(i / 2), 1, 2, C.k)
  }
  // mouth with teeth
  rect(g, 10, 22, 16, 7, C.k)
  for (const tx of [11, 15, 19, 23]) rect(g, tx, 22, 2, 2, C.w)
  for (const tx of [13, 17, 21]) rect(g, tx, 27, 2, 2, C.w)
}

function drawPlateSmall(g) {
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    const d = Math.hypot(x - 4, y - 4)
    if (d <= 4.4) rect(g, x, y, 1, 1, d > 3.2 ? C.k : d > 1 ? C.chrome : C.k)
  }
}

export default function run(lang) {
  const t = T[lang]
  return composition({
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 16,
    bpm: 150,
    lang,
    build(ctx) {
      const { tl } = ctx
      const r = A.rng(9)
      // ---------- world ----------
      const world = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', overflow: 'hidden' })
      cv(world, 135, 240, (g) => {
        const bands = ['#0b0a1f', '#120d2b', '#1a1038', '#241446', '#2e1a52']
        for (let y = 0; y < 240; y++) rect(g, 0, y, 135, 1, bands[Math.min(4, Math.floor(y / 48))])
        // dithered band edges
        for (let b = 1; b < 5; b++) for (let x = 0; x < 135; x += 2) rect(g, x + (b % 2), b * 48 - 1, 1, 1, bands[b])
        for (let i = 0; i < 40; i++) rect(g, Math.floor(r() * 135), Math.floor(r() * 150), 1, 1, i % 5 ? '#6b6a9a' : '#fff')
        // ground bricks
        rect(g, 0, 190, 135, 50, '#3a2a4e')
        for (let y = 190; y < 240; y += 6) {
          rect(g, 0, y, 135, 1, '#1d1230')
          for (let x = (y / 6) % 2 ? 0 : 6; x < 135; x += 12) rect(g, x, y, 1, 6, '#1d1230')
        }
        rect(g, 0, 190, 135, 2, '#6c4fa0')
      })
      const flashEl = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', background: '#fff', opacity: 0, zIndex: 90 })
      const flash = (at, a = 0.9) => {
        tl.set(flashEl, { opacity: a }, at)
        tl.to(flashEl, { opacity: 0, duration: 0.18, ease: 'power2.out' }, at + 0.04)
      }
      const shake = (at, amp = 20, dur = 0.4) => A.shakeX(ctx, world, at, { amp, n: 8, dur })

      // ---------- boss ----------
      const bossWrap = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 10, transformOrigin: '540px 900px' })
      gsap.set(bossWrap, { scale: 1.4 })
      const bossBox = A.node(ctx, '', bossWrap, { position: 'absolute', left: 540 - 18 * S + 'px', top: '720px', width: 36 * S + 'px', height: 36 * S + 'px' })
      const boss = cv(bossBox, 36, 36, drawBoss)
      for (let i = 0; i < 12; i++) tl.to(bossBox, { y: i % 2 ? 0 : -14, duration: 0.8, ease: 'sine.inOut' }, i * 0.8)
      const bossHit = (at) => {
        flash(at, 0.5)
        for (let f = 0; f < 6; f++) tl.set(boss, { filter: f % 2 ? 'none' : 'brightness(3)' }, at + f * 0.05)
        tl.set(boss, { filter: 'none' }, at + 0.3)
        A.shakeX(ctx, bossBox, at, { amp: 40, n: 8, dur: 0.4 })
        ctx.sfx(at, 'hurt', { gain: 1 })
      }

      // ---------- HUD ----------
      const px = (txt, css, html) => A.node(ctx, 't-pixel', ctx.stage, { color: '#fff', zIndex: 40, ...css }, html ?? txt)
      const hook = px('', { left: '0', width: '1080px', top: '330px', textAlign: 'center', fontSize: '56px', whiteSpace: 'normal', lineHeight: 1.45 }, t.hook)
      tl.to(hook, { opacity: 0, duration: 0.2 }, 1.1)
      const bossLabel = px('', { left: '90px', top: '560px', fontSize: '34px', color: '#ffd166' }, t.boss)
      const hpOuter = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '90px', width: '900px', top: '620px', height: '50px', border: '8px solid #fff', background: '#2a1020', zIndex: 40 })
      const hp = A.node(ctx, '', hpOuter, { position: 'absolute', inset: '0', background: 'repeating-linear-gradient(90deg, #e0263a 0 24px, #b81a2c 24px 28px)', transformOrigin: '0 50%' })
      px('', { left: '90px', top: '1500px', fontSize: '28px', color: '#aab3bd' }, `${t.streak}`)

      // ---------- lifter ----------
      const LY = 1180
      const hero = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', zIndex: 12, transformOrigin: `540px ${LY + 30 * S}px` })
      gsap.set(hero, { scale: 1.3 })
      const lifter = A.node(ctx, '', hero, { position: 'absolute', left: 540 - 8 * S + 'px', top: LY + 'px', width: 16 * S + 'px', height: 30 * S + 'px', zIndex: 12 })
      const poses = {}
      for (const p of ['idle', 'crouch', 'lift', 'win']) {
        poses[p] = cv(lifter, 16, 30, (g) => drawLifter(g, p), { left: '0', top: '0' })
        tl.set(poses[p], { opacity: p === 'idle' ? 1 : 0 }, 0)
      }
      const setPose = (name, at) => {
        for (const p of Object.keys(poses)) tl.set(poses[p], { opacity: p === name ? 1 : 0 }, at)
      }
      // the barbell rides above the lifter's hands
      const bars = [2, 3].map((n, i) => {
        const b = A.node(ctx, '', hero, { position: 'absolute', left: 540 - 18 * S + 'px', top: LY - 5 * S + 'px', width: 36 * S + 'px', height: 8 * S + 'px', zIndex: 14, opacity: i === 0 ? 1 : 0 })
        cv(b, 36, 8, (g) => drawBar(g, n))
        return b
      })
      const barY = (name, y, at, dur = 0.2) => tl.to(bars[name], { y, duration: dur, ease: 'steps(4)' }, at)
      // standing: bar at the hips; crouch: floor; lift: over head
      gsap.set(bars[0], { y: 8 * S })
      const BAR_HIP = 8 * S
      const BAR_FLOOR = 18 * S
      const BAR_UP = -4 * S

      const damage = (txt, at, color = '#ff5468', x = 540, y = 820) => {
        const d = px('', { left: x - 200 + 'px', width: '400px', top: y + 'px', textAlign: 'center', fontSize: '64px', color }, txt)
        tl.set(d, { opacity: 0 }, 0)
        tl.set(d, { opacity: 1 }, at)
        tl.fromTo(d, { y: 0 }, { y: -140, duration: 0.8, ease: 'power2.out', immediateRender: false }, at)
        tl.set(d, { opacity: 0 }, at + 0.9)
      }

      // ---------- the fight ----------
      // intro
      const fight = px('', { left: '0', width: '1080px', top: '1000px', textAlign: 'center', fontSize: '96px', color: '#ffd166', transformOrigin: '50% 50%' }, t.fight)
      tl.set(fight, { opacity: 0 }, 0)
      tl.set(fight, { opacity: 1 }, 1.2)
      tl.set(fight, { opacity: 0 }, 2.0)
      tl.fromTo(fight, { scale: 2 }, { scale: 1, duration: 0.2, ease: 'power3.out', immediateRender: false }, 1.2)
      for (const [i, m] of [[0, 84], [1, 88], [2, 91]]) ctx.sfx(1.2 + i * 0.1, 'blip', { midi: m })

      // attack 1: 70 kg
      setPose('crouch', 2.0)
      tl.set(bars[0], { opacity: 1 }, 2.0)
      barY(0, BAR_FLOOR, 2.0, 0.05)
      ctx.sfx(2.0, 'blip', { midi: 70 })
      setPose('lift', 2.4)
      barY(0, BAR_UP, 2.4, 0.2)
      ctx.sfx(2.4, 'jump')
      ctx.sfx(2.62, 'laser')
      tl.fromTo(bars[0], { rotation: 0 }, { rotation: 0, duration: 0.01 }, 2.6)
      bossHit(2.8)
      tl.to(hp, { scaleX: 0.04, duration: 0.5, ease: 'steps(12)' }, 2.8)
      damage('-70', 2.8)
      shake(2.8, 14, 0.3)
      setPose('idle', 3.4)
      barY(0, BAR_HIP, 3.4, 0.2)

      // the boss laughs it off
      const no = px('', { left: '0', width: '1080px', top: '1010px', textAlign: 'center', fontSize: '60px', color: '#fff' }, t.no)
      tl.set(no, { opacity: 0 }, 0)
      tl.set(no, { opacity: 1 }, 4.0)
      tl.set(no, { opacity: 0 }, 5.0)
      for (let i = 0; i < 4; i++) tl.to(bossBox, { scale: i % 2 ? 1 : 1.12, duration: 0.2, ease: 'steps(3)' }, 4.0 + i * 0.2)
      ctx.sfx(4.0, 'blip', { midi: 60 })
      ctx.sfx(4.2, 'blip', { midi: 57 })
      ctx.sfx(4.4, 'blip', { midi: 53 })

      // +2.5: a small plate drops onto the bar
      const small = A.node(ctx, '', hero, { position: 'absolute', left: 540 - 4.5 * S + 'px', top: '300px', width: 9 * S + 'px', height: 9 * S + 'px', zIndex: 16, opacity: 0 })
      cv(small, 9, 9, drawPlateSmall)
      tl.set(small, { opacity: 1 }, 5.2)
      tl.to(small, { y: LY + BAR_HIP - 300 + 2 * S, duration: 0.45, ease: 'power2.in' }, 5.2)
      tl.set(small, { opacity: 0 }, 5.65)
      tl.set(bars[0], { opacity: 0 }, 5.65)
      tl.set(bars[1], { opacity: 1, y: BAR_HIP }, 5.65)
      ctx.sfx(5.65, 'powerup')
      damage(t.plus, 5.65, '#ffd166', 540, 1000)
      for (let f = 0; f < 6; f++) tl.set(lifter, { filter: f % 2 ? 'none' : 'brightness(2.2)' }, 5.65 + f * 0.06)
      tl.set(lifter, { filter: 'none' }, 6.1)

      // attack 2: 72.5 — the knockout
      setPose('crouch', 6.4)
      tl.set(bars[1], { y: BAR_HIP }, 6.4)
      barY(1, BAR_FLOOR, 6.4, 0.05)
      setPose('lift', 6.8)
      barY(1, BAR_UP, 6.8, 0.2)
      ctx.sfx(6.8, 'jump')
      ctx.sfx(7.02, 'laser')
      flash(7.2)
      shake(7.2, 28, 0.6)
      tl.to(hp, { scaleX: 0, duration: 0.25, ease: 'steps(4)' }, 7.2)
      damage('-2.5', 7.2, '#ffd166')
      ctx.sfx(7.2, 'ko')
      // boss explodes into pixels
      tl.set(bossBox, { opacity: 0 }, 7.3)
      for (let i = 0; i < 26; i++) {
        const sz = (2 + Math.floor(r() * 3)) * S
        const d = A.node(ctx, '', ctx.stage, { position: 'absolute', left: 540 + 'px', top: 940 + 'px', width: sz + 'px', height: sz + 'px', background: [C.red, C.hi, C.deep, C.w, C.k][i % 5], zIndex: 30, opacity: 0 })
        const vx = (r() - 0.5) * 1100
        const vy = -300 - r() * 500
        tl.set(d, { opacity: 1 }, 7.3)
        tl.to(d, { x: vx, duration: 1.1, ease: 'steps(14)' }, 7.3)
        tl.to(d, { y: vy + 900, duration: 1.1, ease: 'steps(14)' }, 7.3)
        tl.set(d, { opacity: 0 }, 8.4)
      }
      setPose('win', 7.4)
      barY(1, BAR_UP, 7.4, 0.05)

      tl.set([bossLabel, hpOuter], { opacity: 0 }, 8.3)
      // K.O. and the record
      const ko = px('', { left: '0', width: '1080px', top: '560px', textAlign: 'center', fontSize: '200px', color: '#ff5468', transformOrigin: '50% 50%', textShadow: '10px 10px 0 #14101c' }, t.ko)
      tl.set(ko, { opacity: 0 }, 0)
      tl.set(ko, { opacity: 1 }, 7.8)
      tl.fromTo(ko, { scale: 2.4 }, { scale: 1, duration: 0.25, ease: 'steps(5)', immediateRender: false }, 7.8)
      tl.set(ko, { opacity: 0 }, 9.2)
      ctx.sfx(7.8, 'hit', { gain: 0.9 })
      const rec = px('', { left: '0', width: '1080px', top: '520px', textAlign: 'center', fontSize: '60px', color: '#ffd166', lineHeight: 1.6 }, `${t.rec}<br><span style="font-size:130px;color:#fff">72.5</span> <span style="font-size:48px">KG</span>`)
      tl.set(rec, { opacity: 0 }, 0)
      tl.set(rec, { opacity: 1 }, 9.2)
      tl.fromTo(rec, { scale: 1.3 }, { scale: 1, duration: 0.2, ease: 'steps(4)', immediateRender: false }, 9.2)
      ctx.sfx(9.2, 'powerup')
      // coins
      for (let i = 0; i < 14; i++) {
        const cx = 120 + r() * 840
        const cn = A.node(ctx, '', ctx.stage, { position: 'absolute', left: cx + 'px', top: '-60px', width: '40px', height: '40px', background: C.gold, border: '6px solid #a87c06', borderRadius: '6px', zIndex: 30, opacity: 0 })
        const at = 9.3 + r() * 1.4
        tl.set(cn, { opacity: 1 }, at)
        tl.to(cn, { y: 1000 + r() * 500, duration: 1.0, ease: 'steps(10)' }, at)
        tl.set(cn, { opacity: 0 }, at + 1.05)
        if (i % 2 === 0) ctx.sfx(at + 0.9, 'coin', { gain: 0.8 })
      }
      // level up bar
      const lvl = px('', { left: '90px', top: '1330px', fontSize: '44px', color: '#7be495' }, t.lvl)
      const xpOuter = A.node(ctx, '', ctx.stage, { position: 'absolute', left: '90px', width: '900px', top: '1400px', height: '40px', border: '8px solid #fff', background: '#10241c', zIndex: 40 })
      const xp = A.node(ctx, '', xpOuter, { position: 'absolute', inset: '0', background: 'repeating-linear-gradient(90deg, #2fb36d 0 24px, #238a54 24px 28px)', transformOrigin: '0 50%' })
      tl.set([lvl, xpOuter], { opacity: 0 }, 0)
      tl.set([lvl, xpOuter], { opacity: 1 }, 10.0)
      tl.set(xp, { scaleX: 0 }, 0)
      tl.to(xp, { scaleX: 1, duration: 1.0, ease: 'steps(14)' }, 10.1)
      ctx.sfx(10.1, 'riser', { dur: 1.0, gain: 0.4 })
      ctx.sfx(11.1, 'powerup')

      // call to action
      const cta = px('', { left: '0', width: '1080px', top: '700px', textAlign: 'center', fontSize: '84px', whiteSpace: 'normal', lineHeight: 1.5, color: '#fff', textShadow: '8px 8px 0 #14101c' }, t.cta)
      tl.set(cta, { opacity: 0 }, 0)
      tl.set(rec, { opacity: 0 }, 11.6)
      tl.set(cta, { opacity: 1 }, 11.6)
      ctx.sfx(11.6, 'blip', { midi: 91 })

      A.tag(ctx, { x: 90, y: 250 })
      ctx.music([{ at: 0, bars: 1, part: 'chip-lite' }, { at: 1.6, bars: 9, part: 'chip', fill: true }])
      ctx.sfx(0, 'impact', { gain: 0.4 })
      A.sting(ctx, 13.6, { y: 420, scrim: true })
      A.grain(ctx, { opacity: 0.06, blend: 'screen' })
    },
  })
}
