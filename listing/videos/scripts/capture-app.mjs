// Records real-time screen captures of the running WTX app — the footage every
// video is built from. Apple (App Preview guidelines) and Google Play (≥80% of
// the video must be the real in-app experience) both require genuine captures
// of the app, so nothing here is a mockup: it's the production build, driven
// by scripted taps, recorded via the Chrome DevTools screencast.
//
// Each scene is one continuous take. Output per scene, under build/clips/<scene>/:
//   raw/000123.png   every frame Chrome actually painted
//   frames.json      { fps, width, height, frames: [rawIndex per output frame] }
//                    — a constant-frame-rate timeline mapped onto the raw frames
//   markers.json     [{ t, label, x, y }] every tap (CSS px in the 443×960
//                    viewport) and named beat, in seconds from the first frame
//   preview.mp4      quick review copy
//
// Prereq: a production build served locally (the dev build shows the Vue
// DevTools pill), e.g. from the repo root:  pnpm build-only && npx vite preview --port 5191
//
// Usage: node scripts/capture-app.mjs [scene ...]    (default: all scenes)

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'
import ffmpeg from 'ffmpeg-static'
import { buildSeed } from './seed.mjs'
import { CHROME, VIDEOS_DIR, REPO_ROOT } from './paths.mjs'

const APP_URL = process.env.WTX_APP_URL ?? 'http://localhost:5191'
const FPS = 30
// The app lays out in a 443×960 CSS-px phone viewport, painted at 2× = 886×1920
// — Apple's App Preview size for every current iPhone. The DevTools screencast
// only ever emits DIP-sized frames, so instead of deviceScaleFactor the page is
// a 886×1920 viewport with the root zoomed 2×: identical layout, full-res pixels.
// Tap coordinates (markers.json) are therefore in 886×1920 output pixels.
const ZOOM = 2
const VIEWPORT = { width: 443 * ZOOM, height: 960 * ZOOM, deviceScaleFactor: 1, isMobile: true, hasTouch: true }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Loads the seeded app, then records whatever `script` does with it. */
async function record(browser, name, script) {
  const outDir = join(VIDEOS_DIR, 'build', 'clips', name)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(join(outDir, 'raw'), { recursive: true })

  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)
  // Headless Chrome reports reduced motion, which makes the app skip its own transitions.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  const seed = buildSeed(REPO_ROOT)
  await page.evaluateOnNewDocument((zoom) => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      // The only width media query (main.css, min-width 481px) draws desktop side borders.
      style.textContent = `html { zoom: ${zoom} } #app { border: 0 !important }`
      document.head.appendChild(style)
    })
  }, ZOOM)
  await page.evaluateOnNewDocument((seed) => {
    if (sessionStorage.getItem('wtx-video-seeded')) return
    localStorage.clear()
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    sessionStorage.setItem('wtx-video-seeded', '1')
  }, seed)
  await page.goto(APP_URL + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await sleep(600)

  const cdp = await page.createCDPSession()
  const raw = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    raw.push({ t: metadata.timestamp, data })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  const markers = []
  let wallStart = 0

  const ctx = {
    page,
    sleep,
    mark(label, extra = {}) {
      markers.push({ t: Date.now() / 1000 - wallStart, label, ...extra })
    },
    /** Taps the n-th match of a selector at its center, logging where for tap indicators. */
    async tap(selector, { index = 0, label = selector, noScroll = false } = {}) {
      const handles = await page.$$(selector)
      const el = handles[index]
      if (!el) throw new Error(`${name}: no element ${selector} [${index}]`)
      let box = await el.boundingBox()
      // Keep targets clear of the header and the rest-timer/tab bars, scrolling like a thumb would.
      const bottomLimit = VIEWPORT.height - 230 * ZOOM
      if (!noScroll && (box.y + box.height > bottomLimit || box.y < 80 * ZOOM)) {
        await ctx.scroll((box.y + box.height / 2 - VIEWPORT.height * 0.45) / ZOOM, 420)
        await sleep(60)
        box = await el.boundingBox()
      }
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      ctx.mark(label, { x, y, tap: true })
      await page.touchscreen.tap(x, y)
    },
    /** Eased scroll (CSS px) of the page's main scroller, like a thumb flick settling. */
    async scroll(dy, ms = 900) {
      await page.evaluate(
        (dy, ms) =>
          new Promise((done) => {
            const all = [...document.querySelectorAll('*')].filter((e) => {
              const s = getComputedStyle(e)
              return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4
            })
            const el = all.sort((a, b) => b.clientHeight - a.clientHeight)[0]
            if (!el) return done()
            const from = el.scrollTop
            const to = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, from + dy))
            const t0 = performance.now()
            const ease = (t) => 1 - Math.pow(1 - t, 3)
            const step = (now) => {
              const p = Math.min(1, (now - t0) / ms)
              el.scrollTop = from + (to - from) * ease(p)
              if (p < 1) requestAnimationFrame(step)
              else done()
            }
            requestAnimationFrame(step)
          }),
        dy,
        ms,
      )
    },
    async type(selector, text, delay = 70, index = 0) {
      const el = (await page.$$(selector))[index]
      await el.focus()
      await el.type(text, { delay })
    },
  }

  await cdp.send('Page.startScreencast', {
    format: 'png',
    everyNthFrame: 1,
  })
  // Wait for the first painted frame so t=0 means "something is on screen".
  while (!raw.length) await sleep(20)
  wallStart = raw[0].t
  await script(ctx)
  await sleep(400)
  // Chrome only paints on change, so a static hold at the end has no frames of its own.
  const wallEnd = Date.now() / 1000
  await cdp.send('Page.stopScreencast')
  await page.close()

  // Constant-frame-rate timeline over the variable-rate raw frames.
  raw.forEach((f, i) => writeFileSync(join(outDir, 'raw', `${String(i).padStart(6, '0')}.png`), Buffer.from(f.data, 'base64')))
  const duration = wallEnd - raw[0].t
  const frames = []
  let cursor = 0
  for (let k = 0; k * (1 / FPS) <= duration; k++) {
    const t = raw[0].t + k / FPS
    while (cursor + 1 < raw.length && raw[cursor + 1].t <= t) cursor++
    frames.push(cursor)
  }
  const meta = { fps: FPS, width: VIEWPORT.width, height: VIEWPORT.height, duration, rawCount: raw.length, frames }
  writeFileSync(join(outDir, 'frames.json'), JSON.stringify(meta))
  writeFileSync(join(outDir, 'markers.json'), JSON.stringify(markers, null, 2))

  const list = frames.map((i) => `file 'raw/${String(i).padStart(6, '0')}.png'\nduration ${1 / FPS}`).join('\n')
  writeFileSync(join(outDir, 'concat.txt'), list + '\n')
  spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-crf', '20', 'preview.mp4'], { cwd: outDir, stdio: 'inherit' })

  const painted = (raw.length / duration).toFixed(1)
  console.log(`${name}: ${duration.toFixed(1)}s, ${raw.length} painted frames (${painted}/s avg), ${markers.length} markers`)
}

