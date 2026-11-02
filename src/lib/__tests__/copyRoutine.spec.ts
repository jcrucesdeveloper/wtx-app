import { describe, it, expect } from 'vitest'
import {
  copiedRoutineFilename,
  copiedRoutineName,
  routineCopyFromPost,
  routineDraftFromLoggedSession,
} from '../copyRoutine'
import { parseTemplateText } from '../parseRoutine'
import { parseSessionText } from '../parseSession'
import { serializeSession, type SessionDraft } from '../serializeSession'
import { ROUTINE_FILENAME_MAX } from '../supabase/limits'
import type { WorkoutSession } from '../wtx'

const SUFFIX = ' (from @Ana)'

const routineText = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
3 | 60 | 8
W | 40 | 10
3 | 60 | 8
Plank | time 45s | rest 30s
`

function session(exercises: SessionDraft['exercises']): WorkoutSession {
  const text = serializeSession({ name: 'Push Day', date: '2026-10-01', unit: 'kg', exercises })
  const result = parseSessionText(text)
  if (!result.ok) throw new Error(result.error)
  return result.session
}

const logged = session([
  {
    name: 'Bench Press',
    kind: 'reps',
    sets: 3,
    reps: 8,
    weight: 60,
    note: '',
    loggedSets: [
      { id: 'w', type: 'W', weight: 40, reps: 10, completed: true },
      { id: '1', type: 'number', weight: 60, reps: 8, completed: true },
      { id: '2', type: 'number', weight: 62.5, reps: 6, completed: true },
    ],
  },
  {
    name: 'Plank',
    kind: 'time',
    sets: 1,
    reps: 45,
    weight: 0,
    note: '',
    loggedSets: [{ id: 'p', type: 'number', weight: 0, reps: 50, completed: true }],
  },
])

describe('copiedRoutineName', () => {
  it('appends the suffix', () => {
    expect(copiedRoutineName('Push Day', SUFFIX)).toBe('Push Day (from @Ana)')
  })

  it('cuts the base name, never the suffix, so the filename fits', () => {
    const name = copiedRoutineName('x'.repeat(400), SUFFIX)
    expect(name.endsWith(SUFFIX)).toBe(true)
    expect(Array.from(copiedRoutineFilename(name)).length).toBe(ROUTINE_FILENAME_MAX)
  })

  it('counts characters, not UTF-16 units, and never splits an emoji', () => {
    const name = copiedRoutineName('💪'.repeat(300), SUFFIX)
    expect(Array.from(copiedRoutineFilename(name)).length).toBe(ROUTINE_FILENAME_MAX)
    expect(name).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })

  it('cuts a suffix that is too long on its own', () => {
    const name = copiedRoutineName('Push', ` (from @${'a'.repeat(300)})`, 40)
    expect(Array.from(copiedRoutineFilename(name)).length).toBeLessThanOrEqual(40)
  })

  it('names a blank routine', () => {
    expect(copiedRoutineName('  ', SUFFIX)).toBe('Routine (from @Ana)')
  })
})

describe('routineCopyFromPost', () => {
  it('copies the shared routine with rest times, set rows and its section', () => {
    const copy = routineCopyFromPost(
      { session: logged, snapshot: { routine: { wtt: routineText, section: 'PPL' } } },
      SUFFIX,
    )
    expect(copy.fromRoutine).toBe(true)
    expect(copy.sectionName).toBe('PPL')
    expect(copy.filename).toBe('Push Day (from @Ana).wtt')

    const parsed = parseTemplateText(copy.rawText)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.template.name).toBe('Push Day (from @Ana)')
    const [bench, plank] = parsed.template.exercises
    expect(bench?.restSeconds).toBe(90)
    expect(bench?.specificSets?.map((s) => s.label)).toEqual(['1', 'W', '3'])
    expect(plank?.kind).toBe('time')
    expect(plank?.restSeconds).toBe(30)
  })

  it('rebuilds from the logged workout when the post carries no routine', () => {
    const copy = routineCopyFromPost({ session: logged, snapshot: null }, SUFFIX)
    expect(copy.fromRoutine).toBe(false)
    expect(copy).not.toHaveProperty('sectionName')
    const parsed = parseTemplateText(copy.rawText)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.template.name).toBe('Push Day (from @Ana)')
    expect(parsed.template.exercises.map((e) => e.name)).toEqual(['Bench Press', 'Plank'])
  })

  it('falls back to the logged workout when the shared routine does not parse', () => {
    const copy = routineCopyFromPost({ session: logged, snapshot: { routine: { wtt: 'nonsense' } } }, SUFFIX)
    expect(copy.fromRoutine).toBe(false)
  })
})

describe('routineDraftFromLoggedSession', () => {
  it('plans the working sets done at the top set, and keeps timed exercises timed', () => {
    const draft = routineDraftFromLoggedSession(logged)
    expect(draft.exercises[0]).toMatchObject({ kind: 'reps', sets: 2, reps: 6, weight: 62.5 })
    expect(draft.exercises[0]?.restSeconds).toBeUndefined()
    expect(draft.exercises[1]).toMatchObject({ kind: 'time', durationSeconds: 50 })
  })
})
