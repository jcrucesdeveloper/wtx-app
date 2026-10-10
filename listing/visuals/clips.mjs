// Looks up single frames of the recorded app by marker name. The recordings
// (886×1920 captures of the production build with seeded history) are made
// in the wtx-studio project, expected next to this repo; set WTX_STUDIO_DIR
// if it is somewhere else.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const STUDIO_DIR = resolve(process.env.WTX_STUDIO_DIR ?? join(here, '..', '..', '..', 'wtx-studio'))

/** Folder of a language's recorded takes: `clips` for English, `clips-es` for Spanish. */
const clipsDir = (lang) => join(STUDIO_DIR, 'build', lang === 'en' ? 'clips' : `clips-${lang}`)

const metaCache = new Map()

function loadMeta(lang, clip) {
  const key = `${lang}/${clip}`
  if (!metaCache.has(key)) {
    const dir = join(clipsDir(lang), clip)
    if (!existsSync(join(dir, 'frames.json'))) {
      throw new Error(`no ${lang} take of "${clip}" in ${clipsDir(lang)} — record it in wtx-studio: WTX_LOCALE=${lang} node scripts/capture-app.mjs ${clip}`)
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
 * @param ref - `'marker'`, `['marker', offsetSeconds]` or seconds.
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
