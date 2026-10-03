// Builds a whole 1080×1920 daily reel from a short spec, so a new video is a
// ~30-line description instead of a new composition. See
// compositions/_daily-template.html for the spec shape and
// .claude/skills/daily-reel/SKILL.md for how to pick hooks, tones and scenes.

import * as K from './kit.js'
import { reelBase, reelPhone, caption, endCard, phoneOut } from './reel.js'

/**
 * Tone = music arrangement + motion energy + sound design. Pick per video.
 *   hype      gym-energy: four-on-the-floor from frame 1, slams, shakes, flashes
 *   clean     calm/aesthetic: pads + arp, no drums, slower reveals, no shake
 *   tutorial  how-to: steady low-key beat, captions numbered "Step 1…", clear taps
 *   story     POV/narrative: quiet build through the hook, drop on the first reveal
 */
export const TONES = {
  hype: { size: 112, dur: 0.7, stagger: 0.022, shake: true, flash: true, sfx: 1, bed: 'drop' },
  clean: { size: 96, dur: 1.0, stagger: 0.03, shake: false, flash: false, sfx: 0.55, bed: 'break' },
  tutorial: { size: 96, dur: 0.8, stagger: 0.022, shake: false, flash: false, sfx: 0.8, bed: 'drive', numbered: true },
  story: { size: 104, dur: 0.8, stagger: 0.025, shake: true, flash: true, sfx: 0.9, bed: 'drop', buildIntro: true },
}

/** Named crops of real UI (clip px, 886×1920) that work as pop-out callouts. */
export const RECTS = {
  'set-row-1': { clip: 'workout', x: 30, y: 548, w: 826, h: 104 },
  'recap-stats': { clip: 'workout', x: 38, y: 150, w: 810, h: 130 },
  'recap-pr': { clip: 'workout', x: 38, y: 316, w: 810, h: 138 },
  'recap-volume': { clip: 'workout', x: 38, y: 478, w: 810, h: 88 },
  'recap-streak': { clip: 'workout', x: 38, y: 592, w: 810, h: 180 },
  'recap-milestone': { clip: 'workout', x: 38, y: 790, w: 810, h: 88 },
  calendar: { clip: 'history', x: 40, y: 140, w: 806, h: 486 },
}

/**
 * Takes that scroll on their own shortly after a marker. A beat with
 * callouts is clamped before the scroll so the crops stay on the right UI.
 */
const SCROLL_GUARDS = { workout: ['recap', 2.3], history: ['calendar', 2.2] }

/** The "Step 1 · …" kicker prefix of the tutorial tone. */
const STEP = { en: 'Step', es: 'Paso' }

const PHONE_OUT = 4.7 // seconds before the end the phone leaves
const END_CARD = 4 // seconds of end card

/** 'marker' | ['marker', offset] | ['marker', offset, nth] | seconds → clip seconds. */
function resolve(ctx, clip, ref) {
  if (typeof ref === 'number') return ref
  const [label, offset = 0, nth = 0] = Array.isArray(ref) ? ref : [ref]
  return ctx.m(clip, label, nth) + offset
}

function musicFor(ctx, tone, spec) {
  const bar = ctx.bar(1)
  const endStart = spec.duration - END_CARD
  const bodyBars = Math.round(endStart / bar)
  const sections = []
  if (tone.buildIntro) {
    const introBars = Math.max(1, Math.round(spec.hook.dur / bar))
    sections.push({ at: 0, bars: introBars, part: 'build' })
    sections.push({ at: introBars * bar, bars: bodyBars - introBars, part: 'drop' })
    ctx.sfx(Math.max(0, introBars * bar - 2), 'riser', { dur: Math.min(2, introBars * bar) })
    ctx.sfx(introBars * bar, 'impact', { gain: 0.8 })
  } else {
    sections.push({ at: 0, bars: bodyBars, part: tone.bed })
    if (tone.bed === 'drop') ctx.sfx(0, 'impact', { gain: 0.8 })
  }
  sections.push({ at: bodyBars * bar, bars: 2, part: 'outro' })
  if (spec.music !== false) ctx.music(sections)
  ctx.sfx(endStart - 2, 'riser', { dur: 2, gain: 0.6 * tone.sfx })
}

