// Exports every generated screenshot (generate.mjs) to an exact-size PNG
// with headless Chrome: png/<store>/<lang>/<id>.png — the files to upload.
//
// Usage: node export.mjs

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SHOTS, LANGS } from './shots.mjs'
import { TARGETS } from './targets.mjs'

const here = dirname(fileURLToPath(import.meta.url))

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p)) ?? CHROME_CANDIDATES[0]

for (const target of TARGETS) {
  for (const lang of LANGS) {
    const outDir = join(here, 'png', target.dir, lang)
    mkdirSync(outDir, { recursive: true })
    for (const shot of SHOTS) {
      const page = pathToFileURL(join(here, target.dir, lang, `${shot.id}.html`)).href
      // --force-device-scale-factor=1 and --hide-scrollbars give exactly W×H pixels.
      execFileSync(CHROME, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--allow-file-access-from-files',
        `--window-size=${target.width},${target.height}`,
        `--screenshot=${join(outDir, `${shot.id}.png`)}`,
        page,
      ], { stdio: 'ignore' })
    }
    console.log(`png/${target.dir}/${lang}/ — ${SHOTS.length} screenshots`)
  }
}
