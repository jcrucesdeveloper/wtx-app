// Re-syncs src/lib/exercises/exerciseCatalog.json from the upstream
// free-exercise-db dataset.
//
// Usage: node scripts/sync-exercise-db.mjs [ref]
//   ref defaults to the REF constant below (a pinned commit).
//
// After running, review the diff and update the "Upstream commit" line in
// src/lib/exercises/README.md.

import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REF = process.argv[2] ?? 'a859101d633a01c4a1a920d6a8ce41dabba0705f'
const REPO = 'yuhonas/free-exercise-db'
const SRC_PATH = 'dist/exercises.json'

// Upstream's `primaryMuscles` is 17 values deep — too granular to search or
// tag by. Collapse it to the general groups people actually search for.
const MUSCLE_GROUP_BY_MUSCLE = {
  chest: 'Chest',
  lats: 'Back',
  'middle back': 'Back',
  'lower back': 'Back',
  traps: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  abdominals: 'Abs',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  calves: 'Legs',
  glutes: 'Legs',
  adductors: 'Legs',
  abductors: 'Legs',
  neck: 'Neck',
}

function muscleGroupFor(primaryMuscles) {
  const muscle = primaryMuscles[0]
  const group = MUSCLE_GROUP_BY_MUSCLE[muscle]
  if (!group) throw new Error(`No muscle group mapped for upstream muscle "${muscle}"`)
  return group
}

// A handful of upstream names carry a competition-discipline suffix (e.g.
// "Bench Press - Powerlifting"). We tag by muscle group, not sport — strip it.
const DISCIPLINE_SUFFIX = /\s*-\s*(Powerlifting|Strongman|Olympic Weightlifting|Weightlifting|CrossFit)$/i

function cleanName(name) {
  return name.replace(DISCIPLINE_SUFFIX, '').trim()
}

const outFile = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'lib',
  'exercises',
  'exerciseCatalog.json',
)

const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${SRC_PATH}`
const res = await fetch(url)
if (!res.ok) {
  throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
}

/** @type {Array<{id: string, name: string, primaryMuscles: string[]}>} */
const raw = await res.json()

const trimmed = raw
  .map((exercise) => ({
    id: exercise.id,
    name: cleanName(exercise.name),
    muscleGroup: muscleGroupFor(exercise.primaryMuscles),
    primaryMuscles: exercise.primaryMuscles,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const seenNames = new Set()
for (const exercise of trimmed) {
  if (seenNames.has(exercise.name)) {
    throw new Error(`Cleaning names produced a duplicate: "${exercise.name}"`)
  }
  seenNames.add(exercise.name)
}

await writeFile(outFile, JSON.stringify(trimmed, null, 2) + '\n')

console.log(`synced ${trimmed.length} exercises (ref ${REF})`)
console.log('Now: review the diff, bump README.md.')