const SCENES = {
  /** The hero flow: start Push Day, hit a bench PR, finish, land on the recap. */
  async workout({ page, tap, type, scroll, sleep, mark }) {
    await sleep(1200)
    await tap('.start-btn', { label: 'start' })
    await sleep(2600) // pre-session intro plays
    mark('session')
    await sleep(500)
    await tap('.row__input', { index: 0, label: 'weight' })
    await type('.row__input', '72.5', 140, 0)
    await sleep(350)
    await tap('.row__check', { index: 0, label: 'pr-set' })
    mark('pr')
    await sleep(1800)
    for (const i of [1, 2, 3]) {
      await tap('.row__check', { index: i, label: `set-${i + 1}` })
      await sleep(520)
    }
    mark('bench-done')
    await sleep(300)
    await scroll(318, 700)
    await sleep(200)
    for (const i of [4, 5, 6]) {
      await tap('.row__check', { index: i, label: `set-${i + 1}` })
      await sleep(360)
    }
    mark('fast-start')
    for (let i = 7; i < 16; i++) {
      await tap('.row__check', { index: i, label: `set-${i + 1}` })
      await sleep(170)
    }
    mark('fast-end')
    const done = await page.$$eval('.row__check.active', (els) => els.length)
    if (done !== 16) throw new Error(`workout: expected 16 completed sets, got ${done}`)
    await sleep(700)
    await tap('.finish-btn', { label: 'finish' })
    await sleep(1300)
    await tap('.primary', { label: 'confirm' })
    mark('outro')
    await sleep(3400) // post-session celebration
    mark('recap')
    await sleep(2600)
    await scroll(420, 1600)
    await sleep(1400)
  },

  /** Training history: the calendar filled with a real streak, and the session log. */
  async history({ tap, scroll, sleep, mark }) {
    await sleep(900)
    await tap('a.tab[href="/sessions"]', { label: 'sessions-tab' })
    mark('calendar')
    await sleep(2400)
    await scroll(380, 1400)
    await sleep(900)
    await scroll(-380, 1100)
    await sleep(700)
    await tap('.cal__nav-btn', { index: 0, label: 'prev-month' })
    await sleep(1500)
    await tap('.cal__nav-btn', { index: 1, label: 'next-month' })
    await sleep(1200)
  },

  /** A routine is plain text: open it, reveal its source, then share it as a QR. */
  async routine({ page, tap, scroll, sleep, mark }) {
    await sleep(900)
    await tap('a.card', { index: 0, label: 'open-routine' })
    mark('detail')
    await sleep(2000)
    await tap('button.link', { label: 'show-source' })
    mark('source')
    await sleep(2600)
    await scroll(-400, 600)
    await sleep(300)
    await tap('.icon-btn[aria-label="Share routine"]', { label: 'share' })
    mark('qr')
    await sleep(3200)
    void page
  },

  /** Write a routine as text, straight into the app. */
  async plaintext({ page, tap, sleep, mark }) {
    await sleep(900)
    await tap('.add', { label: 'load' })
    await sleep(900)
    await tap('textarea', { label: 'textarea', noScroll: true })
    mark('typing')
    // Whole lines at a time (like paste/autocomplete): the live parser flags a
    // half-typed line as an error, which would read as a bug on screen.
    const lines = [
      '# Upper Power\n',
      'unit: kg\n\n',
      'Bench Press | reps 5x5 | 75\n',
      'Pullups | reps 4x8 | 0\n',
      'Side Lateral Raise | reps 3x15 | 10',
    ]
    for (const line of lines) {
      await page.evaluate((text) => document.execCommand('insertText', false, text), line)
      mark('line')
      await sleep(620)
    }
    mark('typed')
    await sleep(700)
    await tap('.primary', { label: 'add', noScroll: true })
    mark('added')
    await sleep(2600)
    const stored = await page.evaluate(() => localStorage.getItem('wtx:routines') ?? '')
    if (!stored.includes('Upper Power')) throw new Error('plaintext: routine was not added')
  },

  /** Make it yours: cycle through accent colors. */
  async accent({ tap, scroll, sleep, mark }) {
    await sleep(700)
    await tap('a.tab[href="/settings"]', { label: 'settings-tab' })
    mark('settings')
    await sleep(700)
    // Center the accent picker, scrolling the priced remove-ads card out of
    // frame (Apple's preview rules forbid showing specific prices).
    await scroll(330, 800)
    await sleep(500)
    for (const i of [1, 3, 5, 6, 0]) {
      await tap('.swatch', { index: i, label: `swatch-${i}` })
      await sleep(900)
    }
    await sleep(600)
  },
}

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES)
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
})
try {
  for (const name of wanted) {
    if (!SCENES[name]) throw new Error(`unknown scene ${name}`)
    await record(browser, name, SCENES[name])
  }
} finally {
  await browser.close()
}
