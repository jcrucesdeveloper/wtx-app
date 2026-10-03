// Building blocks for the fast-cut variations (listing/research/08-hooks-and-retention.md).
//
// Where lib/reel.js shows the app in a floating phone under animated
// headlines, these fill the frame with the recording itself and move a camera
// over it: hard cuts, punch-in zooms on the part of the screen that matters,
// text boxes that are simply there on frame 1, and open loops (a stopwatch, a
// progress bar, a countdown). Everything still schedules onto `ctx.tl`.

/* global gsap */

import * as K from './kit.js'

export const SAFE = { left: 90, right: 900, top: 250, bottom: 1250 }
const SAFE_W = SAFE.right - SAFE.left
const CLIP_W = 886
const CLIP_H = 1920

/** Regions of the recorded screens, in clip pixels (886×1920). */
export const RECTS = {
  // workout — the session screen
  'session-timer': { x: 39, y: 143, w: 808, h: 207 },
  'session-card': { x: 39, y: 376, w: 808, h: 694 },
  'session-rows': { x: 39, y: 520, w: 808, h: 360 },
  'set-row-1': { x: 30, y: 548, w: 826, h: 104 },
  // workout — the finish screen
  'recap-stats': { x: 38, y: 150, w: 810, h: 130 },
  'recap-pr': { x: 38, y: 316, w: 810, h: 138 },
  'recap-volume': { x: 38, y: 478, w: 810, h: 88 },
  'recap-streak': { x: 38, y: 592, w: 810, h: 180 },
  'recap-milestone': { x: 38, y: 790, w: 810, h: 88 },
  'recap-top': { x: 38, y: 150, w: 810, h: 730 },
  // history
  calendar: { x: 39, y: 143, w: 808, h: 472 },
  'session-list': { x: 39, y: 690, w: 808, h: 700 },
  // routine
  source: { x: 37, y: 1215, w: 812, h: 395 },
  qr: { x: 150, y: 810, w: 586, h: 586 },
  'share-sheet': { x: 30, y: 720, w: 826, h: 780 },
  // plaintext
  textarea: { x: 39, y: 738, w: 808, h: 246 },
  parsed: { x: 39, y: 1120, w: 808, h: 640 },
  // workout — the rest timer that appears when a set is ticked
  'rest-bar': { x: 0, y: 1690, w: 886, h: 112 },
  // workout — an exercise's title with its first set row
  'set-head': { x: 30, y: 400, w: 826, h: 245 },
  // accent — the settings cards that take the accent colour
  'accent-cards': { x: 40, y: 62, w: 806, h: 1160 },
}

/* ---------- full-bleed footage with a camera ---------- */

/** The whole width of the screen, from clip row `top` down (the bottom is cropped). */
export function full(top = 0) {
  const scale = 1080 / CLIP_W
  return { scale, x: 0, y: -top * scale }
}

/** The whole screen, pillarboxed. */
export const CONTAIN = { scale: 1, x: (1080 - CLIP_W) / 2, y: 0 }

/**
 * The screen pushed down to start at stage row `top`, leaving the area above
 * it (the same colour as the app) for text. `scale` 1.219 is full width.
 */
export function under(top = 640, scale = 1080 / CLIP_W) {
  return { scale, x: (1080 - CLIP_W * scale) / 2, y: top }
}

/** Camera centred on a point of the screen (clip pixels), e.g. a recorded tap. */
export function at(point, { cy = 1150, scale = 1.9 } = {}) {
  return { scale, x: 540 - point.x * scale, y: cy - point.y * scale }
}

/**
 * Camera framing that puts a region of the screen (a `RECTS` name or a rect
 * in clip pixels) across the frame, centred at stage row `cy`.
 */
export function frame(rect, { cy = 1080, fill = 0.94, maxScale = 2.4 } = {}) {
  const r = typeof rect === 'string' ? RECTS[rect] : rect
  if (!r) throw new Error(`unknown rect "${rect}"`)
  const scale = Math.min((1080 * fill) / r.w, maxScale)
  return { scale, x: 540 - (r.x + r.w / 2) * scale, y: cy - (r.y + r.h / 2) * scale }
}

/** A hidden full-frame shot of one clip. Show it with `cut()`. */
export function shot(ctx, clip) {
  const root = ctx.el('div', 'shot')
  const cam = ctx.el('div', 'shot__cam', root)
  const view = ctx.view(clip, cam)
  gsap.set(cam, { transformOrigin: '0 0', ...full() })
  ctx.tl.set(root, { opacity: 0 }, 0)
  return { root, cam, view, clip }
}

