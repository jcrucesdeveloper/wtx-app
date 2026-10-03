// Looks up single frames of the recorded takes (build/clips*/, see
// capture-app.mjs) by marker name — for stills: slideshow slides and store
// screenshots. Every frame is 886×1920, a real capture of the running app.
//
// Usage: node scripts/clips.mjs <lang> <clip> <marker>[+offset] <out.png>
//        node scripts/clips.mjs es workout recap+1.5 /tmp/recap.png

import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { clipsDir } from './paths.mjs'

const metaCache = new Map()

function loadMeta(lang, clip) {
  const key = `${lang}/${clip}`
  if (!metaCache.has(key)) {
    const dir = join(clipsDir(lang), clip)
    if (!existsSync(join(dir, 'frames.json'))) {
      throw new Error(`no ${lang} take of "${clip}" — record it with: WTX_LOCALE=${lang} node scripts/capture-app.mjs ${clip}`)
    }
    metaCache.set(key, {
      dir,
      ...JSON.parse(readFileSync(join(dir, 'frames.json'), 'utf8')),
      markers: JSON.parse(readFileSync(join(dir, 'markers.json'), 'utf8')),
    })
  }
  return metaCache.get(key)
}

/**
 * Path of the recorded frame at a moment of a take.
 *
 * @param ref - `'marker'`, `['marker', offsetSeconds]` or seconds — the same
 *   references the compositions use.
 */
export function framePath(lang, clip, ref) {
  const meta = loadMeta(lang, clip)
  let t = ref
  if (typeof ref !== 'number') {
    const [label, offset = 0] = Array.isArray(ref) ? ref : [ref]
    const marker = meta.markers.find((m) => m.label === label)
    if (!marker) throw new Error(`${clip}: no marker "${label}" — known: ${[...new Set(meta.markers.map((m) => m.label))].join(', ')}`)
    t = marker.t + offset
  }
  const index = Math.max(0, Math.min(meta.frames.length - 1, Math.round(t * meta.fps)))
  return join(meta.dir, 'raw', `${String(meta.frames[index]).padStart(6, '0')}.png`)
}

/** `recap+1.5` → `['recap', 1.5]`; `12.4` → `12.4`. */
export function parseRef(text) {
  if (/^[\d.]+$/.test(text)) return Number(text)
  const [, label, offset] = text.match(/^(.+?)([+-][\d.]+)?$/)
  return [label, offset ? Number(offset) : 0]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [lang, clip, ref, out] = process.argv.slice(2)
  if (!out) throw new Error('usage: node scripts/clips.mjs <lang> <clip> <marker>[+offset] <out.png>')
  copyFileSync(framePath(lang, clip, parseRef(ref)), out)
  console.log(out)
}
