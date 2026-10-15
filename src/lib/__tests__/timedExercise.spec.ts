import { describe, it, expect } from 'vitest'
import { formatSetValue } from '../sessionTime'
import { allTimeBestsByExercise, detectPersonalRecords } from '../sessionRecords'
import { draftFromTemplate, serializeSession, type SessionDraft } from '../serializeSession'
import { parseSessionText } from '../parseSession'
import { WorkoutParser, type WorkoutSession } from '../wtx'

function parse(text: string): WorkoutSession {
  const result = parseSessionText(text)
  if (!result.ok) throw new Error(result.error)
  return result.session
}

describe('formatSetValue', () => {
  it('shows weight × reps for a rep-based set', () => {
    expect(formatSetValue({ weight: 72.5, reps: 8 }, 'kg', false)).toBe('72.5 kg × 8')
  })

  it('shows m:ss for a timed set', () => {
    expect(formatSetValue({ weight: 0, reps: 90 }, 'kg', true)).toBe('1:30')
  })

  it('keeps a weight a timed set was logged with', () => {
    expect(formatSetValue({ weight: 20, reps: 60 }, 'kg', true)).toBe('20 kg · 1:00')
  })
})

describe('timed sets in records and volume', () => {
  const past = parse(`# Core - 2026-09-01
unit: kg

Plank | 3x60 | 0 | time
1 | 0 | 60
2 | 0 | 75
Squat | 3x5 | 100
1 | 100 | 5
`)

  it('never counts a timed exercise as a weight best', () => {
    const bests = allTimeBestsByExercise([past])
    expect(bests.has('plank')).toBe(false)
    expect(bests.get('squat')).toEqual({ weight: 100, reps: 5 })
  })

  it('ignores timed history that once logged a weight (hand-written)', () => {
    const legacy = parse(`# Core - 2026-09-02

Plank | 1x60 | 20 | time
1 | 20 | 60
`)
    expect(allTimeBestsByExercise([legacy]).has('plank')).toBe(false)
  })

  it('does not call a longer hold a record', () => {
    const prior = allTimeBestsByExercise([past])
    prior.set('plank', { weight: 0, reps: 60 })
    const finished = parse(`# Core - 2026-09-08

Plank | 1x60 | 0 | time
1 | 5 | 120
`)
    expect(detectPersonalRecords(finished, prior)).toEqual([])
  })

  it('writes a timed set with no weight, so it adds no volume', () => {
    const draft: SessionDraft = {
      name: 'Core',
      date: '2026-09-08',
      unit: 'kg',
      exercises: [
        {
          name: 'Plank',
          kind: 'time',
          sets: 1,
          reps: 60,
          weight: 20,
          note: '',
          loggedSets: [{ id: '1', type: 'number', weight: 20, reps: 90, completed: true }],
        },
      ],
    }
    const session = parse(serializeSession(draft))
    expect(session.exercises[0]!.loggedSets[0]).toMatchObject({ weight: 0, reps: 90 })
    expect(session.totalVolume).toBe(0)
  })
})

describe('draftFromTemplate with a kind switched last time', () => {
  it('does not prefill seconds from reps or reps from seconds', () => {
    const template = WorkoutParser.parseTemplate(`# Core

Plank | time 1m
Squat | reps 1x5 | 100
`)
    const last = parse(`# Core - 2026-09-01

Plank | 1x10 | 0
1 | 0 | 10
Squat | 1x30 | 0 | time
1 | 0 | 30
`)
    const draft = draftFromTemplate(template, 'core.wtt', last)
    expect(draft.exercises[0]!.loggedSets[0]).toMatchObject({ ghostReps: 60, ghostFromLast: false })
    expect(draft.exercises[1]!.loggedSets[0]).toMatchObject({ ghostReps: 5, ghostFromLast: false })
  })

  it('still prefills from a last time of the same kind', () => {
    const template = WorkoutParser.parseTemplate(`# Core

Plank | time 1m
`)
    const last = parse(`# Core - 2026-09-01

Plank | 1x60 | 0 | time
1 | 0 | 75
`)
    const draft = draftFromTemplate(template, 'core.wtt', last)
    expect(draft.exercises[0]!.loggedSets[0]).toMatchObject({ ghostReps: 75, ghostFromLast: true })
  })
})