/**
 * Hard cut to `target` at `at`, hiding every other shot, with the camera
 * already on `to`. A cut is the cheapest pattern interrupt there is.
 */
export function cut(ctx, shots, target, at, to = full(), { sound = false } = {}) {
  for (const s of shots) ctx.tl.set(s.root, { opacity: s === target ? 1 : 0 }, at)
  ctx.tl.set(target.cam, { ...to }, at)
  if (sound) ctx.sfx(at, sound, { gain: 0.7 })
}

/** Moves the camera to a framing: fast by default (a punch-in), slow for a drift. */
export function cam(ctx, target, at, to, { dur = 0.3, ease = 'expo.out', sound = 'whoosh' } = {}) {
  ctx.tl.to(target.cam, { ...to, duration: dur, ease }, at)
  if (sound) ctx.sfx(at - 0.04, sound, { gain: 0.45, dur: 0.3 })
}

/** Plays a segment of the take in a shot, with a ripple and a sound on every recorded tap. */
export function play(ctx, target, seg, { sound = true, ripple = true } = {}) {
  return K.playWithTaps(ctx, target.view, target.cam, seg, { vw: CLIP_W, sound, ripple })
}

/**
 * A solid band (the app's own background colour) over the top of the frame,
 * so text never sits on moving footage. Frame the footage below `height`.
 */
export function topBand(ctx, height = 740) {
  const el = ctx.el('div', 'top-band')
  el.style.height = height + 'px'
  return el
}

/** Darkens the footage behind text for a while. */
export function scrim(ctx, at, until, opacity = 0.55) {
  const el = ctx.el('div', 'scrim')
  ctx.tl.set(el, { opacity: 0 }, 0)
  ctx.tl.to(el, { opacity, duration: 0.2 }, at)
  if (until !== undefined) ctx.tl.to(el, { opacity: 0, duration: 0.2 }, until)
  return el
}

/** Fade in from black over `dur` seconds — the opening of a loop. */
export function fadeFromBlack(ctx, dur = 1.2) {
  const el = ctx.el('div', 'blackout')
  ctx.tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: dur, ease: 'power1.inOut' }, 0)
  return el
}

/* ---------- panes: footage in a window (split screens, grids, cards) ---------- */

/**
 * A clipped window showing one clip with its own camera, for layouts where
 * the footage is not the whole frame. Works with `play()`; frame it with
 * `frameIn()`.
 */
export function pane(ctx, clip, { x, y, w, h, radius = 28, parent = ctx.stage, z } = {}) {
  const root = ctx.el('div', 'pane', parent)
  Object.assign(root.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: radius + 'px' })
  if (z !== undefined) root.style.zIndex = z
  const cam = ctx.el('div', 'shot__cam', root)
  const view = ctx.view(clip, cam)
  gsap.set(cam, { transformOrigin: '0 0' })
  return { root, cam, view, clip, w, h }
}

/** Camera framing that fits a region of the screen across a pane's width. */
export function frameIn(p, rect, { fill = 1, cy = 0.5 } = {}) {
  const r = typeof rect === 'string' ? RECTS[rect] : rect
  if (!r) throw new Error(`unknown rect "${rect}"`)
  const scale = (p.w * fill) / r.w
  return { scale, x: p.w / 2 - (r.x + r.w / 2) * scale, y: p.h * cy - (r.y + r.h / 2) * scale }
}

/** Holds a shot or pane on one moment of its take. */
export function still(ctx, target, clipT, at = 0) {
  if (at === 0) target.view.state.t = clipT
  ctx.tl.set(target.view.state, { t: clipT }, at)
}

/** Any element popping in at `at` (with `at: 0` it is simply there on frame 1). */
export function appear(ctx, el, at, { from = { scale: 0.7 }, dur = 0.18, ease = 'back.out(2.6)', sound } = {}) {
  if (at > 0) {
    ctx.tl.set(el, { opacity: 0 }, 0)
    ctx.tl.fromTo(el, { opacity: 0, ...from }, { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, duration: dur, ease, immediateRender: false }, at)
    if (sound) ctx.sfx(at, sound, { gain: 0.6 })
  }
  return el
}

export function hide(ctx, el, at) {
  ctx.tl.set(el, { opacity: 0 }, at)
}

/* ---------- text ---------- */

/**
 * A text box in the platform's own style: every line on its own rounded
 * block. With `at: 0` it is on screen in frame 1 — a hook must not animate in.
 *
 * @param tone - 'white' | 'red' | 'dark'
 * @param align - 'left' | 'center'
 */
