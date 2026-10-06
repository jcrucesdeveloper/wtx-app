// Crude hand-drawn cartoon kit for the comedy reels (batch C). The look and
// the rules come from listing/research/11-the-art-of-going-viral.md: wobbly
// black marker, flat fills, line boil, SNAP poses and held frames (limited
// animation), big expressive faces, gibberish speech with short bubbles, and
// a meme caption instead of an ad headline. No brand tag, no logo sting.
//
// Characters are front-facing div puppets. Joint rotations are degrees,
// 0 = hanging straight down, positive = clockwise on screen. `arms`/`legs`
// in a pose are mirrored for you: arms [sh, el] raises both arms outward.

/* global gsap */

import { node, rng, rough } from './art.js'

export const INK = '#141414'
export const PAPER = '#f6f1e4'

const px = (n) => n + 'px'
function joint(ctx, parent, x = 0, y = 0) {
  return node(ctx, 'joint', parent, { left: px(x), top: px(y) })
}
function bone(ctx, parent, len, w, color = INK) {
  return node(ctx, 'bone', parent, { left: px(-w / 2), top: px(-w / 2), width: px(w), height: px(len + w), borderRadius: px(w / 2), background: color })
}

/* ---------- stage ---------- */

/**
 * Paper, a wobbly floor line, and a scene layer that boils like a pen line.
 * Returns the scene element: put everything drawn into it.
 */
export function stage(ctx, { bg = PAPER, floorY = 1400, floor = true, id = 'toonRough', wobble = 5 } = {}) {
  node(ctx, 'layer', ctx.stage, { background: bg })
  node(ctx, 'layer', ctx.stage, { background: 'radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,0.45), rgba(120,90,40,0.10) 100%)' })
  const r = rough(ctx, id, { scale: wobble, freq: 0.013 })
  r.boil(0, ctx.duration, 8)
  const scene = node(ctx, 'layer', ctx.stage, { filter: r.css, transformOrigin: '540px 1000px' })
  if (floor) node(ctx, '', scene, { position: 'absolute', left: '30px', width: '1020px', top: px(floorY), height: '10px', background: INK, borderRadius: '6px' })
  return scene
}