function hook(ctx, tone, spec) {
  const h = spec.hook
  const { tl, el } = ctx
  caption(ctx, { at: 0, out: h.dur - 0.25, kicker: h.kicker, lines: h.lines, size: h.size ?? tone.size, dur: tone.dur, stagger: tone.stagger })

  const box = el('div', '')
  Object.assign(box.style, {
    position: 'absolute', left: 0, right: 0, top: '640px', height: '600px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '26px', zIndex: 10,
  })
  if (h.number) {
    const { from, to, decimals = 0, suffix = '' } = h.number
    const num = el('div', '', box)
    Object.assign(num.style, { fontSize: '300px', fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 0.85 })
    const val = el('span', '', num)
    if (suffix) el('small', '', num, suffix).setAttribute('style', 'font-size:.3em;color:var(--text-1);margin-left:.1em')
    K.counter(ctx, val, from, to, 0.15, 1.0, { decimals, ease: 'expo.out' })
    K.slam(ctx, num, 0.1, { from: 1.7, sound: false })
    for (let i = 0; i < 10; i++) ctx.sfx(0.15 + i * 0.075 * (1 + i * 0.1), 'tick', { gain: 0.6 * tone.sfx })
  }
  if (h.stamp) {
    const stamp = el('div', 'stamp', box, h.stamp)
    Object.assign(stamp.style, { position: 'relative', fontSize: '54px' })
    tl.set(stamp, { opacity: 0 }, 0)
    tl.fromTo(stamp, { scale: 3, rotate: -24, opacity: 0 }, { scale: 1, rotate: -6, opacity: 1, duration: 0.35, ease: 'expo.out', immediateRender: false }, 1.0)
    ctx.sfx(1.0, 'hit', { gain: tone.sfx })
    if (tone.flash) K.flash(ctx, 1.0, 0.4)
    if (tone.shake) K.shake(ctx, box, 1.02, 18)
  }
  if (h.code) {
    const code = el('div', 'code', box)
    Object.assign(code.style, { position: 'relative', width: '850px', minHeight: '420px', fontSize: '42px' })
    code.innerHTML = `<div class="bar"><i></i><i></i><i></i><span>${K.escape(h.codeFile ?? 'routine.wtt')}</span></div><div class="body"></div>`
    tl.set(code, { opacity: 0 }, 0)
    tl.fromTo(code, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', immediateRender: false }, 0.1)
    const end = K.typewrite(ctx, code.querySelector('.body'), h.code, 0.35, { cps: h.cps ?? 36, format: K.highlightWtt })
    for (let t = 0.35; t < end; t += 0.09) ctx.sfx(t, 'tick', { gain: 0.45 * tone.sfx })
  }
  tl.to(box, { opacity: 0, scale: 0.8, y: 160, filter: 'blur(10px)', duration: 0.4, ease: 'power3.in' }, h.dur - 0.4)
}

export function dailyReel(ctx, spec) {
  const tone = TONES[spec.tone ?? 'hype']
  if (!tone) throw new Error(`unknown tone "${spec.tone}" — use ${Object.keys(TONES).join(', ')}`)
  if (spec.duration % 2) throw new Error('duration must be an even number of seconds (whole 2 s bars at 120 BPM)')
  const lang = spec.lang ?? 'en'
  if (!STEP[lang]) throw new Error(`unknown lang "${lang}" — use ${Object.keys(STEP).join(', ')}`)
  const { tl } = ctx
  const { world } = reelBase(ctx)
  musicFor(ctx, tone, spec)
  if (spec.voice) ctx.voice(spec.voice.file, spec.voice.at ?? 0, { gain: spec.voice.gain ?? 1 })
  hook(ctx, tone, spec)

  // Fit the beats exactly between the hook and the phone's exit.
  const start = spec.hook.dur
  const available = spec.duration - PHONE_OUT - start
  const total = spec.beats.reduce((s, b) => s + b.dur, 0)
  const fit = available / total
  if (Math.abs(fit - 1) > 0.02) console.warn(`daily reel: beats sum to ${total.toFixed(2)} s, scaled ×${fit.toFixed(2)} to fill ${available.toFixed(2)} s`)

  const ph = reelPhone(ctx, world, spec.beats[0].clip, { at: start - 0.15 })
  ctx.sfx(start - 0.2, 'whoosh', { gain: tone.sfx })
  let view = ph.view
  let clipName = spec.beats[0].clip
  let t = start

  spec.beats.forEach((beat, i) => {
    const dur = beat.dur * fit
    if (beat.clip !== clipName) {
      view = K.swapClip(ctx, ph, beat.clip, t)
      clipName = beat.clip
      ctx.sfx(t - 0.05, 'whoosh', { gain: 0.6 * tone.sfx })
      tl.fromTo(ph.root, { scale: 0.95 }, { scale: 1, duration: 0.5, ease: 'expo.out' }, t)
    }
    const from = resolve(ctx, beat.clip, beat.from)
    let to = resolve(ctx, beat.clip, beat.to)
    const guard = SCROLL_GUARDS[beat.clip]
    if (beat.callouts?.length && guard) {
      const limit = ctx.m(beat.clip, guard[0]) + guard[1]
      if (from < limit && to > limit) to = limit
    }
    if (to <= from) throw new Error(`beat ${i + 1}: "to" must be after "from" in ${beat.clip}`)
    K.playWithTaps(ctx, view, ph.viewport, { at: t, from, to, speed: (to - from) / dur }, { vw: ph.vw, sound: beat.tapSound !== false })
    for (const [label, offset = 0] of beat.confirms ?? []) {
      ctx.sfx(t + (resolve(ctx, beat.clip, [label, offset]) - from) / ((to - from) / dur), 'confirm', { gain: tone.sfx })
    }

    const kicker = tone.numbered ? `${STEP[lang]} ${i + 1}${beat.kicker ? ' · ' + beat.kicker : ''}` : beat.kicker
    const last = i === spec.beats.length - 1
    caption(ctx, { at: t + 0.05, out: t + dur - 0.3, kicker, lines: beat.lines, size: beat.size ?? tone.size, dur: tone.dur, stagger: tone.stagger })

    const crops = (beat.callouts ?? []).map((c) => (typeof c === 'string' ? { name: c } : c))
    crops.forEach((c, k) => {
      const rect = c.rect ?? RECTS[c.name]
      if (!rect) throw new Error(`unknown callout "${c.name}" — known: ${Object.keys(RECTS).join(', ')}`)
      if (rect.clip && rect.clip !== beat.clip) throw new Error(`callout "${c.name}" crops the ${rect.clip} clip, not ${beat.clip}`)
      const scale = c.scale ?? Math.min(1.2, 900 / rect.w)
      const y = c.y ?? 700 + crops.slice(0, k).reduce((s, p) => s + ((p.rect ?? RECTS[p.name]).h * Math.min(1.2, 900 / (p.rect ?? RECTS[p.name]).w) + 36), 0)
      const box = K.callout(ctx, world, view, rect, { x: (1080 - rect.w * scale) / 2 - 20, y, scale })
      const at = t + (c.at ?? 0.35 + k * 0.6)
      K.popIn(ctx, box, at, { sound: k === 0 ? 'hit' : 'pop' })
      if (tone.shake && k === 0) K.shake(ctx, box, at + 0.05, 8)
      K.popOut(ctx, box, last ? spec.duration - PHONE_OUT - 0.15 : t + dur - 0.3)
    })
    if (crops.length && beat.dim !== false) {
      tl.to(ph.root, { filter: 'brightness(0.5) blur(3px)', duration: 0.4 }, t + 0.25)
      tl.to(ph.root, { filter: 'brightness(1) blur(0px)', duration: 0.3 }, t + dur - 0.3)
    }
    t += dur
  })

  phoneOut(ctx, ph, spec.duration - PHONE_OUT)
  endCard(ctx, spec.duration - END_CARD, {
    lang,
    ...(spec.end?.tagline ? { tagline: spec.end.tagline } : {}),
    ...(spec.end?.pill ? { pill: spec.end.pill } : {}),
  })
}
