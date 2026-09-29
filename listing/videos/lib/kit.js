// Reusable motion pieces. Every function schedules onto `ctx.tl` at absolute
// timeline seconds and, where a sound belongs, registers the matching cue.

import { split } from './engine.js'

const CLIP_W = 886
const CLIP_H = 1920

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.2'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

/** Dark stage with drifting red light, a fading grid, optional perspective floor, grain. */
export function background(ctx, { floor = false, glows = 3 } = {}) {
  const { W, H, tl, duration } = ctx
  const root = ctx.el('div', 'layer bg')
  const grid = ctx.el('div', 'bg-grid', root)
  tl.fromTo(grid, { y: 0 }, { y: -72 * 3, duration, ease: 'none' }, 0)
  let floorEl
  if (floor) {
    floorEl = ctx.el('div', 'bg-floor', root)
    tl.fromTo(floorEl, { backgroundPositionY: '0px' }, { backgroundPositionY: `${120 * 8}px`, duration, ease: 'none' }, 0)
  }
  const size = Math.max(W, H)
  const spots = [
    { x: 0.2, y: 0.15, s: 0.9, dx: 0.25, dy: 0.1 },
    { x: 0.85, y: 0.8, s: 0.8, dx: -0.2, dy: -0.15 },
    { x: 0.5, y: 0.5, s: 0.6, dx: 0.1, dy: 0.2 },
  ].slice(0, glows)
  const glowEls = spots.map((p, i) => {
    const g = ctx.el('div', 'bg-glow', root)
    const d = size * p.s
    Object.assign(g.style, { width: d + 'px', height: d + 'px', left: p.x * W - d / 2 + 'px', top: p.y * H - d / 2 + 'px' })
    tl.fromTo(
      g,
      { x: 0, y: 0, opacity: i === 2 ? 0.25 : 0.55 },
      { x: p.dx * W, y: p.dy * H, opacity: i === 2 ? 0.45 : 0.35, duration, ease: 'sine.inOut' },
      0,
    )
    return g
  })
  const grain = ctx.el('div', 'grain')
  grain.style.backgroundImage = GRAIN
  ctx.el('div', 'vignette')
  return { root, grid, floor: floorEl, glows: glowEls, grain }
}

/**
 * A generic modern phone (no brand) with a status bar, playing real app
 * footage. `w` is the body width in px; returns its height too.
 */
export function phone(ctx, parent, clipName, { w, x = 0, y = 0 }) {
  const innerW = w * 0.94
  const vh = innerW * (CLIP_H / CLIP_W)
  const h = w * 0.06 + w * 0.105 + vh + w * 0.055
  const root = ctx.el('div', 'phone', parent)
  root.style.setProperty('--pw', w + 'px')
  Object.assign(root.style, { width: w + 'px', height: h + 'px', left: x + 'px', top: y + 'px' })
  ctx.el('div', 'phone__body', root)
  const screen = ctx.el('div', 'phone__screen', root)
  ctx.el(
    'div',
    'phone__status',
    screen,
    `<span>9:41</span><span class="phone__island"></span>
     <span class="phone__icons">
       <i style="width:${w * 0.012}px;height:${w * 0.018}px"></i><i style="width:${w * 0.012}px;height:${w * 0.026}px"></i><i style="width:${w * 0.012}px;height:${w * 0.034}px"></i>
       <i style="width:${w * 0.062}px;height:${w * 0.03}px;border-radius:${w * 0.008}px;margin-left:${w * 0.012}px"></i>
     </span>`,
  )
  const viewport = ctx.el('div', 'phone__viewport', screen)
  ctx.el('div', 'phone__home', screen)
  ctx.el('div', 'phone__glare', root)
  const view = ctx.view(clipName, viewport)
  return { root, screen, viewport, view, w, h, vw: innerW, vh }
}

/** Swap which clip a phone shows (a cut inside the device), at time `at`. */
export function swapClip(ctx, ph, clipName, at) {
  const view = ctx.view(clipName, ph.viewport)
  ctx.tl.set(view.img, { opacity: 0 }, 0)
  ctx.tl.set(view.img, { opacity: 1 }, at)
  ctx.tl.set(ph.view.img, { opacity: 0 }, at)
  return view
}

/** Plays a clip segment in a phone/view and draws a tap ripple (+ tap sound) for every recorded tap. */
export function playWithTaps(ctx, view, container, seg, { vw, sound = true, ripple = true } = {}) {
  const end = ctx.play(view, seg)
  const width = vw ?? container.getBoundingClientRect().width
  for (const mk of ctx.taps(view.meta.name, seg.from, seg.to)) {
    const t = ctx.at(seg, mk.t)
    if (ripple) tapRipple(ctx, container, mk.x / CLIP_W, mk.y / CLIP_H, t, width * 0.075)
    if (sound) ctx.sfx(t, 'tap', { gain: 0.8 })
  }
  return end
}

