// Deterministic composition runtime.
//
// A composition is an HTML page that calls `composition({...})`. Everything
// visual hangs off one paused GSAP timeline, and the renderer drives it frame
// by frame through `window.__seek(frame)` — so output is identical no matter
// how slow a frame is to capture. Real app footage (build/clips/*, recorded by
// scripts/capture-app.mjs) plays back as frame-accurate image sequences whose
// clock is just another tweened number on that timeline.
//
// Audio is authored here too: `ctx.sfx()` / `ctx.music()` collect cues that
// the renderer hands to scripts/music.mjs, so every hit lands on the frame it
// belongs to.

/* global gsap */

const clipMeta = new Map()
/** Language of the recorded takes: English lives in build/clips, others in build/clips-<lang>. */
let clipLang = 'en'

async function loadClip(name) {
  if (clipMeta.has(name)) return clipMeta.get(name)
  const base = `../build/${clipLang === 'en' ? 'clips' : `clips-${clipLang}`}/${name}`
  const [frames, markers] = await Promise.all([
    fetch(`${base}/frames.json`).then((r) => r.json()),
    fetch(`${base}/markers.json`).then((r) => r.json()),
  ])
  const meta = { name, base, ...frames, markers }
  clipMeta.set(name, meta)
  return meta
}

function rawUrl(meta, t) {
  const i = Math.max(0, Math.min(meta.frames.length - 1, Math.round(t * meta.fps)))
  return `${meta.base}/raw/${String(meta.frames[i]).padStart(6, '0')}.png`
}

export async function composition({ width, height, fps = 30, duration, bpm = 120, clips = [], lang = 'en', build }) {
  const params = new URLSearchParams(location.search)
  clipLang = lang
  document.documentElement.lang = lang
  document.documentElement.style.setProperty('--W', width + 'px')
  document.documentElement.style.setProperty('--H', height + 'px')
  const stage = document.getElementById('stage')
  stage.style.width = width + 'px'
  stage.style.height = height + 'px'

  await Promise.all(clips.map(loadClip))
  await document.fonts.ready

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
  const views = []
  const audio = { bpm, sections: [], sfx: [] }
  const beat = 60 / bpm

  const ctx = {
    tl,
    stage,
    W: width,
    H: height,
    fps,
    duration,
    beat,
    /** Seconds at the n-th beat / bar (4/4). */
    b: (n) => n * beat,
    bar: (n) => n * beat * 4,
    clip: (name) => clipMeta.get(name),
    /** A clip marker's time in seconds (first match of `label`). */
    m(name, label, nth = 0) {
      const found = clipMeta.get(name).markers.filter((mk) => mk.label === label)[nth]
      if (!found) throw new Error(`no marker ${name}:${label}`)
      return found.t
    },
    taps(name, from, to) {
      return clipMeta.get(name).markers.filter((mk) => mk.tap && mk.t >= from && mk.t <= to)
    },
    el(tag, className, parent = stage, html) {
      const node = document.createElement(tag)
      if (className) node.className = className
      if (html !== undefined) node.innerHTML = html
      parent.appendChild(node)
      return node
    },
    /**
     * An <img> showing one clip. `state.t` is the clip's own clock; schedule
     * playback with `ctx.play(view, ...)`. `source` lets a second view (a
     * zoomed callout) mirror another view's clock.
     */
    view(name, parent, { source, className = 'clip' } = {}) {
      const meta = clipMeta.get(name)
      const img = ctx.el('img', className, parent)
      img.decoding = 'sync'
      const view = { meta, img, state: source ? source.state : { t: 0 }, url: '' }
      views.push(view)
      return view
    },
    /** Plays clip time [from, to] starting at timeline time `at`, at `speed`×. */
    play(view, { at, from, to, speed = 1 }) {
      const dur = (to - from) / speed
      tl.fromTo(view.state, { t: from }, { t: to, duration: dur, ease: 'none', immediateRender: false }, at)
      return at + dur
    },
    /** Timeline time at which clip time `clipT` shows, for a play() segment. */
    at(seg, clipT) {
      return seg.at + (clipT - seg.from) / (seg.speed ?? 1)
    },
    sfx(t, type, opts = {}) {
      audio.sfx.push({ t, type, ...opts })
    },
    /** Music arrangement: [{ at, bars, part }] — see scripts/music.mjs for parts. */
    music(sections) {
      audio.sections.push(...sections)
    },
    /**
     * A voice-over recording (any format ffmpeg reads, path relative to
     * listing/videos/) starting at `at`; the music ducks under it.
     */
    voice(file, at = 0, { gain = 1 } = {}) {
      audio.voice = { file, at, gain }
    },
    params,
  }

  await build(ctx)

  // Hold every clip view on its first scheduled frame until it starts.
  tl.set({}, {}, duration)

  async function syncViews() {
    await Promise.all(
      views.map(async (view) => {
        const url = rawUrl(view.meta, view.state.t)
        if (url === view.url) return
        view.url = url
        view.img.src = url
        try {
          await view.img.decode()
        } catch {
          /* a superseded src — the next sync settles it */
        }
      }),
    )
  }

  window.__comp = { width, height, fps, duration, frames: Math.round(duration * fps), audio }
  window.__seek = async (frame) => {
    // A hair past the frame's time: a paused timeline seeked to exactly 0 has
    // not moved, so nothing scheduled at 0 (every "hidden until…" set) would
    // apply and frame 0 would show everything at once.
    tl.seek(frame / fps + 1e-4, false)
    await syncViews()
  }
  await window.__seek(Number(params.get('frame') ?? 0))

  // Scrub preview in a normal browser: ?preview → play in real time.
  if (params.has('preview')) {
    const start = performance.now()
    const loop = async () => {
      const f = Math.floor(((performance.now() - start) / 1000) * fps) % window.__comp.frames
      await window.__seek(f)
      requestAnimationFrame(loop)
    }
    loop()
  }
  window.__ready = true
  return ctx
}

/* ---------- small DOM/text helpers shared by compositions ---------- */

/**
 * Wraps each character (or word) of `node` in masked spans for staggered
 * reveals. Inline markup (`<em>`, `.outline` …) is kept: only text nodes are split.
 */
export function split(node, by = 'chars') {
  const out = []
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      out.push(...split(child, by))
      continue
    }
    if (child.nodeType !== Node.TEXT_NODE) continue
    const frag = document.createDocumentFragment()
    const parts = by === 'words' ? child.textContent.split(/(\s+)/) : [...child.textContent]
    for (const part of parts) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part))
        continue
      }
      const outer = document.createElement('span')
      outer.className = 'split-mask'
      const inner = document.createElement('span')
      inner.className = 'split'
      inner.textContent = part
      outer.appendChild(inner)
      frag.appendChild(outer)
      out.push(inner)
    }
    child.replaceWith(frag)
  }
  return out
}