/** A meme caption: white box, black text, the way people post. On frame 0 unless `at` is given. */
export function caption(ctx, html, { y = 290, at = 0, out, size = 58, sound = 'pop' } = {}) {
  const c = node(ctx, 't-cap', ctx.stage, { top: px(y), fontSize: px(size) }, `<span>${html}</span>`)
  if (at > 0) {
    ctx.tl.set(c, { opacity: 0 }, 0)
    ctx.tl.fromTo(c, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(3)', immediateRender: false }, at)
    if (sound) ctx.sfx(at, sound, { gain: 0.7 })
  }
  if (out !== undefined) ctx.tl.set(c, { opacity: 0 }, out)
  return c
}

/** A tiny hand-written signature, the way an animator signs. Not a logo. */
export function sign(ctx, { x = 900, y = 1470, color = INK } = {}) {
  return node(ctx, 't-marker', ctx.stage, { left: px(x), top: px(y), fontSize: '34px', color, opacity: 0.4, transform: 'rotate(-6deg)', zIndex: 40 }, 'wtx')
}

/* ---------- characters ---------- */

/**
 * A front-facing doodle person. Options: shirt colour, build sizes, hair
 * ('bun' | 'cap' | 'band' | 'flat' | null), glasses, skeleton.
 */
export function person(ctx, parent, o = {}) {
  const { x, y, scale = 1.6, shirt = '#e0263a', skin = '#fffdf7', headR = 70, torsoW = 110, torsoH = 140, armW = 16, legW = 16, arm = [62, 58], leg = [70, 66], hair = null, glasses = false, skeleton = false } = o
  const root = node(ctx, 'rig', parent, { left: px(x), top: px(y) })
  gsap.set(root, { scale })
  const legLen = leg[0] + leg[1]
  const body = joint(ctx, root, 0, 0)
  gsap.set(body, { y: -legLen })
  const mkLeg = (s) => {
    const th = joint(ctx, body, s * torsoW * 0.24, 0)
    bone(ctx, th, leg[0], legW)
    const kn = joint(ctx, th, 0, leg[0])
    bone(ctx, kn, leg[1], legW)
    node(ctx, '', kn, { position: 'absolute', left: px(s < 0 ? -34 : -10), top: px(leg[1] - 8), width: '44px', height: '22px', borderRadius: '12px', background: INK })
    return { th, kn }
  }
  const lL = mkLeg(-1)
  const lR = mkLeg(1)
  const tor = joint(ctx, body, 0, 0)
  const torso = node(ctx, '', tor, { position: 'absolute', left: px(-torsoW / 2), top: px(-torsoH), width: px(torsoW), height: px(torsoH), borderRadius: '30px', background: skeleton ? 'repeating-linear-gradient(#fffdf7 0 14px, #141414 14px 20px)' : shirt, border: `8px solid ${INK}`, boxSizing: 'border-box', transformOrigin: '50% 100%' })
  const mkArm = (s) => {
    const sh = joint(ctx, tor, s * (torsoW / 2 - 6), -torsoH + 24)
    bone(ctx, sh, arm[0], armW)
    const el = joint(ctx, sh, 0, arm[0])
    bone(ctx, el, arm[1], armW)
    const hand = joint(ctx, el, 0, arm[1])
    node(ctx, '', hand, { position: 'absolute', left: '-17px', top: '-17px', width: '34px', height: '34px', borderRadius: '50%', background: '#fffdf7', border: `7px solid ${INK}`, boxSizing: 'border-box' })
    return { sh, el, hand }
  }
  const aL = mkArm(-1)
  const aR = mkArm(1)
  const neck = joint(ctx, tor, 0, -torsoH + 10)
  const R = headR
  const head = node(ctx, '', neck, { position: 'absolute', left: px(-R), top: px(-2 * R + 6), width: px(2 * R), height: px(2 * R), transformOrigin: '50% 100%' })
  const skull = node(ctx, '', head, { position: 'absolute', inset: '0', borderRadius: '50%', background: skin, border: `8px solid ${INK}`, boxSizing: 'border-box' })
  // hair
  if (hair === 'bun') {
    node(ctx, '', head, { position: 'absolute', left: px(R - 30), top: '-40px', width: '60px', height: '60px', borderRadius: '50%', background: '#cfd3d8', border: `8px solid ${INK}`, boxSizing: 'border-box' })
    node(ctx, '', head, { position: 'absolute', left: '0', top: '0', width: px(2 * R), height: px(R * 0.78), borderRadius: `${R}px ${R}px 0 0`, background: '#cfd3d8', border: `8px solid ${INK}`, boxSizing: 'border-box' })
  } else if (hair === 'flat') {
    node(ctx, '', head, { position: 'absolute', left: '0', top: '0', width: px(2 * R), height: px(R * 0.46), borderRadius: `${R}px ${R}px 0 0`, background: INK })
  } else if (hair === 'cap') {
    node(ctx, '', head, { position: 'absolute', left: '0', top: '0', width: px(2 * R), height: px(R * 0.7), borderRadius: `${R}px ${R}px 0 0`, background: '#2f6df6', border: `8px solid ${INK}`, boxSizing: 'border-box' })
    node(ctx, '', head, { position: 'absolute', left: px(-34), top: px(R * 0.5), width: '60px', height: '18px', borderRadius: '10px', background: '#2f6df6', border: `7px solid ${INK}`, boxSizing: 'border-box' })
  } else if (hair === 'band') {
    node(ctx, '', head, { position: 'absolute', left: '4px', top: px(R * 0.3), width: px(2 * R - 8), height: '20px', background: '#e0263a', border: `6px solid ${INK}`, boxSizing: 'border-box', borderRadius: '6px' })
  }
  // face
  const eyeY = R * 0.86
  const eyes = [-1, 1].map((s) => {
    const cx = R + s * R * 0.36
    const w = R * 0.54
    const h = R * 0.62
    const eye = node(ctx, '', head, { position: 'absolute', left: px(cx - w / 2), top: px(eyeY - h / 2), width: px(w), height: px(h), borderRadius: '50%', background: skeleton ? INK : '#fff', border: `6px solid ${INK}`, boxSizing: 'border-box', overflow: 'hidden' })
    const pupil = node(ctx, '', eye, { position: 'absolute', left: px(w / 2 - 6 - R * 0.11), top: px(h / 2 - 6 - R * 0.11), width: px(R * 0.22), height: px(R * 0.22), borderRadius: '50%', background: INK, opacity: skeleton ? 0 : 1 })
    const lid = node(ctx, '', eye, { position: 'absolute', left: '-6px', right: '-6px', top: px(-h), height: px(h), background: skin, borderBottom: `6px solid ${INK}` })
    const arc = node(ctx, '', head, { position: 'absolute', left: px(cx - w / 2), top: px(eyeY - h * 0.2), width: px(w), height: px(h * 0.5), borderTop: `8px solid ${INK}`, borderRadius: `${w}px ${w}px 0 0`, boxSizing: 'border-box', opacity: 0 })
    const ex = node(ctx, 't-inter', head, { left: px(cx - w / 2), top: px(eyeY - h * 0.62), width: px(w), textAlign: 'center', fontSize: px(R * 0.8), fontWeight: '900', color: INK, opacity: 0, lineHeight: 1 }, '×')
    const brow = node(ctx, '', head, { position: 'absolute', left: px(cx - R * 0.3), top: px(eyeY - R * 0.56), width: px(R * 0.6), height: '10px', borderRadius: '5px', background: INK })
    const tear = node(ctx, '', head, { position: 'absolute', left: px(cx - 9), top: px(eyeY + h * 0.3), width: '18px', height: px(R * 0.9), borderRadius: '9px', background: '#59b8ff', border: `4px solid ${INK}`, boxSizing: 'border-box', transformOrigin: '50% 0', opacity: 0 })
    return { eye, pupil, lid, arc, ex, brow, tear, s }
  })
  if (glasses) {
    for (const s of [-1, 1]) node(ctx, '', head, { position: 'absolute', left: px(R + s * R * 0.36 - R * 0.36), top: px(eyeY - R * 0.4), width: px(R * 0.72), height: px(R * 0.8), borderRadius: '50%', border: `6px solid ${INK}`, boxSizing: 'border-box' })
    node(ctx, '', head, { position: 'absolute', left: px(R - 8), top: px(eyeY - 4), width: '16px', height: '6px', background: INK })
  }
  const my = R * 1.42
  const M = (css, html) => node(ctx, '', head, { position: 'absolute', opacity: 0, boxSizing: 'border-box', ...css }, html)
  const mouths = {
    smile: M({ left: px(R - 24), top: px(my - 16), width: '48px', height: '26px', borderBottom: `8px solid ${INK}`, borderRadius: '0 0 48px 48px' }),
    grin: M({ left: px(R - 30), top: px(my - 12), width: '60px', height: '34px', background: '#3a0d0d', border: `7px solid ${INK}`, borderRadius: '6px 6px 40px 40px' }),
    frown: M({ left: px(R - 24), top: px(my - 2), width: '48px', height: '26px', borderTop: `8px solid ${INK}`, borderRadius: '48px 48px 0 0' }),
    flat: M({ left: px(R - 22), top: px(my), width: '44px', height: '9px', background: INK, borderRadius: '5px' }),
    tiny: M({ left: px(R - 8), top: px(my), width: '16px', height: '9px', background: INK, borderRadius: '5px' }),
    o: M({ left: px(R - 15), top: px(my - 14), width: '30px', height: '34px', background: '#3a0d0d', border: `6px solid ${INK}`, borderRadius: '50%' }),
    scream: M({ left: px(R - 28), top: px(my - 26), width: '56px', height: '66px', background: '#3a0d0d', border: `7px solid ${INK}`, borderRadius: '45%', overflow: 'hidden' }, '<div style="position:absolute;left:8px;right:8px;bottom:-14px;height:34px;border-radius:50%;background:#ff6b7a"></div>'),
    grit: M({ left: px(R - 30), top: px(my - 12), width: '60px', height: '30px', background: 'repeating-linear-gradient(90deg, #fff 0 10px, #141414 10px 14px)', border: `7px solid ${INK}`, borderRadius: '9px' }),
    smirk: M({ left: px(R - 6), top: px(my - 4), width: '40px', height: '9px', background: INK, borderRadius: '5px', transform: 'rotate(-16deg)' }),
    wavy: M({ left: px(R - 28), top: px(my - 10), width: '56px', height: '24px' }, `<svg viewBox="0 0 56 24" width="56" height="24" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"><path d="M4 14 Q 12 2 20 12 T 36 12 T 52 10"/></svg>`),
  }
  if (skeleton) node(ctx, '', head, { position: 'absolute', left: px(R - 8), top: px(R * 1.12), width: '0', height: '0', borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `16px solid ${INK}` })
  const ch = { root, body, tor, torso, neck, head, skull, eyes, mouths, aL, aR, lL, lR, leg, arm, legLen, scale, skin, R, x, y, mouth: 'smile', skeleton }
  poseNow(ch, STAND)
  ctx.tl.set(mouths.smile, { opacity: 1 }, 0)
  return ch
}

export const STAND = { hip: 0, lean: 0, head: 0, aL: [10, 4], aR: [-10, -4], lL: [3, 0], lR: [-3, 0] }

const rad = (d) => (d * Math.PI) / 180
function targets(ch, p0) {
  const p = { ...p0 }
  if (p.arms) {
    p.aL = p.arms
    p.aR = [-p.arms[0], -p.arms[1]]
  }
  if (p.legs) {
    p.lL = p.legs
    p.lR = [-p.legs[0], -p.legs[1]]
  }
  const t = []
  const rot = (el, v) => v !== undefined && t.push([el, { rotation: v }])
  // keep the feet on the floor: the hip drops as the legs fold, unless told otherwise
  if (p.hip === undefined && p.lL) p.hip = ch.legLen - (ch.leg[0] * Math.cos(rad(p.lL[0])) + ch.leg[1] * Math.cos(rad(p.lL[0] + p.lL[1])))
  if (p.hip !== undefined) t.push([ch.body, { y: -ch.legLen + p.hip }])
  rot(ch.tor, p.lean)
  rot(ch.neck, p.head)
  if (p.aL) (rot(ch.aL.sh, p.aL[0]), rot(ch.aL.el, p.aL[1]))
  if (p.aR) (rot(ch.aR.sh, p.aR[0]), rot(ch.aR.el, p.aR[1]))
  if (p.lL) (rot(ch.lL.th, p.lL[0]), rot(ch.lL.kn, p.lL[1]))
  if (p.lR) (rot(ch.lR.th, p.lR[0]), rot(ch.lR.kn, p.lR[1]))
  return t
}

export function poseNow(ch, p) {
  for (const [el, vars] of targets(ch, p)) gsap.set(el, vars)
}

/** Snap into a pose. Short and punchy by default: limited animation is funnier. */
export function pose(ctx, ch, p, at, dur = 0.12, ease = 'power3.out') {
  for (const [el, vars] of targets(ch, p)) ctx.tl.to(el, { ...vars, duration: dur, ease }, at)
}

/** Stage coordinates of both hands in a pose (so a prop can be put in them). */
export function hands(ctx, ch, p) {
  if (p) poseNow(ch, p)
  const s = ctx.stage.getBoundingClientRect()
  const at = (h) => {
    const r = h.firstChild.getBoundingClientRect()
    return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top }
  }
  const out = { L: at(ch.aL.hand), R: at(ch.aR.hand) }
  if (p) poseNow(ch, STAND)
  return out
}

