// Renders a TikTok / Instagram photo slideshow (carousel) from a JSON spec:
// 1080×1920 PNG slides, one per entry, in the same look as the reels. App
// slides are real frames of the recorded takes (build/clips*/), never mockups.
//
// Usage: node scripts/slideshow.mjs <name>     reads slideshows/<name>.json
// Output: out/slideshows/<name>/01.png, 02.png, … (gitignored, re-renderable)
//
// Spec:
//   { "lang": "es", "slides": [ <slide>, … ] }
// Slides:
//   { "type": "hook", "kicker"?, "lines": [html…], "image"?: "assets/photos/x.jpg", "size"? }
//      The scroll-stopper. With `image` (a photo with no one's face needed, e.g.
//      a barbell or a gym floor) the text sits over it; without, over the brand
//      background.
//   { "type": "app", "clip": "workout", "at": "recap+1.6", "kicker"?, "lines": [html…], "size"? }
//      A real screen of the app, under a caption.
//   { "type": "text", "kicker"?, "lines": [html…], "sub"?, "size"? }
//   { "type": "end", "tagline"?: html, "pill"?: text }
// Lines take <em> for the accent word. Keep each under ~14 characters at the
// default size, or pass a smaller `size`.

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { CHROME, VIDEOS_DIR, OUT_DIR, BUILD_DIR } from './paths.mjs'
import { framePath, parseRef } from './clips.mjs'

const W = 1080
const H = 1920

const END_COPY = {
  en: { tagline: 'Log every set.<br><span class="accent">Beat every PR.</span>', pill: 'Free on iOS &amp; Android' },
  es: { tagline: 'Registra cada serie.<br><span class="accent">Supera cada récord.</span>', pill: 'Gratis en iOS y Android' },
}

const MARK = `<svg viewBox="0 0 100 100"><g fill="#f6f8fa">
  <rect x="24" y="47" width="52" height="6" rx="3"/><rect x="13" y="31" width="10" height="38" rx="3.5"/>
  <rect x="77" y="31" width="10" height="38" rx="3.5"/></g></svg>`
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

const url = (path) => pathToFileURL(path).href

function caption(slide, size) {
  const kicker = slide.kicker ? `<div class="kicker" style="font-size:30px">${slide.kicker}</div>` : ''
  const lines = slide.lines.map((l) => `<div>${l}</div>`).join('')
  return `${kicker}<div class="headline" style="font-size:${slide.size ?? size}px">${lines}</div>`
}

function slideBody(slide, lang) {
  switch (slide.type) {
    case 'hook': {
      const photo = slide.image
        ? `<div class="photo" style="background-image:url('${url(join(VIDEOS_DIR, slide.image))}')"></div><div class="shade"></div>`
        : ''
      return `${photo}<div class="cap cap--hook">${caption(slide, 128)}</div>`
    }
    case 'text': {
      const sub = slide.sub ? `<div class="sub" style="font-size:44px">${slide.sub}</div>` : ''
      return `<div class="cap cap--center">${caption(slide, 112)}${sub}</div>`
    }
    case 'app': {
      const src = framePath(lang, slide.clip, parseRef(slide.at))
      return `<div class="cap">${caption(slide, 104)}</div>
        <div class="device"><img src="${url(src)}" alt=""></div>`
    }
    case 'end': {
      const copy = END_COPY[lang]
      return `<div class="end">
        <div class="end-mark">${MARK}</div>
        <div class="wordmark" style="font-size:230px">WTX</div>
        <div class="headline" style="font-size:76px;text-align:center;line-height:1">${slide.tagline ?? copy.tagline}</div>
        <div class="pill" style="font-size:38px"><span style="color:var(--signal)">${CHECK}</span><span>${slide.pill ?? copy.pill}</span></div>
      </div>`
    }
    default:
      throw new Error(`unknown slide type "${slide.type}"`)
  }
}

function page(slide, lang) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${url(join(VIDEOS_DIR, 'lib', 'motion.css'))}">
<style>
  html, body { width: ${W}px; height: ${H}px; }
  #stage { width: ${W}px; height: ${H}px; }
  .photo { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(5,8,10,.82) 0%, rgba(5,8,10,.35) 45%, rgba(5,8,10,.75) 100%); }
  /* Text stays inside the shared safe box (x 90–900, y 250–1250): TikTok and
     Reels cover the bottom and the right edge with their own UI. */
  .cap { position: absolute; left: 90px; width: 810px; top: 250px; display: flex; flex-direction: column; gap: 22px; z-index: 2; }
  .cap--hook { top: 330px; }
  .cap--center { top: 250px; height: 1000px; justify-content: center; }
  .device { position: absolute; left: 50%; top: 640px; width: 640px; transform: translateX(-50%) rotate(-2deg);
    border-radius: 64px; padding: 18px; background: #0b0d10;
    box-shadow: 0 0 0 3px rgba(255,255,255,.1), 0 40px 120px rgba(0,0,0,.7), 0 0 90px rgba(224,38,58,.28); }
  .device img { display: block; width: 100%; border-radius: 48px; }
  .end { position: absolute; left: 0; right: 0; top: 250px; height: 1000px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 40px; z-index: 2; }
  .end-mark { width: 240px; height: 240px; }
  .end-mark svg { width: 100%; height: 100%; }
</style></head><body><div id="stage">
  <div class="bg-glow" style="width:1400px;height:1400px;left:-160px;top:-300px;opacity:.75"></div>
  <div class="bg-floor"></div>
  <div class="vignette"></div>
  ${slideBody(slide, lang)}
</div></body></html>`
}

const name = process.argv[2]
if (!name) throw new Error('usage: node scripts/slideshow.mjs <name>   (reads slideshows/<name>.json)')
const spec = JSON.parse(readFileSync(join(VIDEOS_DIR, 'slideshows', `${name}.json`), 'utf8'))
const lang = spec.lang ?? 'en'
if (!END_COPY[lang]) throw new Error(`unknown lang "${lang}"`)
for (const s of spec.slides) if (s.image && !existsSync(join(VIDEOS_DIR, s.image))) throw new Error(`missing image ${s.image}`)

const outDir = join(OUT_DIR, 'slideshows', name)
const workDir = join(BUILD_DIR, 'slideshows', name)
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
mkdirSync(workDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--allow-file-access-from-files'],
})
try {
  const tab = await browser.newPage()
  await tab.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  for (const [i, slide] of spec.slides.entries()) {
    const file = join(workDir, `${String(i + 1).padStart(2, '0')}.html`)
    writeFileSync(file, page(slide, lang))
    await tab.goto(url(file), { waitUntil: 'load' })
    await tab.evaluate(() => document.fonts.ready)
    await tab.screenshot({ path: join(outDir, `${String(i + 1).padStart(2, '0')}.png`) })
  }
} finally {
  await browser.close()
}
console.log(`${name}: ${spec.slides.length} slides → ${outDir}`)
