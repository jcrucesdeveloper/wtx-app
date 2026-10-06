// Shared pieces for the animated reels (a01…a12): rigs, plates, confetti,
// line boil, marker text, bubbles and the WTX sonic-logo sting. Everything
// schedules onto `ctx.tl` at absolute seconds. Research and art direction:
// listing/research/09-animation-viral-and-sound.md.

/* global gsap */

export const PAL = {
  ink: '#16120f',
  paper: '#f3ead8',
  cream: '#fff8e8',
  red: '#e0263a',
  redHi: '#ff5468',
  redDeep: '#8f1224',
  night: '#05080a',
  // IWF plate colours
  p25: ['#e0263a', '#b81a2c', '#7d0f1d'],
  p20: ['#2f6df6', '#2455c4', '#183a85'],
  p15: ['#f7c52b', '#d4a417', '#8f6c05'],
  p10: ['#2fb36d', '#238a54', '#155b36'],
  p5: ['#f1f3f5', '#c9ced4', '#8b929a'],
  chrome: ['#d9dde2', '#aab0b8', '#6b727b'],
}

/** Deterministic random numbers, so every render is identical. */
export function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A positioned div. */
export function node(ctx, cls, parent, css, html) {
  const e = ctx.el('div', cls, parent ?? ctx.stage, html)
  if (css) Object.assign(e.style, css)
  return e
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.25'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/** Film/paper grain over everything (the 2026 handmade look). */
export function grain(ctx, { opacity = 0.22, blend = 'multiply' } = {}) {
  node(ctx, 'a-vignette')
  return node(ctx, 'a-grain', ctx.stage, { backgroundImage: GRAIN, opacity, mixBlendMode: blend })
}

export function solid(ctx, color) {
  return node(ctx, 'layer', ctx.stage, { background: color })
}

/** Paper with soft fibres and a darker edge. */
export function paperBg(ctx, color = PAL.paper) {
  const l = node(ctx, 'layer', ctx.stage, { background: color })
  node(ctx, 'layer', l, {
    background: 'radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,0.5), rgba(120,90,40,0.12) 100%)',
  })
  return l
}

/* ---------- rig ---------- */

function joint(ctx, parent, x = 0, y = 0) {
  return node(ctx, 'joint', parent, { left: x + 'px', top: y + 'px' })
}

/** A bone from the joint, down (dir 1) or up (dir -1), with round ends. */
function bone(ctx, parent, len, w, dir = 1, color) {
  const b = node(ctx, 'bone', parent, {
    left: -w / 2 + 'px',
    width: w + 'px',
    height: len + w + 'px',
    top: dir === 1 ? -w / 2 + 'px' : -len - w / 2 + 'px',
    borderRadius: w / 2 + 'px',
  })
  if (color) b.style.setProperty('--bone', color)
  return b
}

/**
 * A side-on stick figure facing right. Joint rotations are degrees, 0 = hanging
 * straight down, positive = swings backwards (clockwise on screen), so reaching
 * forward is negative. Torso `lean` positive = leaning forward.
 *
 * parts: hip (move it for squats), torso, head, aF/eF (front shoulder/elbow),
 * aB/eB, tF/kF/fF (front thigh/knee/foot), tB/kB/fB, hand (front hand node).
 */
export function stickRig(ctx, parent, { x, y, scale = 1, color = PAL.ink, w = 14, headR = 40, torso = 120, arm = [70, 64], leg = [80, 80], fill = PAL.paper } = {}) {
  const root = node(ctx, 'rig', parent, { left: x + 'px', top: y + 'px' })
  gsap.set(root, { scale })
  root.style.setProperty('--bone', color)
  const legLen = leg[0] + leg[1]
  const hip = joint(ctx, root, 0, 0)
  const mkLeg = () => {
    const th = joint(ctx, hip, 0, 0)
    bone(ctx, th, leg[0], w)
    const kn = joint(ctx, th, 0, leg[0])
    bone(ctx, kn, leg[1], w)
    const ft = joint(ctx, kn, 0, leg[1])
    bone(ctx, ft, 34, w)
    gsap.set(ft, { rotation: -90 })
    return { th, kn, ft }
  }
  const lB = mkLeg()
  const tor = joint(ctx, hip, 0, 0)
  const mkArm = (parent2) => {
    const sh = joint(ctx, parent2, 0, -torso + 16)
    bone(ctx, sh, arm[0], w)
    const el = joint(ctx, sh, 0, arm[0])
    bone(ctx, el, arm[1], w)
    const hand = joint(ctx, el, 0, arm[1])
    node(ctx, 'cap', hand, { left: -w * 0.9 + 'px', top: -w * 0.9 + 'px', width: w * 1.8 + 'px', height: w * 1.8 + 'px' })
    return { sh, el, hand }
  }
  const aB = mkArm(tor)
  bone(ctx, tor, torso, w, -1)
  const neck = joint(ctx, tor, 0, -torso)
  const head = node(ctx, 'head', neck, {
    left: -headR + 'px',
    top: -headR * 2 + 6 + 'px',
    width: headR * 2 + 'px',
    height: headR * 2 + 'px',
    borderWidth: w + 'px',
    '--head-fill': fill,
    boxSizing: 'border-box',
  })
  head.style.setProperty('--head-fill', fill)
  gsap.set(head, { transformOrigin: '50% 100%' })
  const eye = node(ctx, 'eye', head, { left: headR * 1.0 + 'px', top: headR * 0.55 + 'px', width: headR * 0.26 + 'px', height: headR * 0.26 + 'px' })
  const mouth = node(ctx, 'mouth', head, { left: headR * 1.05 + 'px', top: headR * 1.15 + 'px', width: headR * 0.55 + 'px', height: '5px' })
  const brow = node(ctx, 'mouth', head, { left: headR * 0.92 + 'px', top: headR * 0.36 + 'px', width: headR * 0.5 + 'px', height: '5px', opacity: 0 })
  const lF = mkLeg()
  // The leg built first sits behind; the one built after the torso is in front.
  hip.appendChild(lF.th)
  const aF = mkArm(tor)
  tor.appendChild(head.parentNode)
  const rig = { root, hip, torso: tor, head, neck, eye, mouth, brow, aF, aB, lF, lB, w, legLen, ground: y, scale }
  rig.hand = aF.hand
  poseNow(rig, STAND)
  return rig
}

export const STAND = { hip: 0, lean: 0, head: 0, aF: [6, 8], aB: [-6, 6], lF: [0, 0, -90], lB: [0, 0, -90] }

function targets(rig, p) {
  const t = []
  const add = (el, v) => v !== undefined && t.push([el, { rotation: v }])
  if (p.hip !== undefined) t.push([rig.hip, { y: -rig.legLen - rig.w / 2 + p.hip }])
  if (p.hipX !== undefined) t.push([rig.hip, { x: p.hipX }])
  add(rig.torso, p.lean)
  add(rig.neck, p.head)
  if (p.aF) (add(rig.aF.sh, p.aF[0]), add(rig.aF.el, p.aF[1]))
  if (p.aB) (add(rig.aB.sh, p.aB[0]), add(rig.aB.el, p.aB[1]))
  if (p.lF) (add(rig.lF.th, p.lF[0]), add(rig.lF.kn, p.lF[1]), add(rig.lF.ft, p.lF[2]))
  if (p.lB) (add(rig.lB.th, p.lB[0]), add(rig.lB.kn, p.lB[1]), add(rig.lB.ft, p.lB[2]))
  return t
}

export function poseNow(rig, p) {
  for (const [el, vars] of targets(rig, p)) gsap.set(el, vars)
}

/** Tween the rig into pose `p` (missing joints stay). */
export function pose(ctx, rig, p, at, dur = 0.3, ease = 'power2.inOut') {
  for (const [el, vars] of targets(rig, p)) ctx.tl.to(el, { ...vars, duration: dur, ease }, at)
}

/** Face states for the stick figure's mouth. */
export function mood(ctx, rig, kind, at) {
  const set = (css, brow = 0, rot = 0) => {
    ctx.tl.set(rig.mouth, css, at)
    ctx.tl.set(rig.brow, { opacity: brow, rotation: rot }, at)
  }
  if (kind === 'flat') set({ height: 5, borderRadius: 8, width: 22, y: 0, rotation: 0 })
  if (kind === 'o') set({ height: 22, width: 22, borderRadius: 11, y: -8, rotation: 0 })
  if (kind === 'smile') set({ height: 14, width: 30, borderRadius: '0 0 16px 16px', y: -4, rotation: 0 })
  if (kind === 'sad') set({ height: 14, width: 30, borderRadius: '16px 16px 0 0', y: 2, rotation: 0 })
  if (kind === 'worry') set({ height: 14, width: 26, borderRadius: '16px 16px 0 0', y: 2 }, 1, -14)
  if (kind === 'effort') set({ height: 12, width: 34, borderRadius: 6, y: -2 }, 1, 12)
}

/* ---------- plates ---------- */

/** A weight plate seen face-on. `colors` = [light, mid, rim]. */
export function disc(ctx, parent, { x = 0, y = 0, r = 100, colors = PAL.p25, hole = 0.18 } = {}) {
  const d = node(ctx, 'disc', parent, { left: x - r + 'px', top: y - r + 'px', width: r * 2 + 'px', height: r * 2 + 'px', '--c1': colors[0], '--c2': colors[1], '--c3': colors[2] })
  d.style.setProperty('--c1', colors[0])
  d.style.setProperty('--c2', colors[1])
  d.style.setProperty('--c3', colors[2])
  node(ctx, 'hole', d, { left: r * (1 - hole) + 'px', top: r * (1 - hole) + 'px', width: r * hole * 2 + 'px', height: r * hole * 2 + 'px' })
  return d
}

/* ---------- plate mascot ---------- */

/**
 * "Placa": a 25 kg plate with a face. The hole is its mouth. Returns parts for
 * `emote`. `size` is the plate diameter in px.
 */
export function mascot(ctx, parent, { x, y, size = 420, limbs = PAL.ink } = {}) {
  const root = node(ctx, 'rig', parent, { left: x + 'px', top: y + 'px' })
  const R = size / 2
  const mk = (px) => px + 'px'
  // arms and legs sit behind the plate
  const limb = (jx, jy, len, w, color, mitt) => {
    const j = joint(ctx, root, jx, jy)
    bone(ctx, j, len, w, 1, color)
    const hand = joint(ctx, j, 0, len)
    if (mitt) node(ctx, 'cap', hand, { left: mk(-w * 1.1), top: mk(-w * 1.1), width: mk(w * 2.2), height: mk(w * 2.2), background: '#fff', border: `${w * 0.28}px solid ${PAL.ink}` })
    return j
  }
  const armL = limb(-R * 0.96, 0, R * 0.62, 24, limbs, true)
  const armR = limb(R * 0.96, 0, R * 0.62, 24, limbs, true)
  const legL = limb(-R * 0.4, R * 0.92, R * 0.42, 26, limbs)
  const legR = limb(R * 0.4, R * 0.92, R * 0.42, 26, limbs)
  for (const [l, s] of [[legL, -1], [legR, 1]]) node(ctx, 'bone', l, { left: mk(s < 0 ? -34 : -6), top: mk(R * 0.42 - 12), width: '40px', height: '24px', borderRadius: '14px', background: limbs })
  gsap.set(armL, { rotation: 18 })
  gsap.set(armR, { rotation: -18 })
  const body = node(ctx, '', root, { position: 'absolute', left: '0', top: '0' })
  const plate = disc(ctx, body, { r: R, colors: PAL.p25, hole: 0.0 })
  plate.style.boxShadow = `inset 0 0 0 ${size * 0.03}px ${PAL.p25[2]}, inset 0 -${size * 0.03}px ${size * 0.06}px rgba(0,0,0,0.3), 0 ${size * 0.04}px ${size * 0.08}px rgba(0,0,0,0.4)`
  node(ctx, 't-inter', body, { left: mk(-R * 0.4), width: mk(R * 0.8), top: mk(-R * 0.86), textAlign: 'center', fontSize: mk(size * 0.065), color: 'rgba(0,0,0,0.35)', letterSpacing: '0.08em' }, '25 KG')
  const eyes = [-1, 1].map((s) => {
    const e = node(ctx, '', body, { position: 'absolute', left: mk(s * R * 0.34 - R * 0.17), top: mk(-R * 0.36), width: mk(R * 0.34), height: mk(R * 0.42), borderRadius: '50%', background: '#fff', border: `${size * 0.012}px solid ${PAL.ink}`, overflow: 'hidden' })
    const pupil = node(ctx, '', e, { position: 'absolute', left: mk(R * 0.08), top: mk(R * 0.12), width: mk(R * 0.16), height: mk(R * 0.2), borderRadius: '50%', background: PAL.ink })
    const brow = node(ctx, '', body, { position: 'absolute', left: mk(s * R * 0.34 - R * 0.2), top: mk(-R * 0.5), width: mk(R * 0.4), height: mk(size * 0.032), borderRadius: '99px', background: PAL.ink })
    return { e, pupil, brow, s }
  })
  const mouth = node(ctx, '', body, { position: 'absolute', left: mk(-R * 0.17), top: mk(R * 0.06), width: mk(R * 0.34), height: mk(R * 0.34), borderRadius: '50%', background: '#1a0508', boxShadow: `inset 0 ${size * 0.015}px ${size * 0.03}px #000, 0 0 0 ${size * 0.012}px ${PAL.p25[2]}` })
  const parts = { root, body, plate, eyes, mouth, armL, armR, legL, legR, size }
  emote(ctx, parts, 'calm', 0, 0)
  return parts
}

const EMOTES = {
  calm: { brow: [0, 0], pupil: [0, 0], mouth: 1, lid: 1 },
  smug: { brow: [-8, 10], pupil: [0.5, 0.2], mouth: 0.5, lid: 0.75 },
  angry: { brow: [24, 24], pupil: [0, 0.2], mouth: 1.25, lid: 0.85 },
  shock: { brow: [-12, -12], pupil: [0, 0], mouth: 1.5, lid: 1.2 },
  happy: { brow: [-10, -10], pupil: [0, -0.2], mouth: 1.1, lid: 1 },
  side: { brow: [8, 0], pupil: [1, 0], mouth: 0.6, lid: 1 },
}

export function emote(ctx, m, kind, at, dur = 0.12) {
  const e = EMOTES[kind]
  const R = m.size / 2
  m.eyes.forEach(({ e: eye, pupil, brow, s }, i) => {
    ctx.tl.to(brow, { rotation: e.brow[i] * -s, y: kind === 'shock' || kind === 'happy' ? -R * 0.05 : 0, duration: dur, ease: 'power2.out' }, at)
    ctx.tl.to(pupil, { x: e.pupil[0] * R * 0.06, y: e.pupil[1] * R * 0.08, duration: dur, ease: 'power2.out' }, at)
    ctx.tl.to(eye, { scaleY: e.lid, duration: dur, ease: 'power2.out' }, at)
  })
  ctx.tl.to(m.mouth, { scale: e.mouth, duration: dur, ease: 'back.out(3)' }, at)
}

/* ---------- confetti, sparkles ---------- */

export function confetti(ctx, at, { x = 540, y = 900, n = 36, spread = 520, up = 700, colors = [PAL.red, '#f7c52b', '#2f6df6', '#2fb36d', '#fff'], size = 20, dur = 1.6, gravity = 1500, seed = 3, sound = true, parent } = {}) {
  const r = rng(seed)
  if (sound) ctx.sfx(at, 'pop', { gain: 0.8 })
  for (let i = 0; i < n; i++) {
    const w = size * (0.6 + r() * 0.8)
    const p = node(ctx, '', parent, { position: 'absolute', left: x + 'px', top: y + 'px', width: w + 'px', height: w * 0.5 + 'px', background: colors[i % colors.length], borderRadius: '3px', zIndex: 50, opacity: 0 })
    const vx = (r() - 0.5) * spread * 2
    const vy = -up * (0.5 + r() * 0.6)
    const d = dur * (0.8 + r() * 0.4)
    ctx.tl.set(p, { opacity: 1 }, at)
    ctx.tl.to(p, { x: vx * d * 0.6, duration: d, ease: 'power1.out' }, at)
    ctx.tl.to(p, { y: vy * d * 0.5 + 0.5 * gravity * d * d * 0.25, duration: d, ease: 'power1.in' }, at)
    ctx.tl.to(p, { rotation: (r() - 0.5) * 900, duration: d, ease: 'none' }, at)
    ctx.tl.to(p, { opacity: 0, duration: 0.25 }, at + d - 0.25)
  }
}

/** A star-burst of short rays. */
export function burst(ctx, at, { x, y, r = 300, n = 12, color = '#fff', w = 12, dur = 0.5, parent } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360
    const ray = node(ctx, '', parent, { position: 'absolute', left: x - w / 2 + 'px', top: y + 'px', width: w + 'px', height: r * 0.35 + 'px', background: color, borderRadius: w + 'px', transformOrigin: `${w / 2}px 0`, opacity: 0, zIndex: 45 })
    gsap.set(ray, { rotation: a + 180 })
    ctx.tl.fromTo(ray, { opacity: 1, y: r * 0.25, scaleY: 0.2 }, { y: r * 0.9, scaleY: 1, opacity: 0, duration: dur, ease: 'power3.out', immediateRender: false }, at)
  }
}