/* ---------- faces: the acting ---------- */

// eye: open | arc (happy ^ ^) | x.  lid: 0 open … 1 shut.  brow: + angry, - worried.
const FACES = {
  neutral: { eye: 'open', lid: 0, pupil: [0, 0], ps: 1, brow: 0, by: 0, mouth: 'smile', flush: 0 },
  happy: { eye: 'arc', lid: 0, pupil: [0, 0], ps: 1, brow: -4, by: -6, mouth: 'grin', flush: 0 },
  smug: { eye: 'open', lid: 0.45, pupil: [0.4, 0.1], ps: 1, brow: 6, by: 2, mouth: 'smirk', flush: 0 },
  blank: { eye: 'open', lid: 0.4, pupil: [0, 0], ps: 1, brow: 0, by: 4, mouth: 'flat', flush: 0 },
  worry: { eye: 'open', lid: 0, pupil: [0, 0.2], ps: 0.9, brow: -18, by: -4, mouth: 'wavy', flush: 0 },
  shock: { eye: 'open', lid: 0, pupil: [0, 0], ps: 0.45, brow: -8, by: -16, mouth: 'o', flush: 0 },
  panic: { eye: 'open', lid: 0, pupil: [0, 0], ps: 0.4, brow: -14, by: -16, mouth: 'scream', flush: 0 },
  strain: { eye: 'open', lid: 0.55, pupil: [0, 0.1], ps: 0.8, brow: 24, by: 6, mouth: 'grit', flush: 0.85 },
  angry: { eye: 'open', lid: 0.3, pupil: [0, 0], ps: 0.9, brow: 24, by: 6, mouth: 'frown', flush: 0.5 },
  sad: { eye: 'open', lid: 0.2, pupil: [0, 0.4], ps: 1, brow: -20, by: 0, mouth: 'frown', flush: 0 },
  dead: { eye: 'x', lid: 0, pupil: [0, 0], ps: 1, brow: 0, by: 0, mouth: 'flat', flush: 0 },
  side: { eye: 'open', lid: 0.35, pupil: [0.9, 0], ps: 1, brow: 0, by: 2, mouth: 'flat', flush: 0 },
  sideL: { eye: 'open', lid: 0.35, pupil: [-0.9, 0], ps: 1, brow: 0, by: 2, mouth: 'flat', flush: 0 },
  down: { eye: 'open', lid: 0.2, pupil: [0, 0.9], ps: 1, brow: -6, by: 0, mouth: 'tiny', flush: 0 },
  up: { eye: 'open', lid: 0, pupil: [0, -0.9], ps: 1, brow: -6, by: -8, mouth: 'tiny', flush: 0 },
  sleepy: { eye: 'open', lid: 0.75, pupil: [0, 0.3], ps: 1, brow: -6, by: 6, mouth: 'tiny', flush: 0 },
  focus: { eye: 'open', lid: 0.25, pupil: [0, 0], ps: 0.9, brow: 14, by: 4, mouth: 'flat', flush: 0.15 },
  wow: { eye: 'open', lid: 0, pupil: [0, -0.2], ps: 1.25, brow: -8, by: -12, mouth: 'grin', flush: 0.2 },
}

