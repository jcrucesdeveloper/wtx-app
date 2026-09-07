// Re-syncs src/lib/wtx/ from the upstream wtx parser.
//
// Usage: node scripts/sync-wtx.mjs [ref]
//   ref defaults to the REF constant below (a pinned commit).
//
// After running, review the diff, run `pnpm format`, and update the
// "Upstream commit" line in src/lib/wtx/README.md.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REF = process.argv[2] ?? '636fc79000395101183bf64b8393954fb5d096f2'
const REPO = 'jcrucesdeveloper/wtx'
const SRC_DIR = 'parsers/typescript/src'
const FILES = [
  'types.ts',
  'WorkoutExercise.ts',
  'WorkoutTemplate.ts',
  'WorkoutSessionExercise.ts',
  'WorkoutSession.ts',
  'WorkoutParser.ts',
  'index.ts',
]

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'wtx')

/** Strip the `.ts` extension from relative import/export specifiers. */
function codemod(source) {
  return source.replace(/(from\s+['"]\.[^'"]+?)\.ts(['"])/g, '$1$2')
}

await mkdir(outDir, { recursive: true })

for (const file of FILES) {
  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${SRC_DIR}/${file}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  const ported = codemod(await res.text())
  await writeFile(join(outDir, file), ported)
  console.log(`synced ${file}`)
}

console.log(`\nDone (ref ${REF}). Now: pnpm format, review the diff, bump README.md.`)
