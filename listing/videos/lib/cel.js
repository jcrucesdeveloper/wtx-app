// A small cel-animation engine for the comedy reels (batch E onwards).
// Craft and reasoning: listing/research/13-animation-craft-colour-and-motion.md
//
// Characters are SVG, redrawn on every frame from a handful of numbers
// (`ch.s`) that the GSAP timeline animates. What the engine adds on top:
//
//   arcs            arms and legs are rubber-hose curves solved by inverse
//                   kinematics to hand/foot targets: animate the hand, the
//                   elbow follows
//   follow-through  headband tails, pony tails and hair tufts are springs
//   squash/stretch  the body squashes on its own vertical acceleration,
//                   volume preserved; the head lags the body (overlap)
//   moving holds    everyone breathes and blinks; nothing is ever frozen
//   on twos         character drawings are held two frames (12 a second)
//                   while the camera stays on ones
//   smears          fast hands leave multiples for a frame or two
//   acting          `act` puts anticipation and overshoot into a move
//
// The springs are simulated once, before rendering (ctx.prepass), so a frame
// is still a pure function of its number and every render is identical.

/* global gsap */

const NS = 'http://www.w3.org/2000/svg'
const E = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  if (parent) parent.appendChild(e)
  return e
}
const set = (e, attrs) => {
  for (const k in attrs) e.setAttribute(k, attrs[k])
}
const rad = (d) => (d * Math.PI) / 180
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const f1 = (n) => Math.round(n * 10) / 10

/** One palette for the whole series: ink is deep navy, never black. */
export const PAL = {
  ink: '#1b1830',
  paper: '#fff6e5',
  white: '#ffffff',
  coral: '#ff4d5a',
  coralD: '#d42f45',
  yellow: '#ffc233',
  yellowD: '#e59a10',
  teal: '#22b8a7',
  tealD: '#12877f',
  violet: '#6c63d9',
  violetD: '#4a43ad',
  lav: '#c9c4ff',
  navy: '#27307a',
  navyD: '#171c4a',
  pink: '#ff9fb2',
  green: '#3fbf7f',
  greenD: '#2a9460',
  sky: '#59b8ff',
  wood: '#d98e4a',
  woodD: '#a8642c',
  grey: '#c3c9dc',
  greyD: '#8088a6',
  steel: '#aeb6cc',
  skinA: '#ffd9b5',
  skinB: '#eeb27f',
  skinC: '#bb7a4f',
}

/** Rooms: a cool, lower-saturation ground so the warm cast pops (60-30-10). */
export const ROOMS = {
  mint: { wall: '#a8e0d1', band: '#86cfbe', floor: '#f7dba8', floorD: '#ecc98c', light: '#d6f5ea' },
  lilac: { wall: '#cdc8f7', band: '#b0a9ee', floor: '#f7dba8', floorD: '#ecc98c', light: '#e9e6ff' },
  sky: { wall: '#b3dcf6', band: '#90c8ec', floor: '#f7dba8', floorD: '#ecc98c', light: '#def1ff' },
  butter: { wall: '#ffe9a6', band: '#ffd978', floor: '#cfc7f5', floorD: '#b9b0ea', light: '#fff6d4' },
  night: { wall: '#313a86', band: '#272f72', floor: '#454f9c', floorD: '#394289', light: '#4a55a8' },
}

