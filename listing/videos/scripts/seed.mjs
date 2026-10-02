// Believable on-device state for recording the real app: the three default
// routines plus eight weeks of Push/Pull/Leg history (Mon/Wed/Fri), with
// steady progressive overload. Everything is written in the app's own
// storage format (see src/stores/routines.ts and src/stores/sessions.ts), so
// every number the recorded UI shows — streaks, "last time" ghosts, PRs,
// milestones — is computed by the app itself, not faked.
//
// The history is shaped so that logging today's Push Day with a 72.5 kg bench
// set is a genuine all-time PR, and finishing it is the 25th session (one of
// the app's milestone thresholds) on an 8-week streak.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTINES = [
  { id: 'r-push', file: 'push-day.wtt' },
  { id: 'r-pull', file: 'pull-day.wtt' },
  { id: 'r-leg', file: 'leg-day.wtt' },
]

/** Top working weight reached in the most recent session of each exercise. */
const PEAK = {
  'Bench Press': 70,
  'Shoulder Press (Barbell)': 40,
  'Incline Dumbbell Press': 26,
  'Triceps Pushdown': 27.5,
  'Side Lateral Raise': 10,
  Deadlift: 140,
  Pullups: 0,
  'Bent Over Barbell Row': 70,
  'Wide-Grip Lat Pulldown': 55,
  'Seated Cable Rows': 60,
  'Bicep Curl (Dumbbell)': 14,
  Squat: 110,
  'Romanian Deadlift': 80,
  'Leg Press': 160,
  'Walking Lunge (Barbell)': 20,
  'Seated Leg Curl': 45,
  'Standing Calf Raises': 60,
}

const WEEKS = 8

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function roundTo(value, step) {
  return Math.round(value / step) * step
}

/** `name | reps 4x8 | 60 | rest 1m30s` → `{ name, sets, reps, weight }`. */
function parseTemplate(raw) {
  const lines = raw.split(/\r?\n/)
  const name = lines[0].replace(/^#\s*/, '').trim()
  const exercises = lines
    .filter((l) => l.includes('|'))
    .map((l) => {
      const [exName, spec, weight] = l.split('|').map((s) => s.trim())
      const [, sets, reps] = spec.match(/(\d+)x(\d+)/)
      return { name: exName, sets: +sets, reps: +reps, weight: +weight }
    })
  return { name, exercises }
}

/** Same line shapes `serializeSession()` writes. */
function sessionText(template, filename, date, progress) {
  const lines = [`# ${template.name} - ${date}`, `template: ${filename}`, 'unit: kg', '']
  for (const ex of template.exercises) {
    const peak = PEAK[ex.name] ?? ex.weight
    const step = peak >= 40 ? 2.5 : peak >= 15 ? 1 : 0.5
    const weight = peak === 0 ? 0 : roundTo(peak * (0.8 + 0.2 * progress), step)
    lines.push(`${ex.name} | ${ex.sets}x${ex.reps} | ${ex.weight}`)
    for (let s = 1; s <= ex.sets; s++) {
      // Bodyweight work progresses in reps instead of load.
      const reps = peak === 0 ? ex.reps - 3 + Math.round(3 * progress) : ex.reps
      lines.push(`${s} | ${weight} | ${reps}`)
    }
  }
  return lines.join('\n') + '\n'
}

/** @param locale - The app language to record in: 'en' or 'es'. */
export function buildSeed(repoRoot, today = new Date(), locale = 'en') {
  const templatesDir = join(repoRoot, 'examples', 'templates')
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const routines = ROUTINES.map((r, i) => ({
    id: r.id,
    filename: r.file,
    rawText: readFileSync(join(templatesDir, r.file), 'utf8'),
    addedAt: base.getTime() - (WEEKS * 7 + 3) * 86400e3 + i,
  }))
  const parsed = routines.map((r) => parseTemplate(r.rawText))

  // Monday of the week `WEEKS` weeks before this one.
  const dow = (base.getDay() + 6) % 7
  const firstMonday = new Date(base)
  firstMonday.setDate(base.getDate() - dow - WEEKS * 7)

  const sessions = []
  for (let w = 0; w < WEEKS; w++) {
    ;[0, 2, 4].forEach((offset, slot) => {
      const day = new Date(firstMonday)
      day.setDate(firstMonday.getDate() + w * 7 + offset)
      if (day >= base) return
      const addedAt = new Date(day)
      addedAt.setHours(18, 40 + slot * 3, 0, 0)
      const date = ymd(day)
      const template = parsed[slot]
      sessions.push({
        id: `seed-${date}`,
        filename: `${template.name}-${date}.wts`,
        rawText: sessionText(template, routines[slot].filename, date, w / (WEEKS - 1)),
        addedAt: addedAt.getTime(),
        routineId: routines[slot].id,
        localOnly: true,
      })
    })
  }

  return {
    'wtx:onboarded': '1',
    'wtx:locale': locale,
    'wtx:theme-mode': 'dark',
    'wtx:accent': '#e0263a',
    'wtx:default-unit': 'kg',
    'wtx:routines': JSON.stringify(routines),
    'wtx:sessions': JSON.stringify(sessions.reverse()),
  }
}