export function tapRipple(ctx, container, fx, fy, at, r) {
  const el = ctx.el('div', 'tap', container)
  Object.assign(el.style, { left: fx * 100 + '%', top: fy * 100 + '%' })
  el.style.setProperty('--r', r + 'px')
  const later = { immediateRender: false }
  ctx.tl.fromTo(el, { '--s1': 0.35, '--o1': 1 }, { '--s1': 1, '--o1': 0, duration: 0.5, ease: 'power2.out', ...later }, at - 0.04)
  ctx.tl.fromTo(el, { '--s2': 0.5, '--o2': 0.9 }, { '--s2': 1.35, '--o2': 0, duration: 0.55, ease: 'power2.out', ...later }, at - 0.04)
}

/**
 * A zoomed, floating crop of the live screen — a real piece of UI lifted out
 * of the phone. `rect` is in clip pixels (886×1920 space).
 */
export function callout(ctx, parent, source, rect, { x, y, scale = 1, radius = 22 }) {
  const box = ctx.el('div', 'callout', parent)
  Object.assign(box.style, {
    width: rect.w * scale + 'px',
    height: rect.h * scale + 'px',
    left: x + 'px',
    top: y + 'px',
    borderRadius: radius + 'px',
  })
  const view = ctx.view(source.meta.name, box, { source })
  Object.assign(view.img.style, {
    width: CLIP_W * scale + 'px',
    height: CLIP_H * scale + 'px',
    left: -rect.x * scale + 'px',
    top: -rect.y * scale + 'px',
  })
  ctx.tl.set(box, { opacity: 0 }, 0)
  return box
}

export function popIn(ctx, el, at, { from = { scale: 0.6, y: 60, rotate: -4 }, dur = 0.6, sound = 'pop' } = {}) {
  ctx.tl.fromTo(el, { opacity: 0, ...from }, { opacity: 1, scale: 1, y: 0, x: 0, rotate: 0, duration: dur, ease: 'back.out(1.8)' }, at)
  if (sound) ctx.sfx(at, sound)
}

export function popOut(ctx, el, at, { dur = 0.3 } = {}) {
  ctx.tl.to(el, { opacity: 0, scale: 0.85, y: -30, duration: dur, ease: 'power2.in' }, at)
}

/* ---------- type ---------- */

/** Characters rise out of a mask, staggered. Returns the spans for a later exit. */
export function rise(ctx, node, at, { by = 'chars', stagger = 0.025, dur = 0.7, ease = 'expo.out' } = {}) {
  const parts = split(node, by)
  ctx.tl.fromTo(parts, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: dur, stagger, ease }, at)
  return parts
}

export function riseOut(ctx, parts, at, { stagger = 0.015, dur = 0.4 } = {}) {
  ctx.tl.to(parts, { yPercent: -115, duration: dur, stagger, ease: 'expo.in' }, at)
}

/** Hard-hitting entrance on a beat: scale down from big, motion-blurred. */
export function slam(ctx, node, at, { from = 2.4, dur = 0.45, sound = 'hit' } = {}) {
  ctx.tl.fromTo(
    node,
    { scale: from, opacity: 0, filter: 'blur(24px)' },
    { scale: 1, opacity: 1, filter: 'blur(0px)', duration: dur, ease: 'expo.out' },
    at,
  )
  if (sound) ctx.sfx(at, sound)
}

export function fadeOut(ctx, node, at, dur = 0.35) {
  ctx.tl.to(node, { opacity: 0, filter: 'blur(12px)', duration: dur, ease: 'power2.in' }, at)
}

/** Deterministic typewriter with a block caret (`.caret`) while typing. */
export function typewrite(ctx, node, text, at, { cps = 38, caret = true, format = escape } = {}) {
  const state = { n: 0 }
  const dur = text.length / cps
  const render = () => {
    const n = Math.round(state.n)
    const typing = caret && n < text.length
    node.innerHTML = format(text.slice(0, n)).replace(/\n/g, '<br>') + (typing ? '<span class="caret"></span>' : '')
  }
  ctx.tl.fromTo(state, { n: 0 }, { n: text.length, duration: dur, ease: 'none', onUpdate: render, immediateRender: false }, at)
  return at + dur
}