/** Change the whole face at `at` (a hard switch: expressions pop). */
export function face(ctx, ch, name, at, over = {}) {
  const f = { ...FACES[name], ...over }
  const { tl } = ctx
  const R = ch.R
  for (const e of ch.eyes) {
    tl.set(e.eye, { opacity: f.eye === 'open' ? 1 : 0 }, at)
    tl.set(e.arc, { opacity: f.eye === 'arc' ? 1 : 0 }, at)
    tl.set(e.ex, { opacity: f.eye === 'x' ? 1 : 0 }, at)
    tl.set(e.lid, { y: f.lid * R * 0.62 }, at)
    tl.set(e.pupil, { x: f.pupil[0] * R * 0.13, y: f.pupil[1] * R * 0.13, scale: f.ps }, at)
    tl.set(e.brow, { rotation: e.s < 0 ? f.brow : -f.brow, y: f.by }, at)
  }
  for (const k of Object.keys(ch.mouths)) tl.set(ch.mouths[k], { opacity: k === f.mouth ? 1 : 0 }, at)
  if (!ch.skeleton) tl.set(ch.skull, { backgroundColor: f.flush ? mix(ch.skin, '#ff7a6b', f.flush) : ch.skin }, at)
  ch.mouth = f.mouth
}

function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [x, y] = [h(a), h(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/** Blink. */
export function blink(ctx, ch, at) {
  for (const e of ch.eyes) {
    ctx.tl.set(e.lid, { y: ch.R * 0.62 }, at)
    ctx.tl.set(e.lid, { y: 0 }, at + 0.1)
  }
}

/** Tears streaming (for as long as you like). */
export function cry(ctx, ch, at, until) {
  for (const e of ch.eyes) {
    ctx.tl.set(e.tear, { opacity: 1 }, at)
    ctx.tl.fromTo(e.tear, { scaleY: 0.2 }, { scaleY: 1, duration: 0.25, ease: 'power2.out', immediateRender: false }, at)
    if (until !== undefined) ctx.tl.set(e.tear, { opacity: 0 }, until)
  }
}

/** Sweat drops flying off the head. */
export function sweat(ctx, ch, at, n = 3, seed = 1) {
  const r = rng(seed * 13 + 5)
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1
    const d = node(ctx, '', ch.head, { position: 'absolute', left: px(ch.R + s * ch.R * 0.9), top: px(ch.R * 0.3), width: '20px', height: '28px', borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%', background: '#59b8ff', border: `5px solid ${INK}`, boxSizing: 'border-box', opacity: 0 })
    const t0 = at + i * 0.09
    ctx.tl.set(d, { opacity: 1 }, t0)
    ctx.tl.to(d, { x: s * (40 + r() * 50), y: -30 - r() * 40, duration: 0.25, ease: 'power2.out' }, t0)
    ctx.tl.to(d, { y: 40, opacity: 0, duration: 0.25, ease: 'power2.in' }, t0 + 0.25)
  }
}

/**
 * Trembling: jitter an element on every frame from `at` to `until`, around
 * `base` (defaults to where the element is when the scene is built).
 */
export function tremble(ctx, el, at, until, amp = 5, seed = 2, base) {
  const r = rng(seed * 7 + 3)
  const b = base ?? { x: Number(gsap.getProperty(el, 'x')) || 0, y: Number(gsap.getProperty(el, 'y')) || 0 }
  for (let t = at; t < until; t += 1 / 30) ctx.tl.set(el, { x: b.x + (r() - 0.5) * amp * 2, y: b.y + (r() - 0.5) * amp }, t)
  ctx.tl.set(el, { x: b.x, y: b.y }, until)
}

/* ---------- speech ---------- */

/**
 * A speech bubble with gibberish audio and a flapping mouth. `x`,`y` is the
 * bubble's top-left in stage px; `tail` 0…1 is where the tail sits. Returns
 * when the line ends.
 */
export function say(ctx, ch, text, at, { x, y, w = 420, size = 46, tail = 0.5, pitch = 62, hold = 0.5, dur, loud = false, parent, seed = 1 } = {}) {
  const d = dur ?? Math.max(0.35, Math.min(1.4, text.replace(/<[^>]+>/g, '').length * 0.045))
  const b = node(ctx, 't-bubble', parent ?? ctx.stage, { left: px(x), top: px(y), width: px(w), fontSize: px(size) }, text)
  b.style.setProperty('--tail-x', tail * 100 + '%')
  if (loud) b.classList.add('t-bubble--loud')
  if (at > 0) {
    ctx.tl.set(b, { opacity: 0 }, 0)
    ctx.tl.fromTo(b, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'back.out(3)', immediateRender: false }, at)
  }
  ctx.tl.set(b, { opacity: 0 }, at + d + hold)
  if (ch) {
    const closed = ch.mouth
    if (closed !== 'o') {
      const n = Math.round(d / 0.085)
      for (let k = 0; k < n; k++) {
        const open = k % 2 === 0
        ctx.tl.set(ch.mouths[closed], { opacity: open ? 0 : 1 }, at + k * 0.085)
        ctx.tl.set(ch.mouths.o, { opacity: open ? 1 : 0 }, at + k * 0.085)
      }
      ctx.tl.set(ch.mouths.o, { opacity: 0 }, at + d)
      ctx.tl.set(ch.mouths[closed], { opacity: 1 }, at + d)
    }
  }
  ctx.sfx(at, loud ? 'scream' : 'blab', loud ? { dur: d, pitch: pitch + 10, gain: 0.9 } : { dur: d, pitch, seed, gain: 0.9 })
  return at + d
}

/* ---------- props ---------- */

/** A crude box with a marker outline. */
export function box(ctx, parent, { x, y, w, h, fill = '#fff', r = 16, border = 8, z } = {}) {
  return node(ctx, '', parent, { position: 'absolute', left: px(x), top: px(y), width: px(w), height: px(h), background: fill, border: `${border}px solid ${INK}`, borderRadius: px(r), boxSizing: 'border-box', zIndex: z ?? 'auto' })
}

/** A barbell seen from the front. Origin = the middle of the bar. `plates` = [[height, colour], …] from the inside out. */
export function barbell(ctx, parent, { w = 620, plates = [[170, '#e0263a']], x = 0, y = 0 } = {}) {
  const g = node(ctx, '', parent, { position: 'absolute', left: '0', top: '0', width: '0', height: '0' })
  gsap.set(g, { x, y })
  node(ctx, '', g, { position: 'absolute', left: px(-w / 2), top: '-8px', width: px(w), height: '16px', background: '#9aa3ad', border: `6px solid ${INK}`, borderRadius: '8px', boxSizing: 'border-box' })
  for (const s of [-1, 1]) {
    let off = w / 2 - 110
    for (const [h, c] of plates) {
      node(ctx, '', g, { position: 'absolute', left: px(s < 0 ? -off - 34 : off), top: px(-h / 2), width: '34px', height: px(h), background: c, border: `8px solid ${INK}`, borderRadius: '10px', boxSizing: 'border-box' })
      off += 34
    }
  }
  return g
}

/** A dumbbell seen from the front. */
export function dumbbell(ctx, parent, { w = 90, h = 46, color = '#3b4350' } = {}) {
  const g = node(ctx, '', parent, { position: 'absolute', left: '0', top: '0', width: '0', height: '0' })
  node(ctx, '', g, { position: 'absolute', left: px(-w / 2), top: '-6px', width: px(w), height: '12px', background: INK })
  for (const s of [-1, 1]) node(ctx, '', g, { position: 'absolute', left: px(s < 0 ? -w / 2 - 10 : w / 2 - 16), top: px(-h / 2), width: '26px', height: px(h), background: color, border: `7px solid ${INK}`, borderRadius: '8px', boxSizing: 'border-box' })
  return g
}

/**
 * The running easter egg: a plate with eyes, leaning somewhere in every
 * scene, that reacts to the punchline. (A recurring character, not a logo.)
 */
export function egg(ctx, parent, { x, y, r = 62, tilt = -10 } = {}) {
  const g = node(ctx, '', parent, { position: 'absolute', left: px(x - r), top: px(y - r), width: px(2 * r), height: px(2 * r), borderRadius: '50%', background: '#e0263a', border: `8px solid ${INK}`, boxSizing: 'border-box' })
  gsap.set(g, { rotation: tilt })
  node(ctx, '', g, { position: 'absolute', left: px(r - 8 - 9), top: px(r + 4), width: '18px', height: '18px', borderRadius: '50%', background: INK })
  const pupils = [-1, 1].map((s) => {
    const e = node(ctx, '', g, { position: 'absolute', left: px(r - 8 + s * r * 0.36 - 15), top: px(r * 0.5), width: '30px', height: '34px', borderRadius: '50%', background: '#fff', border: `5px solid ${INK}`, boxSizing: 'border-box' })
    return node(ctx, '', e, { position: 'absolute', left: '6px', top: '8px', width: '9px', height: '9px', borderRadius: '50%', background: INK })
  })
  return {
    el: g,
    look(dx, dy, at) {
      for (const p of pupils) ctx.tl.set(p, { x: dx * 6, y: dy * 6 }, at)
    },
    hop(at) {
      ctx.tl.to(g, { y: -24, duration: 0.1, ease: 'power2.out' }, at)
      ctx.tl.to(g, { y: 0, duration: 0.14, ease: 'bounce.out' }, at + 0.1)
    },
  }
}

/** Comic impact: a few short lines bursting from a point. */
export function pow(ctx, parent, at, { x, y, r = 120, n = 8, color = INK, w = 10 } = {}) {
  for (let i = 0; i < n; i++) {
    const ray = node(ctx, '', parent, { position: 'absolute', left: px(x - w / 2), top: px(y), width: px(w), height: px(r * 0.4), background: color, borderRadius: px(w), transformOrigin: `${w / 2}px 0`, opacity: 0, zIndex: 30 })
    gsap.set(ray, { rotation: (i / n) * 360 })
    ctx.tl.set(ray, { opacity: 1, y: r * 0.5 }, at)
    ctx.tl.to(ray, { y: r, duration: 0.18, ease: 'power2.out' }, at)
    ctx.tl.set(ray, { opacity: 0 }, at + 0.2)
  }
}

/** A snap zoom of the whole scene onto a point (the beat on a face). */
export function zoom(ctx, scene, at, { x = 540, y = 800, scale = 1.6, dur = 0.12 } = {}) {
  ctx.tl.to(scene, { scale, x: (540 - x) * scale, y: (1000 - y) * scale, duration: dur, ease: 'power4.out' }, at)
}
export function unzoom(ctx, scene, at, dur = 0.12) {
  ctx.tl.to(scene, { scale: 1, x: 0, y: 0, duration: dur, ease: 'power3.out' }, at)
}

/** Text drawn into the scene (signs, labels, onomatopoeia). */
export function ink(ctx, parent, html, { x, y, size = 60, color = INK, rotate = 0, font = 't-marker', w, align = 'left' } = {}) {
  const e = node(ctx, font, parent, { left: px(x), top: px(y), fontSize: px(size), color, width: w ? px(w) : 'auto', textAlign: align, whiteSpace: w ? 'normal' : 'nowrap' }, html)
  if (rotate) gsap.set(e, { rotation: rotate })
  return e
}

/** Show an element only between two times. */
export function during(ctx, el, from, to) {
  if (from > 0) ctx.tl.set(el, { opacity: 0 }, 0)
  ctx.tl.set(el, { opacity: 1 }, from)
  if (to !== undefined) ctx.tl.set(el, { opacity: 0 }, to)
  return el
}

/* ---------- moving about ---------- */

/** A front-view waddle from `at` to `until` (thighs swing, the body bobs). */
export function walk(ctx, ch, at, until, { step = 0.16, swing = 20, sound = null, gain = 0.4 } = {}) {
  let k = 0
  for (let t = at; t < until - 1e-6; t += step, k++) {
    const a = k % 2 ? swing : -swing
    ctx.tl.to(ch.lL.th, { rotation: a, duration: step, ease: 'sine.inOut' }, t)
    ctx.tl.to(ch.lR.th, { rotation: a, duration: step, ease: 'sine.inOut' }, t)
    ctx.tl.to(ch.body, { y: -ch.legLen - (k % 2 ? 0 : 8), duration: step, ease: 'sine.inOut' }, t)
    if (sound) ctx.sfx(t, sound, { gain })
  }
  ctx.tl.to(ch.lL.th, { rotation: 3, duration: 0.08 }, until)
  ctx.tl.to(ch.lR.th, { rotation: -3, duration: 0.08 }, until)
  ctx.tl.to(ch.body, { y: -ch.legLen, duration: 0.08 }, until)
}

/** Slide a character to stage x. */
export function moveX(ctx, ch, x, at, dur, ease = 'none') {
  ctx.tl.to(ch.root, { x: x - ch.x, duration: dur, ease }, at)
}

/**
 * A character built around its middle, so it can tumble: returns { piv, ch }.
 * Rotate/move `piv`; (x, y) is where the feet stand when upright.
 */
export function tumbler(ctx, parent, o) {
  const scale = o.scale ?? 1.6
  const legLen = (o.leg ?? [70, 66]).reduce((a, b) => a + b, 0)
  const half = ((legLen + (o.torsoH ?? 140) + (o.headR ?? 70) * 2) * scale) / 2
  const piv = node(ctx, 'rig', parent, { left: px(o.x), top: px(o.y - half) })
  const ch = person(ctx, piv, { ...o, x: 0, y: half })
  ch.x = o.x
  return { piv, ch, half }
}
