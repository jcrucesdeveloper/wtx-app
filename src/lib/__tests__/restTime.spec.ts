import { describe, it, expect } from 'vitest'
import { WorkoutParser } from '@/lib/wtx'
import { serializeTemplate } from '@/lib/serializeRoutine'
import {
  REST_MAX_SECONDS,
  clampRestSeconds,
  restProgress,
  routineDraftWithRest,
  routineHasExercise,
} from '@/lib/restTime'

const TEMPLATE = WorkoutParser.parseTemplate(`# Push Day
unit: kg
tags: push

Bench Press | reps 3x8 | 60 | rest 1m30s
W | 40 | 10
Overhead Press | reps 2x10 | 30
`)

describe('clampRestSeconds', () => {
  it('keeps whole seconds between off and the max', () => {
    expect(clampRestSeconds(89.6)).toBe(90)
    expect(clampRestSeconds(-15)).toBe(0)
    expect(clampRestSeconds(REST_MAX_SECONDS + 15)).toBe(REST_MAX_SECONDS)
    expect(clampRestSeconds(Number.NaN)).toBe(0)
  })
})

describe('restProgress', () => {
  it('is the share of the rest still to go', () => {
    expect(restProgress(90, 90)).toBe(1)
    expect(restProgress(45, 90)).toBe(0.5)
    expect(restProgress(0, 90)).toBe(0)
  })

  it('never overflows, and an unknown length reads as just started', () => {
    expect(restProgress(105, 90)).toBe(1)
    expect(restProgress(30, null)).toBe(1)
    expect(restProgress(0, null)).toBe(0)
  })
})

describe('routineDraftWithRest', () => {
  it('changes only that exercise’s rest, matching its name loosely', () => {
    const draft = routineDraftWithRest(TEMPLATE, '  overhead press ', 120)!
    expect(draft.exercises.map((e) => e.restSeconds)).toEqual([90, 120])

    const reparsed = WorkoutParser.parseTemplate(serializeTemplate(draft))
    expect(reparsed.exercises.map((e) => e.restSeconds)).toEqual([90, 120])
    expect(reparsed.exercises[0]!.specificSets?.[0]?.label).toBe('W')
    expect(reparsed.tags).toEqual(['push'])
  })

  it('takes the rest out with 0', () => {
    const draft = routineDraftWithRest(TEMPLATE, 'Bench Press', 0)!
    expect(draft.exercises[0]!.restSeconds).toBeUndefined()
    expect(serializeTemplate(draft)).not.toContain('rest')
  })

  it('is null for an exercise the routine does not have', () => {
    expect(routineHasExercise(TEMPLATE, 'Lateral Raise')).toBe(false)
    expect(routineDraftWithRest(TEMPLATE, 'Lateral Raise', 60)).toBeNull()
  })
})