/* ---------- hand-drawn feel ---------- */

/**
 * An SVG displacement filter that makes everything it is applied to wobble
 * like a pen line. Returns { css, boil(from, to, fps) }: `boil` re-seeds the
 * noise at a low frame rate so the lines "boil" the way hand animation does.
 */
export function rough(ctx, id, { scale = 5, freq = 0.012 } = {}) {
  const wrap = document.createElement('div')
  wrap.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}"/></filter></svg>`
  ctx.stage.appendChild(wrap.firstChild)
  const turb = ctx.stage.querySelector(`#${id} feTurbulence`)
  return {
    css: `url(#${id})`,
    boil(from, to, fps = 8) {
      const step = 1 / fps
      let k = 1
      for (let t = from; t < to; t += step) ctx.tl.set(turb, { attr: { seed: 1 + (k++ % 5) } }, t)
    },
  }
}

/** Text written in marker: a left-to-right wipe with a pencil sound. */
export function markerText(ctx, html, { x, y, size = 80, at, dur = 0.6, color = PAL.ink, rotate = 0, font = 't-marker', sound = true, out } = {}) {
  const e = node(ctx, font, ctx.stage, { left: x + 'px', top: y + 'px', fontSize: size + 'px', color, zIndex: 20 }, html)
  if (rotate) gsap.set(e, { rotation: rotate })
  ctx.tl.set(e, { clipPath: 'inset(-10% 100% -10% 0)' }, 0)
  ctx.tl.to(e, { clipPath: 'inset(-10% 0% -10% 0)', duration: dur, ease: 'none' }, at)
  if (sound) ctx.sfx(at, 'pencil', { dur: dur, gain: 0.7 })
  if (out !== undefined) ctx.tl.set(e, { opacity: 0 }, out)
  return e
}

