// Stamps each src/*.html screenshot template into both store sizes.
// The templates use {{WIDTH}}/{{HEIGHT}} placeholders and cqw/cqh-based
// CSS (styles.css) so the exact same markup adapts cleanly to either
// aspect ratio — nothing else needs to change between targets.
//
// Usage: node generate.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, 'src')

const targets = [
  { dir: 'play-store', width: 1080, height: 1920, label: 'Google Play (9:16 phone)' },
  { dir: 'app-store', width: 1290, height: 2796, label: 'App Store (6.9" iPhone)' },
]

const files = readdirSync(srcDir).filter((f) => f.endsWith('.html'))

for (const target of targets) {
  const outDir = join(here, target.dir)
  mkdirSync(outDir, { recursive: true })

  for (const file of files) {
    const template = readFileSync(join(srcDir, file), 'utf8')
    const stamped = template
      .replaceAll('{{WIDTH}}', String(target.width))
      .replaceAll('{{HEIGHT}}', String(target.height))
    writeFileSync(join(outDir, file), stamped)
  }
  console.log(`${target.dir}/ — ${files.length} files @ ${target.width}x${target.height} (${target.label})`)
}