export function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [x, y] = [h(a), h(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
const shade = (c, t = 0.22) => mix(c, '#1b1830', t)

function rng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A rubber-hose limb from a to b of rest length L, bowing to one side. */
function hose(a, b, L, side) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 0.001
  if (d >= L * 0.99) return `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`
  const sag = Math.sqrt((3 * d * (L - d)) / 8) * side
  const cx = (a.x + b.x) / 2 + (-dy / d) * 2 * sag
  const cy = (a.y + b.y) / 2 + (dx / d) * 2 * sag
  return `M${f1(a.x)} ${f1(a.y)}Q${f1(cx)} ${f1(cy)} ${f1(b.x)} ${f1(b.y)}`
}

const FACES = {
  neutral: { lid: 0, bl: 0, br: 0, bry: 0, ps: 1, mw: 44, mo: 0, mc: 12, teeth: 0, flush: 0, joy: 0, xe: 0 },
  happy: { lid: 0, bl: -4, br: -4, bry: -6, ps: 1, mw: 62, mo: 20, mc: 18, teeth: 0, flush: 0.15, joy: 1, xe: 0 },
  smug: { lid: 0.45, bl: -8, br: 10, bry: 0, ps: 1, mw: 34, mo: 0, mc: 10, teeth: 0, flush: 0, joy: 0, xe: 0 },
  blank: { lid: 0.4, bl: 0, br: 0, bry: 4, ps: 1, mw: 32, mo: 0, mc: 0, teeth: 0, flush: 0, joy: 0, xe: 0 },
  worry: { lid: 0, bl: -18, br: -18, bry: -6, ps: 0.9, mw: 30, mo: 0, mc: -9, teeth: 0, flush: 0, joy: 0, xe: 0 },
  shock: { lid: 0, bl: -6, br: -6, bry: -16, ps: 0.55, mw: 26, mo: 18, mc: 0, teeth: 0, flush: 0, joy: 0, xe: 0 },
  panic: { lid: 0, bl: -16, br: -16, bry: -18, ps: 0.42, mw: 52, mo: 32, mc: 4, teeth: 0, flush: 0, joy: 0, xe: 0 },
  strain: { lid: 0.5, bl: 22, br: 22, bry: 6, ps: 0.8, mw: 56, mo: 13, mc: 0, teeth: 2, flush: 0.85, joy: 0, xe: 0 },
  angry: { lid: 0.3, bl: 24, br: 24, bry: 6, ps: 0.9, mw: 40, mo: 0, mc: -11, teeth: 0, flush: 0.45, joy: 0, xe: 0 },
  sad: { lid: 0.25, bl: -20, br: -20, bry: -2, ps: 1, mw: 34, mo: 0, mc: -13, teeth: 0, flush: 0, joy: 0, xe: 0 },
  dead: { lid: 0, bl: 0, br: 0, bry: 0, ps: 1, mw: 30, mo: 0, mc: -3, teeth: 0, flush: 0, joy: 0, xe: 1 },
  sleepy: { lid: 0.78, bl: -6, br: -6, bry: 6, ps: 1, mw: 20, mo: 5, mc: 0, teeth: 0, flush: 0, joy: 0, xe: 0 },
  focus: { lid: 0.22, bl: 14, br: 14, bry: 4, ps: 0.9, mw: 28, mo: 0, mc: 0, teeth: 0, flush: 0.1, joy: 0, xe: 0 },
  wow: { lid: 0, bl: -8, br: -8, bry: -12, ps: 1.2, mw: 58, mo: 24, mc: 16, teeth: 0, flush: 0.25, joy: 0, xe: 0 },
  grit: { lid: 0.3, bl: 16, br: 16, bry: 2, ps: 0.5, mw: 58, mo: 14, mc: 0, teeth: 2, flush: 0.2, joy: 0, xe: 0 },
}

const REST = { hLx: -84, hLy: 18, hRx: 84, hRy: 18, fLx: -38, fLy: 0, fRx: 38, fRy: 0, by: 0, lean: 0 }

export function cel(ctx, { room = 'mint', floorY = 1400, twos = true, window: win = true } = {}) {
  const { tl, fps } = ctx
  const frames = Math.round(ctx.duration * fps)
  const R = typeof room === 'string' ? ROOMS[room] : room

  /* ---------- scaffold ---------- */
  const world = document.createElement('div')
  Object.assign(world.style, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', transformOrigin: '540px 1000px' })
  ctx.stage.appendChild(world)
  const svg = E('svg', { viewBox: '0 0 1080 1920', width: 1080, height: 1920 }, world)
  svg.style.position = 'absolute'
  svg.style.overflow = 'visible'
  const defs = E('defs', {}, svg)
  // a pen line that boils on twos
  const boil = E('filter', { id: 'celBoil', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs)
  const turb = E('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: 2, seed: 1, result: 'n' }, boil)
  E('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 3.2 }, boil)
  // halftone for light and corners
  const dots = E('pattern', { id: 'celDots', width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(24)' }, defs)
  E('circle', { cx: 9, cy: 9, r: 3.2, fill: '#fff' }, dots)

  const L = {}
  for (const k of ['bg', 'back', 'shadow', 'mid', 'chars', 'fx', 'front']) L[k] = E('g', {}, svg)
  L.chars.setAttribute('filter', 'url(#celBoil)')
  L.mid.setAttribute('filter', 'url(#celBoil)')

  /* ---------- the room ---------- */
  const wallG = E('linearGradient', { id: 'celWall', x1: 0, y1: 0, x2: 0, y2: 1 }, defs)
  E('stop', { offset: 0, 'stop-color': mix(R.wall, '#ffffff', 0.18) }, wallG)
  E('stop', { offset: 1, 'stop-color': R.wall }, wallG)
  E('rect', { x: -300, y: -300, width: 1680, height: floorY + 300, fill: 'url(#celWall)' }, L.bg)
  E('rect', { x: -300, y: floorY - 250, width: 1680, height: 250, fill: R.band }, L.bg)
  E('rect', { x: -300, y: floorY - 258, width: 1680, height: 10, fill: mix(R.band, PAL.ink, 0.18) }, L.bg)
  E('rect', { x: -300, y: floorY, width: 1680, height: 900, fill: R.floor }, L.bg)
  E('rect', { x: -300, y: floorY, width: 1680, height: 12, fill: R.floorD }, L.bg)
  if (win) {
    // a window's light across the wall and floor
    E('path', { d: `M560 ${floorY - 900} L940 ${floorY - 900} L1180 ${floorY} L800 ${floorY} Z`, fill: R.light, opacity: 0.55 }, L.bg)
    E('path', { d: `M800 ${floorY} L1180 ${floorY} L1380 ${floorY + 520} L880 ${floorY + 520} Z`, fill: '#ffffff', opacity: 0.22 }, L.bg)
  }
  E('rect', { x: -300, y: -300, width: 1680, height: 900, fill: 'url(#celDots)', opacity: 0.1 }, L.bg)
  E('rect', { x: -300, y: floorY - 12, width: 1680, height: 9, fill: PAL.ink, rx: 4 }, L.bg)

  /* ---------- registries ---------- */
  const chars = []
  const sprites = []
  const effects = []
  let fxSeed = 1

  /* ---------- characters ---------- */
  function person(o = {}) {
    const c = {
      skin: PAL.skinA, shirt: PAL.coral, shorts: PAL.navy, shoe: PAL.ink, hair: 'band', hairCol: '#6b3f2a', glasses: false,
      hr: 92, bw: 140, bh: 150, armW: 26, legW: 28, armL: 150, legL: 106, hipH: 116, blink: true, seed: chars.length * 7 + 3,
      ...o,
    }
    const s = {
      x: o.x ?? 540, y: o.y ?? floorY, jy: 0, sc: o.sc ?? 1.6, rot: 0, a: 1,
      sqx: 1, sqy: 1, ht: 0, hx: 0, hy: 0, lx: 0, ly: 0, eL: 1, eR: 1, wL: 0, wR: 0, tears: 0, breath: 1, stretch: 0,
      ...REST, ...FACES.neutral,
    }
    const g = E('g', {}, L.chars)
    const tailG = E('g', {}, g)
    const body = E('g', {}, g)
    const id = 'c' + chars.length
    const lw = 12 // outline
    const limb = (w, col) => {
      const o1 = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': w + lw, 'stroke-linecap': 'round' }, body)
      const o2 = E('path', { fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, body)
      return [o1, o2]
    }
    const legLp = limb(c.legW, c.skin)
    const legRp = limb(c.legW, c.skin)
    const shoe = () => E('path', { fill: c.shoe, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, body)
    const shoeL = shoe()
    const shoeR = shoe()
    // torso
    const torso = E('g', {}, body)
    const clip = E('clipPath', { id: id + 'b' }, defs)
    const rx = c.bw * 0.44
    const bodyRect = { x: -c.bw / 2, y: -c.bh, width: c.bw, height: c.bh + 12, rx }
    E('rect', bodyRect, clip)
    E('rect', { ...bodyRect, fill: c.shirt }, torso)
    const inner = E('g', { 'clip-path': `url(#${id}b)` }, torso)
    E('ellipse', { cx: c.bw * 0.42, cy: -c.bh * 0.4, rx: c.bw * 0.42, ry: c.bh * 0.75, fill: shade(c.shirt, 0.16) }, inner)
    E('rect', { x: -c.bw / 2, y: -34, width: c.bw, height: 60, fill: c.shorts }, inner)
    E('rect', { x: -c.bw / 2, y: -40, width: c.bw, height: 8, fill: shade(c.shorts, 0.3) }, inner)
    E('rect', { ...bodyRect, fill: 'none', stroke: PAL.ink, 'stroke-width': 9 }, torso)
    // head
    const head = E('g', {}, g)
    const hclip = E('clipPath', { id: id + 'h' }, defs)
    E('circle', { r: c.hr }, hclip)
    for (const sx of [-1, 1]) E('circle', { cx: sx * c.hr * 0.96, cy: c.hr * 0.12, r: c.hr * 0.2, fill: c.skin, stroke: PAL.ink, 'stroke-width': 8 }, head)
    const skull = E('circle', { r: c.hr, fill: c.skin }, head)
    const hin = E('g', { 'clip-path': `url(#${id}h)` }, head)
    E('ellipse', { cx: c.hr * 0.62, cy: c.hr * 0.3, rx: c.hr * 0.7, ry: c.hr * 1.1, fill: PAL.ink, opacity: 0.1 }, hin)
    const cheeks = [-1, 1].map((sx) => E('ellipse', { cx: sx * c.hr * 0.58, cy: c.hr * 0.38, rx: c.hr * 0.2, ry: c.hr * 0.13, fill: PAL.pink }, hin))
    // hair
    const hr = c.hr
    let tuft = null
    const tails = []
    if (c.hair === 'band') {
      E('rect', { x: -hr, y: -hr * 1.2, width: hr * 2, height: hr * 0.7, fill: c.hairCol }, hin)
      E('rect', { x: -hr, y: -hr * 0.6, width: hr * 2, height: hr * 0.3, fill: PAL.coral }, hin)
      E('rect', { x: -hr, y: -hr * 0.6, width: hr * 2, height: 7, fill: PAL.ink, opacity: 0.25 }, hin)
      E('path', { d: `M${-hr} ${-hr * 0.6} H${hr} M${-hr} ${-hr * 0.3} H${hr}`, stroke: PAL.ink, 'stroke-width': 7 }, hin)
      tuft = E('path', { fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, head)
      for (let i = 0; i < 2; i++) tails.push({ col: PAL.coral, w: 16, len: 40 + i * 10, anchor: [hr * 0.94, -hr * 0.42], bias: i ? 0.5 : -0.3 })
    } else if (c.hair === 'flat') {
      E('path', { d: `M${-hr} ${-hr * 0.18} Q${-hr * 0.2} ${-hr * 0.62} ${hr} ${-hr * 0.3} V${-hr * 1.2} H${-hr} Z`, fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 7 }, hin)
      tuft = E('path', { fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, head)
    } else if (c.hair === 'pony') {
      E('path', { d: `M${-hr} ${-hr * 0.1} Q${-hr * 0.3} ${-hr * 0.7} ${hr} ${-hr * 0.2} V${-hr * 1.2} H${-hr} Z`, fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 7 }, hin)
      tails.push({ col: c.hairCol, w: 40, len: 74, anchor: [hr * 0.86, -hr * 0.5], bias: 0.2, thick: true })
    } else if (c.hair === 'bun') {
      E('circle', { cx: 0, cy: -hr * 1.08, r: hr * 0.34, fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 8 }, head).setAttribute('data-bun', 1)
      head.insertBefore(head.lastChild, skull)
      E('path', { d: `M${-hr} ${-hr * 0.05} Q0 ${-hr * 0.7} ${hr} ${-hr * 0.05} V${-hr * 1.2} H${-hr} Z`, fill: c.hairCol, stroke: PAL.ink, 'stroke-width': 7 }, hin)
    } else if (c.hair === 'cap') {
      E('path', { d: `M${-hr} ${-hr * 0.22} H${hr} V${-hr * 1.2} H${-hr} Z`, fill: c.hatCol ?? PAL.violet, stroke: PAL.ink, 'stroke-width': 7 }, hin)
      E('path', { d: `M${-hr * 0.5} ${-hr * 0.22} H${-hr * 1.5} Q${-hr * 1.62} ${-hr * 0.22} ${-hr * 1.62} ${-hr * 0.36} Q${-hr * 1.62} ${-hr * 0.5} ${-hr * 1.5} ${-hr * 0.5} H${-hr * 0.5} Z`, fill: shade(c.hatCol ?? PAL.violet, 0.15), stroke: PAL.ink, 'stroke-width': 8, 'stroke-linejoin': 'round' }, head)
    }
    E('circle', { r: c.hr, fill: 'none', stroke: PAL.ink, 'stroke-width': 9 }, head)
    // face
    const eyes = [-1, 1].map((sx) => {
      const ex = sx * hr * 0.29
      const ey = hr * 0.08
      const ec = E('clipPath', { id: id + 'e' + (sx < 0 ? 'l' : 'r') }, defs)
      E('ellipse', { cx: ex, cy: ey, rx: hr * 0.2, ry: hr * 0.3 }, ec)
      const white = E('g', {}, head)
      E('ellipse', { cx: ex, cy: ey, rx: hr * 0.2, ry: hr * 0.3, fill: '#fff' }, white)
      const eg = E('g', { 'clip-path': `url(#${id}e${sx < 0 ? 'l' : 'r'})` }, white)
      const pupil = E('circle', { fill: PAL.ink }, eg)
      const glint = E('circle', { fill: '#fff' }, eg)
      const lid = E('path', { fill: shade(c.skin, 0.1), stroke: PAL.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, eg)
      E('ellipse', { cx: ex, cy: ey, rx: hr * 0.2, ry: hr * 0.3, fill: 'none', stroke: PAL.ink, 'stroke-width': 7 }, white)
      const arc = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': 9, 'stroke-linecap': 'round' }, head)
      const ex1 = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': 10, 'stroke-linecap': 'round' }, head)
      const brow = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': 11, 'stroke-linecap': 'round' }, head)
      const tear = E('path', { fill: '#8fd6ff', stroke: PAL.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, head)
      return { sx, ex, ey, white, pupil, glint, lid, arc, ex1, brow, tear }
    })
    if (c.glasses) {
      for (const sx of [-1, 1]) E('circle', { cx: sx * hr * 0.3, cy: hr * 0.08, r: hr * 0.36, fill: 'rgba(255,255,255,0.18)', stroke: PAL.ink, 'stroke-width': 8 }, head)
      E('path', { d: `M${-hr * 0.06} ${hr * 0.06} H${hr * 0.06}`, stroke: PAL.ink, 'stroke-width': 8 }, head)
    }
    const mclip = E('clipPath', { id: id + 'm' }, defs)
    const mclipP = E('path', {}, mclip)
    const mouthFill = E('path', { fill: '#5a1026' }, head)
    const mouthIn = E('g', { 'clip-path': `url(#${id}m)` }, head)
    const tongue = E('ellipse', { fill: '#ff6f8b' }, mouthIn)
    const teethR = E('rect', { fill: '#fff' }, mouthIn)
    const teethL = E('path', { stroke: PAL.ink, 'stroke-width': 4, fill: 'none' }, mouthIn)
    const mouth = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, head)
    // arms on top
    const armLp = limb(c.armW, c.sleeve ?? c.skin)
    const armRp = limb(c.armW, c.sleeve ?? c.skin)
    for (const p of [...armLp, ...armRp]) g.appendChild(p)
    const hand = () => E('circle', { r: c.armW * 0.9, fill: '#fff', stroke: PAL.ink, 'stroke-width': 7 }, g)
    const ghostsL = [hand(), hand()]
    const ghostsR = [hand(), hand()]
    const handL = hand()
    const handR = hand()
    for (const t of tails) {
      t.o = E('path', { fill: 'none', stroke: PAL.ink, 'stroke-width': t.w + 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tailG)
      t.i = E('path', { fill: 'none', stroke: t.col, 'stroke-width': t.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tailG)
    }
    const shadow = E('ellipse', { fill: PAL.ink }, L.shadow)

    const ch = { c, s, g, body, head, held: [], sim: null, mouthBase: { ...FACES.neutral }, phase: (c.seed * 0.37) % 6.28 }

    /** Local geometry for the state as it is right now, with secondary motion `m`. */
    ch.geo = (m = { q: 0, hb: 0, br: 0 }) => {
      const hip = { x: 0, y: -c.hipH + s.by }
      const sqy = s.sqy * (1 - m.q + m.br)
      const sqx = s.sqx * (1 + m.q * 0.8 - m.br * 0.6)
      const ca = Math.cos(rad(s.lean))
      const sa = Math.sin(rad(s.lean))
      const B = (lx, ly) => ({ x: hip.x + lx * sqx * ca - ly * sqy * sa, y: hip.y + lx * sqx * sa + ly * sqy * ca })
      const shL = B(-c.bw * 0.4, -c.bh * 0.8)
      const shR = B(c.bw * 0.4, -c.bh * 0.8)
      const neck = B(0, -c.bh + 10)
      const headC = { x: neck.x + s.hx, y: neck.y - c.hr * 0.78 + s.hy + m.hb }
      const hL = s.wL > 0.5 ? ch.toLocal({ x: s.hLx, y: s.hLy }) : { x: hip.x + s.hLx, y: hip.y + s.hLy }
      const hR = s.wR > 0.5 ? ch.toLocal({ x: s.hRx, y: s.hRy }) : { x: hip.x + s.hRx, y: hip.y + s.hRy }
      return { hip, sqx, sqy, shL, shR, neck, headC, hL, hR, hipL: B(-c.bw * 0.2, -4), hipR: B(c.bw * 0.2, -4), fL: { x: s.fLx, y: s.fLy }, fR: { x: s.fRx, y: s.fRy } }
    }
    const CY = -c.hipH - c.bh * 0.5 // the body's centre, for tumbling
    ch.toWorld = (p) => {
      const a = rad(s.rot)
      const dx = p.x
      const dy = p.y - CY
      return { x: s.x + (dx * Math.cos(a) - dy * Math.sin(a)) * s.sc, y: s.y - s.jy + (CY + dx * Math.sin(a) + dy * Math.cos(a)) * s.sc }
    }
    ch.toLocal = (w) => {
      const a = rad(-s.rot)
      const dx = (w.x - s.x) / s.sc
      const dy = (w.y - (s.y - s.jy)) / s.sc - CY
      return { x: dx * Math.cos(a) - dy * Math.sin(a), y: CY + dx * Math.sin(a) + dy * Math.cos(a) }
    }
    /** World position of a hand ('L' | 'R') right now. */
    ch.handAt = (side, m) => {
      const G = ch.geo(m)
      return ch.toWorld(side === 'L' ? G.hL : G.hR)
    }
    ch.headAt = (m) => ch.toWorld(ch.geo(m).headC)

    ch.draw = (f) => {
      const sim = ch.sim
      const m = sim ? { q: sim.q[f], hb: sim.hb[f], br: Math.sin((f / fps) * 2.9 + ch.phase) * 0.014 * s.breath } : { q: 0, hb: 0, br: 0 }
      const G = ch.geo(m)
      g.style.display = s.a < 0.02 ? 'none' : ''
      shadow.style.display = s.a < 0.02 ? 'none' : ''
      g.setAttribute('opacity', f1(s.a))
      // stretch along the direction of travel (flying, falling)
      let st = ''
      if (sim && f > 1) {
        const vx = sim.rx[f] - sim.rx[f - 2]
        const vy = sim.ry[f] - sim.ry[f - 2]
        const sp = Math.hypot(vx, vy)
        const k = clamp((sp - 70) / 500, 0, 0.3) + s.stretch
        if (k > 0.01) {
          const a = (Math.atan2(vy, vx) * 180) / Math.PI
          st = ` rotate(${f1(a)} 0 ${f1(CY)}) scale(${f1(1 + k)} ${f1(1 / (1 + k))}) rotate(${f1(-a)} 0 ${f1(CY)})`
        }
      }
      g.setAttribute('transform', `translate(${f1(s.x)} ${f1(s.y - s.jy)}) scale(${s.sc}) rotate(${f1(s.rot)} 0 ${f1(CY)})${st}`)
      const k = 1 / (1 + s.jy / 260)
      set(shadow, { cx: f1(s.x), cy: f1(s.y + 4), rx: f1(c.bw * 0.72 * s.sc * k), ry: f1(20 * s.sc * k), opacity: f1(0.2 * k * s.a) })
      // legs and shoes
      const aL = { x: G.fL.x, y: G.fL.y - 20 }
      const aR = { x: G.fR.x, y: G.fR.y - 20 }
      const dL = hose(G.hipL, aL, c.legL, 1)
      const dR = hose(G.hipR, aR, c.legL, -1)
      for (const p of legLp) p.setAttribute('d', dL)
      for (const p of legRp) p.setAttribute('d', dR)
      const shoeD = (p, sx) => `M${f1(p.x - 22)} ${f1(p.y)} Q${f1(p.x - 26)} ${f1(p.y - 30)} ${f1(p.x)} ${f1(p.y - 30)} Q${f1(p.x + sx * 44)} ${f1(p.y - 30)} ${f1(p.x + sx * 46)} ${f1(p.y - 8)} Q${f1(p.x + sx * 46)} ${f1(p.y)} ${f1(p.x + sx * 34)} ${f1(p.y)} Z`
      shoeL.setAttribute('d', shoeD(G.fL, -1))
      shoeR.setAttribute('d', shoeD(G.fR, 1))
      // torso
      torso.setAttribute('transform', `translate(${f1(G.hip.x)} ${f1(G.hip.y)}) rotate(${f1(s.lean)}) scale(${f1(G.sqx * 100) / 100} ${f1(G.sqy * 100) / 100})`)
      // arms
      const side = (sh, h, sx) => clamp((h.y - sh.y) / 50, -1, 1) * sx
      const dAL = hose(G.shL, G.hL, c.armL, side(G.shL, G.hL, 1) * s.eL)
      const dAR = hose(G.shR, G.hR, c.armL, side(G.shR, G.hR, -1) * s.eR)
      for (const p of armLp) p.setAttribute('d', dAL)
      for (const p of armRp) p.setAttribute('d', dAR)
      set(handL, { cx: f1(G.hL.x), cy: f1(G.hL.y) })
      set(handR, { cx: f1(G.hR.x), cy: f1(G.hR.y) })
      // smears: multiples trailing a fast hand
      for (const [gh, key, cur] of [[ghostsL, 'hl', G.hL], [ghostsR, 'hr', G.hR]]) {
        let show = false
        if (sim && f > 1) {
          const px = sim[key + 'x'][f - 2]
          const py = sim[key + 'y'][f - 2]
          const cw = ch.toWorld(cur)
          const d = Math.hypot(cw.x - px, cw.y - py)
          if (d > 120) {
            show = true
            const prev = ch.toLocal({ x: px, y: py })
            gh.forEach((e, i) => {
              const t = (i + 1) / 3
              set(e, { cx: f1(lerp(cur.x, prev.x, t)), cy: f1(lerp(cur.y, prev.y, t)), opacity: 0.55 - i * 0.22 })
            })
          }
        }
        for (const e of gh) e.style.display = show ? '' : 'none'
      }
      // head
      head.setAttribute('transform', `translate(${f1(G.headC.x)} ${f1(G.headC.y)}) rotate(${f1(s.ht + s.lean * 0.4)})`)
      skull.setAttribute('fill', s.flush > 0.01 ? mix(c.skin, '#ff6b6b', s.flush * 0.75) : c.skin)
      for (const e of cheeks) e.setAttribute('opacity', f1(0.45 + s.flush * 0.4))
      if (tuft) {
        const w = (sim ? sim.tf[f] : 0) * 0.6
        const x0 = c.hair === 'flat' ? hr * 0.1 : -hr * 0.1
        tuft.setAttribute('d', `M${f1(x0 - 24)} ${f1(-hr * 0.95)} C${f1(x0 - 34 + w)} ${f1(-hr * 1.22)} ${f1(x0 - 6 + w * 1.5)} ${f1(-hr * 1.36)} ${f1(x0 + 20 + w * 1.6)} ${f1(-hr * 1.26)} C${f1(x0 + 8 + w)} ${f1(-hr * 1.2)} ${f1(x0 + 22 + w * 0.5)} ${f1(-hr * 1.08)} ${f1(x0 + 28)} ${f1(-hr * 0.93)} Z`)
      }
      const blinkNow = c.blink && s.xe < 0.5 && s.joy < 0.5 ? blinkAt(f, ch) : 0
      const lidV = clamp(Math.max(s.lid, blinkNow), 0, 1)
      for (const e of eyes) {
        const { sx, ex, ey } = e
        const rx = hr * 0.2
        const ry = hr * 0.3
        const open = s.xe < 0.5 && s.joy < 0.5
        e.white.style.display = open ? '' : 'none'
        e.lid.style.display = open && lidV > 0.03 ? '' : 'none'
        e.arc.style.display = s.joy >= 0.5 && s.xe < 0.5 ? '' : 'none'
        e.ex1.style.display = s.xe >= 0.5 ? '' : 'none'
        const px = ex + s.lx * rx * 0.42
        const py = ey + s.ly * ry * 0.4 + lidV * ry * 0.25
        set(e.pupil, { cx: f1(px), cy: f1(py), r: f1(hr * 0.125 * s.ps) })
        set(e.glint, { cx: f1(px + hr * 0.04), cy: f1(py - hr * 0.05), r: f1(hr * 0.04 * s.ps) })
        // the lid closes from the top, with a slight slant from the brow
        const yl = ey - ry + lidV * ry * 2
        const slant = (sx < 0 ? s.bl : s.br) * 0.35 * sx
        e.lid.setAttribute('d', `M${f1(ex - rx - 6)} ${f1(ey - ry - 10)} H${f1(ex + rx + 6)} V${f1(yl - slant)} Q${f1(ex)} ${f1(yl + ry * 0.25)} ${f1(ex - rx - 6)} ${f1(yl + slant)} Z`)
        e.arc.setAttribute('d', `M${f1(ex - rx)} ${f1(ey + 6)} Q${f1(ex)} ${f1(ey - ry * 0.9)} ${f1(ex + rx)} ${f1(ey + 6)}`)
        e.ex1.setAttribute('d', `M${f1(ex - rx)} ${f1(ey - rx)} L${f1(ex + rx)} ${f1(ey + rx)} M${f1(ex + rx)} ${f1(ey - rx)} L${f1(ex - rx)} ${f1(ey + rx)}`)
        const ba = rad((sx < 0 ? s.bl : -s.br))
        const bx = ex
        const by = ey - ry - hr * 0.16 + s.bry
        const bl = hr * 0.2
        e.brow.setAttribute('d', `M${f1(bx - Math.cos(ba) * bl)} ${f1(by - Math.sin(ba) * bl)} L${f1(bx + Math.cos(ba) * bl)} ${f1(by + Math.sin(ba) * bl)}`)
        e.tear.style.display = s.tears > 0.05 ? '' : 'none'
        if (s.tears > 0.05) {
          const ty = ey + ry * 0.7
          const tl2 = hr * 0.75 * s.tears
          e.tear.setAttribute('d', `M${f1(ex - 6)} ${f1(ty)} V${f1(ty + tl2)} Q${f1(ex)} ${f1(ty + tl2 + 16)} ${f1(ex + 6)} ${f1(ty + tl2)} V${f1(ty)} Z`)
        }
      }
      // mouth
      const mw = s.mw
      const mo = Math.max(0, s.mo)
      const my = hr * 0.56
      if (mo < 3) {
        mouth.setAttribute('d', `M${f1(-mw / 2)} ${f1(my)} Q0 ${f1(my + s.mc)} ${f1(mw / 2)} ${f1(my)}`)
        mouth.setAttribute('fill', 'none')
        mouthFill.style.display = 'none'
        mouthIn.style.display = 'none'
      } else {
        const top = my + s.mc * 0.25 - mo * 0.3
        const bot = my + s.mc + mo * 1.8
        const d = `M${f1(-mw / 2)} ${f1(my)} Q0 ${f1(top)} ${f1(mw / 2)} ${f1(my)} Q0 ${f1(bot)} ${f1(-mw / 2)} ${f1(my)} Z`
        mouth.setAttribute('d', d)
        mouthFill.setAttribute('d', d)
        mclipP.setAttribute('d', d)
        mouthFill.style.display = ''
        mouthIn.style.display = ''
        mouthFill.setAttribute('fill', s.teeth > 1.5 ? '#fff' : '#5a1026')
        tongue.style.display = s.teeth > 1.5 ? 'none' : ''
        set(tongue, { cx: 0, cy: f1(my + s.mc * 0.6 + mo * 0.95), rx: f1(mw * 0.3), ry: f1(mo * 0.5) })
        teethR.style.display = s.teeth > 0.5 && s.teeth <= 1.5 ? '' : 'none'
        set(teethR, { x: f1(-mw / 2), y: f1(top - 4), width: f1(mw), height: f1(mo * 0.42 + 6) })
        teethL.style.display = s.teeth > 1.5 ? '' : 'none'
        if (s.teeth > 1.5) teethL.setAttribute('d', [-0.25, 0, 0.25].map((t) => `M${f1(mw * t)} ${f1(top - 4)} V${f1(bot)}`).join(' ') + ` M${f1(-mw / 2)} ${f1(my + mo * 0.25)} H${f1(mw / 2)}`)
      }
      // tails (springs)
      tails.forEach((t, i) => {
        if (!sim) return
        const a = ch.toLocal({ x: sim.tx[i][0][f], y: sim.ty[i][0][f] })
        const p1 = ch.toLocal({ x: sim.tx[i][1][f], y: sim.ty[i][1][f] })
        const p2 = ch.toLocal({ x: sim.tx[i][2][f], y: sim.ty[i][2][f] })
        const d = `M${f1(a.x)} ${f1(a.y)} Q${f1(p1.x)} ${f1(p1.y)} ${f1(p2.x)} ${f1(p2.y)}`
        t.o.setAttribute('d', d)
        t.i.setAttribute('d', d)
      })
      ch.G = G
    }
    ch.tails = tails
    chars.push(ch)
    return ch
  }

  function blinkAt(f, ch) {
    // a blink every ~3 s, 3 frames long, offset per character
    const period = 84 + (ch.c.seed % 5) * 9
    const k = (f + ch.c.seed * 13) % period
    return k < 2 ? 1 : k < 4 ? 0.5 : 0
  }

  /* ---------- props ---------- */
  /**
   * A drawn prop. `draw(g)` builds it once around (0,0). Animate `sp.s`
   * ({ x, y, r, sx, sy, a }); or hold it: `hold(sp, ch, 'R', { dx, dy, r })`.
   */
  function sprite(draw, { x = 0, y = 0, layer = 'mid', r = 0, sx = 1, sy = 1, a = 1 } = {}) {
    const g = E('g', {}, L[layer])
    draw(g)
    const sp = { g, s: { x, y, r, sx, sy, a }, held: null }
    sprites.push(sp)
    return sp
  }
  function hold(sp, ch, side, { dx = 0, dy = 0, r = 0, from = 0, until = Infinity } = {}) {
    sp.holds = sp.holds ?? []
    sp.holds.push({ ch, side, dx, dy, r, from, until })
    return sp
  }
  function drawSprite(sp, f) {
    const t = f / fps
    let { x, y, r } = sp.s
    const h = sp.holds?.find((k) => t >= k.from && t < k.until)
    if (h) {
      const m = h.ch.sim ? { q: h.ch.sim.q[f], hb: h.ch.sim.hb[f], br: 0 } : undefined
      const p = h.ch.handAt(h.side, m)
      x = p.x + h.dx * h.ch.s.sc
      y = p.y + h.dy * h.ch.s.sc
      r = h.r + h.ch.s.rot
      sp.s.x = x
      sp.s.y = y
    }
    sp.pre?.()
    sp.g.style.display = sp.s.a < 0.02 ? 'none' : ''
    sp.g.setAttribute('opacity', f1(sp.s.a))
    sp.g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(r)}) scale(${f1(sp.s.sx * 100) / 100} ${f1(sp.s.sy * 100) / 100})`)
  }

  /* ---------- effects (drawn on twos) ---------- */
  function effect(at, dur, build, update, layer = 'fx') {
    const g = E('g', {}, L[layer])
    g.style.display = 'none'
    const data = build(g)
    effects.push({ t0: at, t1: at + dur, g, update, data })
  }
  const fx = {
    /** Dust: a few soft clouds that swell and fade. */
    puff(at, x, y, { n = 5, size = 1, color = '#fff', spread = 1, dur = 0.5, up = 1 } = {}) {
      const r = rng(fxSeed++ * 31)
      effect(at, dur, (g) => Array.from({ length: n }, () => {
        const a = { dx: (r() - 0.5) * 220 * spread, dy: -(20 + r() * 90) * up, r: (22 + r() * 26) * size }
        a.el = E('circle', { fill: color, stroke: PAL.ink, 'stroke-width': 6 }, g)
        return a
      }), (p, d) => {
        const e = 1 - Math.pow(1 - p, 3)
        for (const a of d) set(a.el, { cx: f1(x + a.dx * e), cy: f1(y + a.dy * e), r: f1(a.r * (0.5 + e * 0.8) * (p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1)), opacity: p > 0.7 ? f1(1 - (p - 0.7) / 0.3) : 1 })
      })
    },
    /** Impact: short ink lines bursting from a point. */
    stars(at, x, y, { n = 9, r = 150, color = PAL.ink, w = 10, dur = 0.26 } = {}) {
      effect(at, dur, (g) => Array.from({ length: n }, (_, i) => E('path', { stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, g)), (p, d) => {
        d.forEach((el, i) => {
          const a = (i / n) * Math.PI * 2 + 0.3
          const r0 = r * (0.45 + p * 0.5)
          const r1 = r * (0.7 + p * 0.55)
          el.setAttribute('d', `M${f1(x + Math.cos(a) * r0)} ${f1(y + Math.sin(a) * r0)} L${f1(x + Math.cos(a) * r1)} ${f1(y + Math.sin(a) * r1)}`)
          el.setAttribute('opacity', f1(1 - p * p))
        })
      })
    },
    /** Sweat flying off a head. */
    sweat(ch, at, { n = 4, dur = 0.5 } = {}) {
      const r = rng(fxSeed++ * 17)
      effect(at, dur, (g) => Array.from({ length: n }, (_, i) => ({ s: i % 2 ? 1 : -1, vx: 60 + r() * 90, vy: 60 + r() * 80, el: E('path', { fill: PAL.sky, stroke: PAL.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g), d: i * 0.08 })), (p, d, f) => {
        const h = ch.headAt()
        for (const a of d) {
          const q = clamp((p - a.d) / (1 - a.d), 0, 1)
          const x = h.x + a.s * (ch.c.hr * ch.s.sc * 0.9 + a.vx * q)
          const y = h.y - ch.c.hr * ch.s.sc * 0.5 - a.vy * q + 220 * q * q
          a.el.setAttribute('d', `M${f1(x)} ${f1(y - 16)} Q${f1(x + 12)} ${f1(y + 4)} ${f1(x)} ${f1(y + 10)} Q${f1(x - 12)} ${f1(y + 4)} ${f1(x)} ${f1(y - 16)} Z`)
          a.el.setAttribute('opacity', q <= 0 ? 0 : f1(1 - q * q))
        }
        void f
      })
    },
    /** Speed lines across the frame. */
    lines(at, dur, { dir = -1, y0 = 500, y1 = 1300, n = 12, color = '#fff' } = {}) {
      const r = rng(fxSeed++ * 13)
      effect(at, dur, (g) => Array.from({ length: n }, () => ({ y: y0 + r() * (y1 - y0), w: 160 + r() * 340, ph: r(), sp: 2.2 + r() * 2.4, el: E('path', { stroke: color, 'stroke-width': 8 + r() * 8, 'stroke-linecap': 'round', opacity: 0.85 }, g) })), (p, d) => {
        const t = p * dur
        for (const a of d) {
          const k = (a.ph + t * a.sp) % 1
          const x = dir < 0 ? 1300 - k * (1600 + a.w) : -220 - a.w + k * (1600 + a.w)
          a.el.setAttribute('d', `M${f1(x)} ${f1(a.y)} H${f1(x + a.w)}`)
        }
      }, 'back')
    },
    /** Little shapes rising and fading (hearts, notes, Zs, sparkles): pass a glyph. */
    rise(at, x, y, glyph, { n = 5, dur = 1.1, color = '#fff', size = 60, spread = 160 } = {}) {
      const r = rng(fxSeed++ * 7)
      effect(at, dur, (g) => Array.from({ length: n }, (_, i) => {
        const el = E('text', { 'font-family': 'Fredoka, sans-serif', 'font-weight': 700, 'font-size': size * (0.7 + r() * 0.6), fill: color, stroke: PAL.ink, 'stroke-width': 5, 'paint-order': 'stroke', 'text-anchor': 'middle' }, g)
        el.textContent = glyph
        return { el, dx: (r() - 0.5) * spread, d: i / n * 0.5, up: 160 + r() * 180, wob: r() * 6 }
      }), (p, d) => {
        for (const a of d) {
          const q = clamp((p - a.d) / (1 - a.d), 0, 1)
          set(a.el, { x: f1(x + a.dx + Math.sin(q * 6 + a.wob) * 18), y: f1(y - a.up * q), opacity: q <= 0 ? 0 : f1(1 - q * q) })
        }
      })
    },
    /** A flash of the whole frame. */
    flash(at, { color = '#fff', a = 0.9, dur = 0.2 } = {}) {
      const d = document.createElement('div')
      Object.assign(d.style, { position: 'absolute', inset: '0', background: color, opacity: 0, zIndex: 90, pointerEvents: 'none' })
      ctx.stage.appendChild(d)
      tl.set(d, { opacity: a }, at)
      tl.to(d, { opacity: 0, duration: dur, ease: 'power2.out' }, at + 0.04)
    },
  }

  /* ---------- acting ---------- */
  /** Tween a character's numbers. */
  function to(ch, props, at, dur = 0.25, ease = 'power2.inOut') {
    return tl.to(ch.s, { ...props, duration: dur, ease }, at)
  }
  /**
   * A move with anticipation and overshoot: first a short wind-up the other
   * way (a quarter of the distance), then the move, landing past the pose and
   * settling. This is what makes a move read as intended.
   */
  function act(ch, props, at, { antic = 0.1, dur = 0.26, ease = 'back.out(2.4)', amount = 0.28 } = {}) {
    const wind = {}
    for (const k in props) wind[k] = (i, t) => t[k] - (props[k] - t[k]) * amount
    tl.to(ch.s, { ...wind, duration: antic, ease: 'power2.out' }, at)
    tl.to(ch.s, { ...props, duration: dur, ease }, at + antic)
    return at + antic + dur
  }
  /** Change the face. Expressions pop: one or two frames, not a slow blend. */
  function face(ch, name, at, over = {}, dur = 0.07) {
    const f = { ...FACES[name], ...over }
    ch.mouthBase = f
    tl.to(ch.s, { ...f, duration: dur, ease: 'power2.out' }, at)
  }
  /** A squash and a stretch pulse on the body (a landing, a gulp, a hit). */
  function squash(ch, at, { amount = 0.22, dur = 0.34 } = {}) {
    tl.to(ch.s, { sqy: 1 - amount, sqx: 1 + amount * 0.9, duration: 0.06, ease: 'power2.out' }, at)
    tl.to(ch.s, { sqy: 1, sqx: 1, duration: dur, ease: 'elastic.out(1.1, 0.4)' }, at + 0.06)
  }
  /** A hop on the spot (or to `x`): crouch, stretch, land, dust. */
  function jump(ch, at, { h = 160, dur = 0.42, x, crouch = 34, sound = 'thud', dust = true } = {}) {
    to(ch, { by: crouch, sqy: 0.86, sqx: 1.12 }, at, 0.1, 'power2.out')
    const t0 = at + 0.1
    to(ch, { by: -6, sqy: 1.14, sqx: 0.9 }, t0, 0.08, 'power2.out')
    to(ch, { jy: h }, t0, dur / 2, 'power2.out')
    to(ch, { jy: 0 }, t0 + dur / 2, dur / 2, 'power2.in')
    to(ch, { sqy: 1, sqx: 1 }, t0 + 0.08, dur - 0.12, 'sine.inOut')
    if (x !== undefined) to(ch, { x }, t0, dur, 'none')
    const land = t0 + dur
    to(ch, { by: 26, sqy: 0.8, sqx: 1.18 }, land, 0.06, 'power2.out')
    to(ch, { by: 0, sqy: 1, sqx: 1 }, land + 0.06, 0.36, 'elastic.out(1.1, 0.42)')
    if (dust) fx.puff(land, x ?? ch.s.x, floorY - 6, { n: 4, size: 0.8 * ch.s.sc * 0.6, spread: 0.8 })
    if (sound) ctx.sfx(land, sound, { gain: 0.7 })
    return land
  }
  /** Walk to x: the feet step in arcs, the body bobs, the arms swing. */
  function walk(ch, at, until, x, { step = 0.2, lift = 30, sound = 'tick', gain = 0.35, swing = 34 } = {}) {
    const n = Math.max(1, Math.round((until - at) / step))
    const dt = (until - at) / n
    const dir = Math.sign(x - ch.s.x) || 1
    tl.to(ch.s, { x, duration: until - at, ease: 'none' }, at)
    for (let i = 0; i < n; i++) {
      const t0 = at + i * dt
      const L2 = i % 2 === 0
      const up = L2 ? 'fLy' : 'fRy'
      const fx1 = L2 ? 'fLx' : 'fRx'
      const base = L2 ? REST.fLx : REST.fRx
      tl.to(ch.s, { [up]: -lift, [fx1]: base + dir * 26, duration: dt * 0.5, ease: 'sine.out' }, t0)
      tl.to(ch.s, { [up]: 0, [fx1]: base, duration: dt * 0.5, ease: 'sine.in' }, t0 + dt * 0.5)
      tl.to(ch.s, { by: 12, duration: dt * 0.5, ease: 'sine.inOut' }, t0)
      tl.to(ch.s, { by: 0, duration: dt * 0.5, ease: 'sine.inOut' }, t0 + dt * 0.5)
      tl.to(ch.s, { hLx: REST.hLx + (L2 ? swing : -swing) * dir * 0.5, hRx: REST.hRx + (L2 ? swing : -swing) * dir * 0.5, lean: dir * 4, duration: dt, ease: 'sine.inOut' }, t0)
      if (sound) ctx.sfx(t0 + dt, sound, { gain })
    }
    tl.to(ch.s, { hLx: REST.hLx, hRx: REST.hRx, lean: 0, duration: 0.14, ease: 'back.out(2)' }, until)
    return until
  }
  /** Shiver: a tight, fast jitter of the whole character (strain, cold, caffeine). */
  function shiver(ch, at, until, amp = 5) {
    const r = rng(Math.round(at * 100) + ch.c.seed)
    const x0 = { v: null }
    for (let t = at; t < until; t += 1 / 15) tl.set(ch.s, { hx: (r() - 0.5) * amp * 2, hy: (r() - 0.5) * amp, lean: (r() - 0.5) * amp * 0.5 }, t)
    tl.set(ch.s, { hx: 0, hy: 0, lean: 0 }, until)
    void x0
  }
  /** A line of gibberish with a bubble and a flapping mouth. Returns when it ends. */
  function say(ch, text, at, { x, y, w = 420, size = 54, tail = 0.5, pitch = 62, hold = 0.5, dur, loud = false, seed = 1, up = false } = {}) {
    const d = dur ?? Math.max(0.3, Math.min(1.3, text.replace(/<[^>]+>/g, '').length * 0.045))
    const b = document.createElement('div')
    b.className = 'c-bubble' + (loud ? ' c-bubble--loud' : '') + (up ? ' c-bubble--up' : '')
    b.innerHTML = text
    Object.assign(b.style, { left: x + 'px', top: y + 'px', width: w + 'px', fontSize: size + 'px' })
    b.style.setProperty('--tail-x', tail * 100 + '%')
    ctx.stage.appendChild(b)
    if (at > 0) {
      tl.set(b, { opacity: 0 }, 0)
      tl.fromTo(b, { opacity: 0, scale: 0.3, rotation: -6 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.22, ease: 'back.out(2.6)', immediateRender: false }, at)
    }
    tl.to(b, { opacity: 0, scale: 0.8, duration: 0.1, ease: 'power2.in' }, at + d + hold)
    if (ch) {
      const base = ch.mouthBase
      const n = Math.max(2, Math.round(d / 0.09))
      for (let k = 0; k < n; k++) tl.to(ch.s, { mo: k % 2 ? Math.max(3, base.mo * 0.4) : (loud ? 30 : 15), mw: k % 2 ? base.mw : (loud ? 56 : 36), duration: 0.07 }, at + k * 0.09)
      tl.to(ch.s, { mo: base.mo, mw: base.mw, duration: 0.07 }, at + d)
      tl.to(ch.s, { hy: -8, duration: 0.08, yoyo: true, repeat: 1 }, at)
    }
    ctx.sfx(at, loud ? 'scream' : 'blab', loud ? { dur: d, pitch: pitch + 10, gain: 0.9 } : { dur: d, pitch, seed, gain: 0.9 })
    return at + d
  }

  /* ---------- words ---------- */
  /** The meme caption at the top (a white box, like a post). On screen at frame 0 unless `at`. */
  function caption(html, { y = 250, at = 0, out, size = 60, sound = 'pop', pop = false } = {}) {
    const c = document.createElement('div')
    c.className = 'c-cap' + (pop ? ' c-cap--pop' : '')
    c.innerHTML = `<span>${html}</span>`
    Object.assign(c.style, { top: y + 'px', fontSize: size + 'px' })
    ctx.stage.appendChild(c)
    if (at > 0) {
      tl.set(c, { opacity: 0 }, 0)
      tl.fromTo(c, { opacity: 0, scale: 0.6, rotation: -3 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.22, ease: 'back.out(3)', immediateRender: false }, at)
      if (sound) ctx.sfx(at, sound, { gain: 0.7 })
    }
    if (out !== undefined) tl.set(c, { opacity: 0 }, out)
    return c
  }
  /** Onomatopoeia: slams in oversized, settles, holds, goes. */
  function ono(text, at, { x = 540, y = 900, size = 200, color = PAL.yellow, rotate = -8, hold = 0.5 } = {}) {
    const d = document.createElement('div')
    d.className = 'c-ono'
    d.textContent = text
    Object.assign(d.style, { left: x + 'px', top: y + 'px', fontSize: size + 'px', color, opacity: 0 })
    ctx.stage.appendChild(d)
    gsap.set(d, { xPercent: -50, yPercent: -50 })
    tl.fromTo(d, { opacity: 1, scale: 2.2, rotation: rotate * 2.5 }, { opacity: 1, scale: 1, rotation: rotate, duration: 0.2, ease: 'back.out(2.2)', immediateRender: false }, at)
    tl.to(d, { scale: 1.06, rotation: rotate + 2, duration: hold, ease: 'sine.inOut' }, at + 0.2)
    tl.to(d, { opacity: 0, scale: 0.7, duration: 0.1, ease: 'power2.in' }, at + 0.2 + hold)
    return d
  }
  /** The easter egg: a little weight plate with eyes, watching from somewhere in every scene. */
  function egg({ x = 960, y = floorY - 62, r = 58, layer = 'mid' } = {}) {
    const st = { lx: 0, ly: 0 }
    let pupils
    const sp = sprite((g) => {
      E('circle', { r, fill: PAL.coral }, g)
      E('path', { d: `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${r * 0.6} ${r} 0 0 0 0 ${-r}`, fill: PAL.ink, opacity: 0.14 }, g)
      E('circle', { r, fill: 'none', stroke: PAL.ink, 'stroke-width': 8 }, g)
      E('circle', { cy: r * 0.42, r: 9, fill: PAL.ink }, g)
      pupils = [-1, 1].map((s) => {
        E('ellipse', { cx: s * r * 0.34, cy: -r * 0.16, rx: 14, ry: 17, fill: '#fff', stroke: PAL.ink, 'stroke-width': 5 }, g)
        return E('circle', { r: 6.5, fill: PAL.ink }, g)
      })
    }, { x, y, layer, r: -8 })
    sp.pre = () => pupils.forEach((p, i) => set(p, { cx: f1((i ? 1 : -1) * r * 0.34 + st.lx * 6), cy: f1(-r * 0.16 + st.ly * 7) }))
    return {
      sp,
      look(lx, ly, at) {
        if (!at) Object.assign(st, { lx, ly })
        else tl.to(st, { lx, ly, duration: 0.08 }, at)
      },
      hop(at, h = 40) {
        tl.to(sp.s, { sy: 0.8, sx: 1.15, duration: 0.05 }, at)
        tl.to(sp.s, { y: y - h, sy: 1.1, sx: 0.92, duration: 0.12, ease: 'power2.out' }, at + 0.05)
        tl.to(sp.s, { y, duration: 0.12, ease: 'power2.in' }, at + 0.17)
        tl.to(sp.s, { sy: 0.82, sx: 1.14, duration: 0.04 }, at + 0.29)
        tl.to(sp.s, { sy: 1, sx: 1, duration: 0.3, ease: 'elastic.out(1.2,0.4)' }, at + 0.33)
      },
    }
  }

  /* ---------- camera (on ones) ---------- */
  const cam = {
    /** Start in close on a point (frame 0 is a close-up). */
    closeup({ x = 540, y = 800, scale = 2.2 } = {}) {
      gsap.set(world, { scale, x: (540 - x) * scale, y: (1000 - y) * scale })
    },
    zoom(at, { x = 540, y = 800, scale = 1.6, dur = 0.16, ease = 'power4.out' } = {}) {
      tl.to(world, { scale, x: (540 - x) * scale, y: (1000 - y) * scale, duration: dur, ease }, at)
    },
    reset(at, dur = 0.18, ease = 'back.out(1.4)') {
      tl.to(world, { scale: 1, x: 0, y: 0, duration: dur, ease }, at)
    },
    /** A hit: a quick shake that tapers (0.1–0.3 s). */
    shake(at, amp = 22, dur = 0.3) {
      const r = rng(Math.round(at * 1000) + 5)
      const n = Math.round(dur * fps)
      const shaker = svg
      for (let i = 0; i < n; i++) {
        const k = 1 - i / n
        tl.set(shaker, { x: (r() - 0.5) * 2 * amp * k, y: (r() - 0.5) * amp * k }, at + i / fps)
      }
      tl.set(shaker, { x: 0, y: 0 }, at + dur)
    },
    /** A slow drift for the whole reel so the frame is never dead. */
    drift({ scale = 1.04 } = {}) {
      const d = document.createElement('div')
      void d
      tl.fromTo(svg, { scale: 1 }, { scale, duration: ctx.duration, ease: 'none', transformOrigin: '540px 1000px' }, 0)
    },
  }

  /* ---------- the pre-pass: simulate secondary motion over the whole reel ---------- */
  ctx.prepass(() => {
    const dt = 1 / fps
    for (const ch of chars) {
      const n = frames + 2
      const A = () => new Float32Array(n)
      ch.sim = { q: A(), hb: A(), tf: A(), rx: A(), ry: A(), hlx: A(), hly: A(), hrx: A(), hry: A(), tx: ch.tails.map(() => [A(), A(), A()]), ty: ch.tails.map(() => [A(), A(), A()]) }
    }
    const st = chars.map(() => ({ q: 0, qv: 0, hb: 0, hbv: 0, tf: 0, tfv: 0, py: null, pv: 0, px: null, pvx: 0, tails: null }))
    for (let f = 0; f <= frames; f++) {
      tl.seek(f / fps + 1e-4, false)
      chars.forEach((ch, ci) => {
        const S = st[ci]
        const sim = ch.sim
        const s = ch.s
        // the hip's world height drives the squash; its sideways speed drives the tuft
        const hipY = s.y - s.jy + (-ch.c.hipH + s.by) * s.sc
        const hipX = s.x
        if (S.py === null) {
          S.py = hipY
          S.px = hipX
        }
        const v = (hipY - S.py) / dt
        const acc = (v - S.pv) / dt
        const vx = (hipX - S.px) / dt
        const ax = (vx - S.pvx) / dt
        S.py = hipY
        S.pv = v
        S.px = hipX
        S.pvx = vx
        // squash spring: pushed by vertical acceleration (a stop = a squash)
        S.qv += (-260 * S.q - 16 * S.qv - clamp(acc, -40000, 40000) * 0.00042 / ch.s.sc) * dt
        S.q = clamp(S.q + S.qv * dt, -0.22, 0.28)
        // the head lags the body
        S.hbv += (-320 * S.hb - 20 * S.hbv + clamp(acc, -40000, 40000) * 0.0045 / ch.s.sc) * dt
        S.hb = clamp(S.hb + S.hbv * dt, -26, 26)
        // hair tuft leans against sideways acceleration
        S.tfv += (-200 * S.tf - 12 * S.tfv - clamp(ax, -30000, 30000) * 0.004 - clamp(acc, -30000, 30000) * 0.0015) * dt
        S.tf = clamp(S.tf + S.tfv * dt, -40, 40)
        sim.q[f] = S.q
        sim.hb[f] = S.hb
        sim.tf[f] = S.tf
        const m = { q: S.q, hb: S.hb, br: 0 }
        const G = ch.geo(m)
        const hl = ch.toWorld(G.hL)
        const hr2 = ch.toWorld(G.hR)
        sim.hlx[f] = hl.x
        sim.hly[f] = hl.y
        sim.hrx[f] = hr2.x
        sim.hry[f] = hr2.y
        const root = ch.toWorld(G.hip)
        sim.rx[f] = root.x
        sim.ry[f] = root.y
        // tails: two-link verlet chains hanging off the head
        if (!S.tails) S.tails = ch.tails.map(() => null)
        ch.tails.forEach((t, i) => {
          const ca = Math.cos(rad(s.ht + s.lean * 0.4))
          const sa = Math.sin(rad(s.ht + s.lean * 0.4))
          const a = ch.toWorld({ x: G.headC.x + t.anchor[0] * ca - t.anchor[1] * sa, y: G.headC.y + t.anchor[0] * sa + t.anchor[1] * ca })
          const len = t.len * s.sc
          let T = S.tails[i]
          if (!T) T = S.tails[i] = { p: [{ x: a.x + len * 0.6, y: a.y + len * 0.8 }, { x: a.x + len * 0.9, y: a.y + len * 1.8 }], o: [{ x: a.x + len * 0.6, y: a.y + len * 0.8 }, { x: a.x + len * 0.9, y: a.y + len * 1.8 }] }
          for (let k = 0; k < 2; k++) {
            const p = T.p[k]
            const o = T.o[k]
            const nx = p.x + (p.x - o.x) * 0.9 + t.bias * 0.6
            const ny = p.y + (p.y - o.y) * 0.9 + 1.5
            o.x = p.x
            o.y = p.y
            p.x = nx
            p.y = ny
          }
          for (let it = 0; it < 4; it++) {
            let prev = a
            for (let k = 0; k < 2; k++) {
              const p = T.p[k]
              const dx = p.x - prev.x
              const dy = p.y - prev.y
              const d = Math.hypot(dx, dy) || 0.001
              p.x = prev.x + (dx / d) * len
              p.y = prev.y + (dy / d) * len
              prev = p
            }
          }
          sim.tx[i][0][f] = a.x
          sim.ty[i][0][f] = a.y
          sim.tx[i][1][f] = T.p[0].x
          sim.ty[i][1][f] = T.p[0].y
          sim.tx[i][2][f] = T.p[1].x
          sim.ty[i][2][f] = T.p[1].y
        })
      })
    }
    tl.seek(1e-4, false)
  })

  /* ---------- per frame ---------- */
  ctx.onFrame((frame) => {
    const f = twos ? frame - (frame % 2) : frame
    if (f !== frame) tl.seek(f / fps + 1e-4, false)
    turb.setAttribute('seed', 1 + ((f / 2) % 5))
    for (const ch of chars) ch.draw(Math.min(f, frames))
    for (const sp of sprites) drawSprite(sp, Math.min(f, frames))
    const t = f / fps
    for (const e of effects) {
      const on = t >= e.t0 && t < e.t1
      e.g.style.display = on ? '' : 'none'
      if (on) e.update((t - e.t0) / (e.t1 - e.t0), e.data, f)
    }
    if (f !== frame) tl.seek(frame / fps + 1e-4, false)
  })

  /* ---------- paper ---------- */
  const grain = document.createElement('div')
  Object.assign(grain.style, { position: 'absolute', inset: '0', zIndex: 85, pointerEvents: 'none', opacity: 0.2, mixBlendMode: 'multiply', backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.25'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" })
  ctx.stage.appendChild(grain)
  const vig = document.createElement('div')
  Object.assign(vig.style, { position: 'absolute', inset: '0', zIndex: 84, pointerEvents: 'none', background: 'radial-gradient(115% 85% at 50% 46%, transparent 62%, rgba(27,24,48,0.26) 100%)' })
  ctx.stage.appendChild(vig)

  return { world, svg, defs, L, E, PAL, R, floorY, person, sprite, hold, fx, caption, ono, egg, to, act, face, squash, jump, walk, shiver, say, cam, REST, FACES }
}

/* ---------- drawing helpers for props ---------- */

export const draw = {
  E,
  /** A rounded box with an ink outline and a shadow tone on the right. */
  box(g, { x, y, w, h, fill, r = 16, sw = 8, shadow = true }) {
    E('rect', { x, y, width: w, height: h, rx: r, fill }, g)
    if (shadow) E('rect', { x: x + w * 0.62, y, width: w * 0.38, height: h, rx: r, fill: PAL.ink, opacity: 0.12 }, g)
    return E('rect', { x, y, width: w, height: h, rx: r, fill: 'none', stroke: PAL.ink, 'stroke-width': sw }, g)
  },
  /** A weight plate seen edge-on (for bars): a rounded slab. */
  plate(g, { x, h, w = 32, fill }) {
    E('rect', { x, y: -h / 2, width: w, height: h, rx: 10, fill }, g)
    E('rect', { x: x + w * 0.55, y: -h / 2, width: w * 0.45, height: h, rx: 10, fill: PAL.ink, opacity: 0.16 }, g)
    E('rect', { x, y: -h / 2, width: w, height: h, rx: 10, fill: 'none', stroke: PAL.ink, 'stroke-width': 8 }, g)
  },
  /** A barbell centred on (0,0). plates = [[height, colour], …] from the inside out. */
  barbell(g, { w = 620, plates = [[170, PAL.coral]] } = {}) {
    E('rect', { x: -w / 2, y: -9, width: w, height: 18, rx: 9, fill: PAL.steel, stroke: PAL.ink, 'stroke-width': 7 }, g)
    for (const s of [-1, 1]) {
      let off = w / 2 - 120
      for (const [h, c] of plates) {
        draw.plate(g, { x: s < 0 ? -off - 32 : off, h, fill: c })
        off += 32
      }
    }
  },
  /** A dumbbell centred on (0,0). */
  dumbbell(g, { w = 90, h = 50, fill = PAL.navy } = {}) {
    E('rect', { x: -w / 2, y: -7, width: w, height: 14, rx: 7, fill: PAL.steel, stroke: PAL.ink, 'stroke-width': 6 }, g)
    for (const s of [-1, 1]) {
      E('rect', { x: s < 0 ? -w / 2 - 12 : w / 2 - 16, y: -h / 2, width: 28, height: h, rx: 9, fill, stroke: PAL.ink, 'stroke-width': 7 }, g)
    }
  },
  text(g, str, { x = 0, y = 0, size = 60, fill = PAL.ink, font = 'Bangers', anchor = 'middle', stroke, sw = 8, rotate = 0 } = {}) {
    const t = E('text', { x, y, 'font-family': `${font}, sans-serif`, 'font-size': size, fill, 'text-anchor': anchor, transform: rotate ? `rotate(${rotate} ${x} ${y})` : '' }, g)
    if (stroke) set(t, { stroke, 'stroke-width': sw, 'paint-order': 'stroke', 'stroke-linejoin': 'round' })
    t.textContent = str
    return t
  },
}