export function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Counts a number up (tabular figures), with a tick sound per whole step. */
export function counter(ctx, node, from, to, at, dur, { decimals = 0, suffix = '', ease = 'power2.out' } = {}) {
  const state = { v: from }
  const fmt = (v) => v.toFixed(decimals) + suffix
  node.textContent = fmt(from)
  ctx.tl.fromTo(
    state,
    { v: from },
    { v: to, duration: dur, ease, onUpdate: () => (node.textContent = fmt(state.v)), immediateRender: false },
    at,
  )
}

/* ---------- transitions ---------- */

/** A red-then-dark panel sweep across the frame; the cut happens under it at `at + 0.22`. */
export function wipe(ctx, at, { dir = 1, sound = true } = {}) {
  const red = ctx.el('div', 'wipe wipe--red')
  const dark = ctx.el('div', 'wipe wipe--dark')
  red.style.zIndex = 50
  dark.style.zIndex = 49
  const off = 102 * dir
  ctx.tl.set([red, dark], { xPercent: -off }, 0)
  ctx.tl.to(red, { xPercent: 0, duration: 0.22, ease: 'expo.in' }, at)
  ctx.tl.to(dark, { xPercent: 0, duration: 0.22, ease: 'expo.in' }, at + 0.03)
  ctx.tl.to(red, { xPercent: off, duration: 0.42, ease: 'expo.out' }, at + 0.22)
  ctx.tl.to(dark, { xPercent: off, duration: 0.38, ease: 'expo.out' }, at + 0.28)
  if (sound) ctx.sfx(at - 0.05, 'whoosh')
  return at + 0.22
}

export function flash(ctx, at, strength = 0.6) {
  const f = ctx.el('div', 'flash')
  f.style.zIndex = 60
  ctx.tl.fromTo(f, { opacity: strength }, { opacity: 0, duration: 0.35, ease: 'power2.out' }, at)
}

/** Small camera shake on a heavy hit. */
export function shake(ctx, el, at, amp = 14) {
  ctx.tl.to(el, {
    keyframes: [
      { x: amp, y: -amp * 0.6, duration: 0.04 },
      { x: -amp * 0.8, y: amp * 0.5, duration: 0.04 },
      { x: amp * 0.5, y: -amp * 0.3, duration: 0.04 },
      { x: 0, y: 0, duration: 0.06 },
    ],
    ease: 'none',
  }, at)
}

/* ---------- logo ---------- */

/** WTX's barbell mark (listing/visuals/icon.html geometry): the bar draws out, plates slam on. */
export function logoMark(ctx, parent, at, { size, x, y, sound = true }) {
  const box = ctx.el('div', 'mark', parent)
  Object.assign(box.style, { width: size + 'px', height: size + 'px', left: x + 'px', top: y + 'px' })
  box.innerHTML = `<svg viewBox="0 0 100 100">
      <rect class="m-bar" x="24" y="47" width="52" height="6" rx="3" fill="#e0263a"/>
      <rect class="m-l" x="13" y="31" width="10" height="38" rx="3.5" fill="#e0263a"/>
      <rect class="m-r" x="77" y="31" width="10" height="38" rx="3.5" fill="#e0263a"/>
    </svg>`
  const bar = box.querySelector('.m-bar')
  const l = box.querySelector('.m-l')
  const r = box.querySelector('.m-r')
  ctx.tl.fromTo(bar, { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.4, ease: 'expo.out' }, at)
  ctx.tl.fromTo(l, { x: -40, opacity: 0, scaleY: 0.4, transformOrigin: '50% 50%' }, { x: 0, opacity: 1, scaleY: 1, duration: 0.35, ease: 'back.out(2.2)' }, at + 0.2)
  ctx.tl.fromTo(r, { x: 40, opacity: 0, scaleY: 0.4, transformOrigin: '50% 50%' }, { x: 0, opacity: 1, scaleY: 1, duration: 0.35, ease: 'back.out(2.2)' }, at + 0.2)
  if (sound) ctx.sfx(at + 0.2, 'plate')
  return box
}

export const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
}

/** `.wtt` syntax colouring for the on-screen code (names, keys, pipes, numbers). */
export function highlightWtt(s) {
  return escape(s)
    .replace(/^(#.*)$/gm, '<span class="c-h">$1</span>')
    .replace(/^(\w+:)/gm, '<span class="c-k">$1</span>')
    .replace(/\|/g, '<span class="c-p">|</span>')
    .replace(/\b(reps|rest|time)\b/g, '<span class="c-k">$1</span>')
    .replace(/\b(\d+x\d+|\d+(?:\.\d+)?)\b/g, '<span class="c-n">$1</span>')
}
