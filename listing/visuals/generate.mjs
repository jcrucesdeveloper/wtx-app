// Builds the store screenshot set in every language (shots.mjs):
//   1. copies each shot's frame from the recorded takes into screens/<lang>/
//      (recorded in the wtx-studio project, see clips.mjs)
//   2. stamps src/_shot.html into both store sizes: <store>/<lang>/<id>.html
//
// Every size in styles.css is in container query units (cqw/cqh), so the
// same markup adapts to either aspect ratio — only width/height change.
//
// Usage: node generate.mjs [--no-screens]   then: node export.mjs

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHOTS, LANGS } from './shots.mjs'
import { TARGETS } from './targets.mjs'
import { framePath, parseRef } from './clips.mjs'

const here = dirname(fileURLToPath(import.meta.url))

if (!process.argv.includes('--no-screens')) {
  for (const lang of LANGS) {
    mkdirSync(join(here, 'screens', lang), { recursive: true })
    for (const shot of SHOTS) {
      copyFileSync(framePath(lang, shot.clip, parseRef(shot.at)), join(here, 'screens', lang, `${shot.id}.png`))
    }
  }
}

const template = readFileSync(join(here, 'src', '_shot.html'), 'utf8')
for (const target of TARGETS) {
  for (const lang of LANGS) {
    const outDir = join(here, target.dir, lang)
    mkdirSync(outDir, { recursive: true })
    for (const shot of SHOTS) {
      const html = template
        .replaceAll('{{WIDTH}}', String(target.width))
        .replaceAll('{{HEIGHT}}', String(target.height))
        .replaceAll('{{DEVICE_W}}', String(target.device))
        .replaceAll('{{LANG}}', lang)
        .replaceAll('{{ID}}', shot.id)
        .replaceAll('{{FOCUS}}', shot.focus)
        .replaceAll('{{EYEBROW}}', shot.eyebrow[lang])
        .replaceAll('{{HEADLINE}}', shot.headline[lang])
        .replaceAll('{{SUBHEAD}}', shot.subhead[lang])
      writeFileSync(join(outDir, `${shot.id}.html`), html)
    }
  }
  console.log(`${target.dir}/ — ${SHOTS.length} shots × ${LANGS.join(', ')} @ ${target.width}x${target.height} (${target.label})`)
}
