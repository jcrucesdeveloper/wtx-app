// Shared layout for the 1080×1920 vertical cuts (TikTok, Reels, Shorts).
//
// Safe zone (listing/research/06-video-specs.md): every platform overlays UI
// on the video — TikTok's caption + right-hand button column, Reels' bottom
// ~35%, Shorts' bottom title bar. Anything that must be read (captions,
// numbers, the CTA) stays inside SAFE; the phone may run past it because its
// lower half is supporting footage, not message.

import * as K from './kit.js'

export const SAFE = { left: 90, right: 900, top: 250, bottom: 1250 }

export function reelBase(ctx) {
  const bg = K.background(ctx, { floor: true })
  const world = ctx.el('div', 'stage3d')
  return { bg, world }
}

/** The phone, centered, entering from below with a tilt. */
export function reelPhone(ctx, world, clip, { at, w = 600, top = 640 }) {
  const ph = K.phone(ctx, world, clip, { w, x: (1080 - w) / 2, y: top })
  ctx.tl.set(ph.root, { opacity: 0 }, 0)
  ctx.tl.fromTo(
    ph.root,
    { opacity: 0, y: 700, rotateX: 38, scale: 0.9 },
    { opacity: 1, y: 0, rotateX: 10, scale: 1, duration: 0.8, ease: 'expo.out' },
    at,
  )
  ctx.tl.to(ph.root, { rotateX: 4, rotateY: -4, duration: 8, ease: 'sine.inOut' }, at + 0.8)
  ctx.tl.to(ph.root, { rotateX: 7, rotateY: 5, duration: 8, ease: 'sine.inOut' }, at + 8.8)
  const scale = ph.vw / 886
  /** Clip px → stage coordinates (untilted approximation, for callouts). */
  ph.sx = (x) => (1080 - w) / 2 + w * 0.03 + x * scale
  ph.sy = (y) => top + w * 0.135 + y * scale
  return ph
}

/**
 * A caption block in the top safe area: kicker + 1–2 line headline, rising in
 * and out. `lines` are HTML strings (use <em> for the accent word).
 */
export function caption(ctx, { at, out, kicker, lines, size = 112 }) {
  const box = ctx.el('div', 'reel-cap')
  Object.assign(box.style, {
    position: 'absolute',
    left: SAFE.left + 'px',
    width: SAFE.right - SAFE.left + 'px',
    top: SAFE.top + 'px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    zIndex: 20,
  })
  let k
  if (kicker) {
    k = ctx.el('div', 'kicker', box, kicker)
    k.style.fontSize = '28px'
    ctx.tl.fromTo(k, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, immediateRender: false }, at)
    ctx.tl.set(k, { opacity: 0 }, 0)
  }
  const h = ctx.el('div', 'headline', box)
  h.style.fontSize = size + 'px'
  const parts = []
  lines.forEach((html, i) => {
    const line = ctx.el('div', '', h, html)
    parts.push(...K.rise(ctx, line, at + 0.05 + i * 0.16, { stagger: 0.022 }))
  })
  if (out !== undefined) {
    K.riseOut(ctx, parts, out)
    if (k) ctx.tl.to(k, { opacity: 0, duration: 0.25 }, out)
  }
  return { box, parts, headline: h }
}

/** Closing card: the mark, the wordmark, the promise, the CTA. */
export function endCard(ctx, at, { tagline = 'Log every set.<br><span class="accent">Beat every PR.</span>' } = {}) {
  const end = ctx.el('div', 'end-v')
  Object.assign(end.style, {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SAFE.top + 'px',
    height: SAFE.bottom - SAFE.top + 'px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
    zIndex: 30,
    // centre within the TikTok-safe width (its button column sits on the right)
    paddingRight: '0px',
  })
  const mark = K.logoMark(ctx, end, at, { size: 240, x: 0, y: 0 })
  mark.style.position = 'relative'
  const wm = ctx.el('div', 'wordmark', end, 'WTX')
  wm.style.fontSize = '230px'
  K.rise(ctx, wm, at + 0.35, { stagger: 0.06, dur: 0.8 })
  const tag = ctx.el('div', 'headline', end, tagline)
  Object.assign(tag.style, { fontSize: '76px', textAlign: 'center', lineHeight: '1' })
  ctx.tl.set(tag, { opacity: 0 }, 0)
  ctx.tl.fromTo(tag, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: false }, at + 0.8)
  const pill = ctx.el('div', 'pill', end, `${K.ICONS.check}<span>Free on iOS &amp; Android</span>`)
  pill.style.fontSize = '38px'
  pill.querySelector('svg').style.color = 'var(--signal)'
  ctx.tl.set(pill, { opacity: 0 }, 0)
  ctx.tl.fromTo(pill, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: false }, at + 1.3)
  ctx.sfx(at + 1.3, 'pop')
  ctx.tl.fromTo(end, { scale: 1 }, { scale: 1.05, duration: 5, ease: 'none' }, at)
  return end
}

/** Exit for the phone before the end card. */
export function phoneOut(ctx, ph, at) {
  ctx.tl.to(ph.root, { y: 900, rotateX: 30, opacity: 0, duration: 0.5, ease: 'power3.in' }, at)
  ctx.sfx(at, 'whoosh', { gain: 0.6 })
}