/** A speech bubble that pops from its tail. `x`,`y` = top-left. */
export function bubble(ctx, text, { x, y, w, at, out, tailX = 0.5, size = 52, parent, sound = 'pop' } = {}) {
  const b = node(ctx, 'bubble', parent, { left: x + 'px', top: y + 'px', width: w + 'px', fontSize: size + 'px', '--tail-x': tailX * 100 + '%' }, text)
  b.style.setProperty('--tail-x', tailX * 100 + '%')
  ctx.tl.set(b, { opacity: 0 }, 0)
  ctx.tl.fromTo(b, { opacity: 0, scale: 0.4, rotation: -4 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2.6)', immediateRender: false }, at)
  if (sound) ctx.sfx(at, sound, { gain: 0.6 })
  if (out !== undefined) ctx.tl.set(b, { opacity: 0 }, out)
  return b
}

/* ---------- brand ---------- */

const MARK =
  '<svg viewBox="0 0 100 100"><g fill="currentColor"><rect x="24" y="47" width="52" height="6" rx="3"/><rect x="13" y="31" width="10" height="38" rx="3.5"/><rect x="77" y="31" width="10" height="38" rx="3.5"/></g></svg>'

/** The small persistent brand tag (replaces an end card). */
export function tag(ctx, { x = 90, y = 250, light = false, text = 'wtxworkout.com' } = {}) {
  const t = node(ctx, 'a-tag' + (light ? ' a-tag--light' : ''), ctx.stage, { left: x + 'px', top: y + 'px' }, `${MARK.replace('currentColor', '#e0263a')}<b>WTX</b><span>${text}</span>`)
  return t
}

/**
 * The WTX sonic-logo sting: three rising marimba notes and a plate clank
 * (music.mjs `stinger`) with the mark popping in. < 1.2 s, then it stays.
 */
export function sting(ctx, at, { y = 760, light = false, text = 'wtxworkout.com', scrim = true, out } = {}) {
  if (scrim) {
    const s = node(ctx, 'layer', ctx.stage, { background: light ? 'rgba(243,234,216,0.72)' : 'rgba(5,8,10,0.7)', zIndex: 78 })
    ctx.tl.set(s, { opacity: 0 }, 0)
    ctx.tl.to(s, { opacity: 1, duration: 0.2 }, at)
  }
  const wrap = node(ctx, 'a-sting' + (light ? ' a-sting--light' : ''), ctx.stage, { left: '0', width: ctx.W + 'px', top: y + 'px' })
  const mark = node(ctx, 's-mark', wrap, null, MARK.replace('currentColor', '#fff'))
  const word = ctx.el('b', '', wrap, 'WTX')
  const url = ctx.el('small', '', wrap, text)
  ctx.tl.set([mark, word, url], { opacity: 0 }, 0)
  ctx.tl.fromTo(mark, { scale: 0.2, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'elastic.out(1,0.5)', immediateRender: false }, at + 0.36)
  ctx.tl.fromTo(word, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'back.out(3)', immediateRender: false }, at + 0.42)
  ctx.tl.fromTo(url, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false }, at + 0.6)
  ctx.sfx(at, 'stinger', { gain: 1 })
  if (out !== undefined) ctx.tl.set(wrap, { opacity: 0 }, out)
  return wrap
}

/** Camera-style punch/shake on any element. */
export function bump(ctx, el, at, { amount = 1.06, dur = 0.3 } = {}) {
  ctx.tl.fromTo(el, { scale: amount }, { scale: 1, duration: dur, ease: 'expo.out', immediateRender: false }, at)
}

export function shakeX(ctx, el, at, { amp = 14, n = 6, dur = 0.3 } = {}) {
  const step = dur / n
  for (let i = 0; i < n; i++) ctx.tl.to(el, { x: (i % 2 ? -1 : 1) * amp * (1 - i / n), duration: step, ease: 'none' }, at + i * step)
  ctx.tl.to(el, { x: 0, duration: step }, at + dur)
}

/** Centre of a rig's front hand in stage pixels (measured, so props can be placed on it). */
export function handPos(ctx, rig) {
  const r = rig.hand.firstChild.getBoundingClientRect()
  const s = ctx.stage.getBoundingClientRect()
  return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top }
}