export function label(ctx, html, { y, x = SAFE.left, size = 62, tone = 'white', align = 'left', at = 0, out, rotate = 0, sound = 'pop', z = 30 } = {}) {
  const el = ctx.el('div', `label label--${tone}`, ctx.stage, `<span>${html}</span>`)
  Object.assign(el.style, {
    left: (align === 'center' ? SAFE.left : x) + 'px',
    width: (align === 'center' ? SAFE_W : SAFE.right - x) + 'px',
    top: y + 'px',
    fontSize: size + 'px',
    textAlign: align,
    zIndex: z,
    transformOrigin: align === 'center' ? '50% 50%' : '0% 50%',
  })
  if (rotate) gsap.set(el, { rotate })
  if (at > 0) {
    ctx.tl.set(el, { opacity: 0 }, 0)
    ctx.tl.fromTo(el, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'back.out(2.6)', immediateRender: false }, at)
    if (sound) ctx.sfx(at, sound, { gain: 0.6 })
  }
  if (out !== undefined) ctx.tl.set(el, { opacity: 0 }, out)
  return el
}

/**
 * Words appearing one at a time on the beat of someone saying them.
 * `*word*` is accented. Returns the time the last word lands.
 */
export function words(ctx, text, { at = 0, per = 0.2, y, size = 104, out, align = 'left', first = 1 } = {}) {
  const el = ctx.el('div', 'words')
  Object.assign(el.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px', fontSize: size + 'px', textAlign: align })
  const tokens = text.split(/\s+/).filter(Boolean)
  let t = at
  tokens.forEach((token, i) => {
    const accent = /^\*.*\*[.,!?]?$/.test(token)
    const span = ctx.el('span', accent ? 'accent' : '', el, K.escape(token.replace(/\*/g, '')) + ' ')
    // The first words are already there on frame 1.
    if (i >= first || at > 0) {
      ctx.tl.set(span, { opacity: 0 }, 0)
      ctx.tl.fromTo(span, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out', immediateRender: false }, t)
      ctx.sfx(t, 'tick', { gain: 0.35 })
    }
    t += per * (/[.,!?:]$/.test(token) ? 2 : 1)
  })
  if (out !== undefined) ctx.tl.set(el, { opacity: 0 }, out)
  return t
}

/** A huge figure, slammed in. */
export function bigNumber(ctx, text, { at, out, y, size = 300, unit = '', sound = 'hit' } = {}) {
  const el = ctx.el('div', 'big-number')
  Object.assign(el.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px', fontSize: size + 'px' })
  el.innerHTML = `${text}${unit ? `<small>${unit}</small>` : ''}`
  if (at > 0) {
    ctx.tl.set(el, { opacity: 0 }, 0)
    ctx.tl.fromTo(el, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'expo.out', immediateRender: false }, at)
    if (sound) ctx.sfx(at, sound, { gain: 0.8 })
  }
  if (out !== undefined) ctx.tl.set(el, { opacity: 0 }, out)
  return el
}

/**
 * One text after another in the same place: `texts[i]` shows from `times[i]`
 * until `times[i + 1]` (the last one until `out`). For counters that step.
 */
export function steps(ctx, texts, times, { y, x = SAFE.left, size = 120, out, className = 'stopwatch' } = {}) {
  texts.forEach((text, i) => {
    const el = ctx.el('div', className, ctx.stage, text)
    Object.assign(el.style, { left: x + 'px', top: y + 'px', fontSize: size + 'px' })
    if (times[i] > 0) ctx.tl.set(el, { opacity: 0 }, 0)
    ctx.tl.set(el, { opacity: 1 }, times[i])
    const until = times[i + 1] ?? out
    if (until !== undefined) ctx.tl.set(el, { opacity: 0 }, until)
  })
}

/* ---------- open loops ---------- */

/** The small persistent brand tag that replaces an end card. */
export function brandTag(ctx, { y = SAFE.top, text = 'wtxworkout.com' } = {}) {
  const el = ctx.el('div', 'brand-tag')
  Object.assign(el.style, { left: SAFE.left + 'px', top: y + 'px' })
  el.innerHTML = `<svg viewBox="0 0 100 100"><g fill="#e0263a"><rect x="24" y="47" width="52" height="6" rx="3"/><rect x="13" y="31" width="10" height="38" rx="3.5"/><rect x="77" y="31" width="10" height="38" rx="3.5"/></g></svg><b>WTX</b><span>${text}</span>`
  return el
}

/** A thin bar that fills over the video: how much is left is a reason to stay. */
export function progressBar(ctx, { y = SAFE.top - 26, at = 0, until = ctx.duration } = {}) {
  const el = ctx.el('div', 'progress')
  Object.assign(el.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px' })
  const fill = ctx.el('i', '', el)
  ctx.tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: until - at, ease: 'none' }, at)
  return el
}

/**
 * A stopwatch that runs in real time from `at` and freezes at `until`. Only
 * use it over footage played at 1×: then the time it shows is the true one.
 */
export function stopwatch(ctx, { at, until, y, x = SAFE.left, size = 120 } = {}) {
  const el = ctx.el('div', 'stopwatch')
  Object.assign(el.style, { left: x + 'px', top: y + 'px', fontSize: size + 'px' })
  const state = { v: 0 }
  const render = () => (el.innerHTML = `${state.v.toFixed(1)}<small>s</small>`)
  render()
  ctx.tl.fromTo(state, { v: 0 }, { v: until - at, duration: until - at, ease: 'none', onUpdate: render, immediateRender: false }, at)
  ctx.tl.to(el, { scale: 1.18, color: '#e0263a', duration: 0.18, ease: 'back.out(3)' }, until)
  ctx.sfx(until, 'hit', { gain: 0.9 })
  return el
}

/** 3 · 2 · 1, one digit per `per` seconds, ending at `at + 3 * per`. */
export function countdown(ctx, { at, per = 0.6, y = 620, size = 420 } = {}) {
  ;['3', '2', '1'].forEach((digit, i) => {
    const t = at + i * per
    const el = ctx.el('div', 'big-number big-number--center')
    Object.assign(el.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px', fontSize: size + 'px' })
    el.textContent = digit
    ctx.tl.set(el, { opacity: 0 }, 0)
    ctx.tl.fromTo(el, { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.16, ease: 'expo.out', immediateRender: false }, t)
    ctx.tl.set(el, { opacity: 0 }, t + per)
    ctx.sfx(t, 'tick', { gain: 1 })
  })
  return at + 3 * per
}

/* ---------- a text conversation ---------- */

/**
 * A generic chat (no real app's look). `messages`: [{ from: 'them' | 'me',
 * text, at }] — each bubble pops in at its time; the layout is fixed up front.
 */
export function chat(ctx, messages, { y = SAFE.top + 90, out, size = 50 } = {}) {
  const box = ctx.el('div', 'chat')
  Object.assign(box.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px', fontSize: size + 'px' })
  for (const m of messages) {
    const bubble = ctx.el('div', `chat__bubble chat__bubble--${m.from}`, box, m.text)
    if (m.at > 0) {
      ctx.tl.set(bubble, { opacity: 0 }, 0)
      ctx.tl.fromTo(bubble, { opacity: 0, scale: 0.6, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'back.out(2)', immediateRender: false }, m.at)
      ctx.sfx(m.at, 'pop', { gain: 0.7 })
    }
  }
  if (out !== undefined) ctx.tl.set(box, { opacity: 0 }, out)
  return box
}

/* ---------- a stylised notes page (the "before") ---------- */

/** A plain note with messy gym scribbles: a generic notes page, not any real app. */
export function notes(ctx, lines, { y = SAFE.top + 200, out, size = 46, title = 'Notas' } = {}) {
  const box = ctx.el('div', 'notes')
  Object.assign(box.style, { left: SAFE.left + 'px', width: SAFE_W + 'px', top: y + 'px', fontSize: size + 'px' })
  box.innerHTML = `<b>${title}</b>${lines.map((l) => `<p>${l}</p>`).join('')}`
  if (out !== undefined) ctx.tl.set(box, { opacity: 0 }, out)
  return box
}

/** A red strike drawn across an element's box at `at`. */
export function strike(ctx, el, at, { sound = 'hit' } = {}) {
  const line = ctx.el('i', 'strike', el)
  ctx.tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.22, ease: 'expo.out' }, at)
  if (sound) ctx.sfx(at, sound, { gain: 0.9 })
  return line
}

/* ---------- small helpers ---------- */

/** Quick scale pulse on the whole stage content of a shot: emphasis on a hit. */
export function punch(ctx, target, at, amount = 1.05) {
  ctx.tl.fromTo(target.root, { scale: amount }, { scale: 1, duration: 0.28, ease: 'expo.out', immediateRender: false }, at)
}

/** Plain dark backdrop for text-only moments. */
export function backdrop(ctx) {
  return K.background(ctx, { floor: true })
}

export { CLIP_W, CLIP_H }
