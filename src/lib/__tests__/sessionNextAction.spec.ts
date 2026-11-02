import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import {
  describeNext,
  nextAfterRest,
  nextWhileWorking,
  type Translate,
} from '@/lib/sessionNextAction'
import { buildWearProjection } from '@/lib/wearProjection'
import type { ActiveSession } from '@/stores/activeSession'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'

const t: Translate = (key, params) => i18n.global.t(key, params ?? {})

let nextId = 0
function set(partial: Partial<SessionSetDraft> = {}): SessionSetDraft {
  return { id: `s${nextId++}`, type: 'number', weight: null, reps: null, completed: false, ...partial }
}

function exercise(
  name: string,
  sets: SessionSetDraft[],
  partial: Partial<SessionExerciseDraft> = {},
): SessionExerciseDraft {
  return { name, kind: 'reps', sets: sets.length, reps: 8, weight: 60, note: '', loggedSets: sets, ...partial }
}

function session(
  exercises: SessionExerciseDraft[],
  partial: Partial<ActiveSession> = {},
): ActiveSession {
  return {
    id: 'session-1',
    draft: { name: 'Push day', date: '2026-10-15', unit: 'kg', exercises },
    routineId: 'r1',
    startedAt: 0,
    restEndsAt: null,
    restDurationSeconds: null,
    restExerciseIndex: null,
    restSetId: null,
    restId: null,
    restRev: 0,
    ...partial,
  }
}

describe('what comes next', () => {
  it('after a rest, is another set of the exercise just rested from', () => {
    const bench = exercise('Bench Press', [set({ completed: true }), set(), set()])
    const next = nextAfterRest(session([bench], { restExerciseIndex: 0 }))
    expect(next).toEqual({ kind: 'set', exercise: bench, set: bench.loggedSets[1] })
  })

  it('after the last set of an exercise, is the next exercise and its first set', () => {
    const bench = exercise('Bench Press', [set({ completed: true })])
    const row = exercise('Row', [set(), set()])
    const next = nextAfterRest(session([bench, row], { restExerciseIndex: 0 }))
    expect(next).toEqual({ kind: 'exercise', exercise: row, set: row.loggedSets[0] })
  })

  it('after the very last set, is that everything is logged', () => {
    const bench = exercise('Bench Press', [set({ completed: true })])
    expect(nextAfterRest(session([bench], { restExerciseIndex: 0 }))).toEqual({ kind: 'done' })
  })

  it('outside a rest, is the current exercise and its next set', () => {
    const squat = exercise('Squat', [set({ completed: true })])
    const bench = exercise('Bench Press', [set({ completed: true }), set()])
    expect(nextWhileWorking(session([squat, bench]))).toEqual({
      kind: 'set',
      exercise: bench,
      set: bench.loggedSets[1],
    })
  })

  it('skips an exercise that is already done even if its rest is the one running', () => {
    const squat = exercise('Squat', [set({ completed: true })])
    const lunge = exercise('Lunge', [set()])
    const next = nextAfterRest(session([squat, lunge], { restExerciseIndex: 0 }))
    expect(next.kind).toBe('exercise')
    expect(next.kind === 'exercise' && next.exercise.name).toBe('Lunge')
  })
})

describe('describing the next action for the watch', () => {
  it('splits a set into exercise, position and load', () => {
    const bench = exercise('Bench Press', [set({ completed: true }), set({ weight: 62.5, reps: 6 })])
    const view = describeNext(nextAfterRest(session([bench], { restExerciseIndex: 0 })), 'kg', t)
    expect(view).toEqual({
      kind: 'set',
      exercise: 'Bench Press',
      position: 'Set 2 of 2',
      load: '62.5 kg × 6',
    })
  })

  it('shows a timed exercise as its time alone, with no set position', () => {
    const plank = exercise('Plank', [set({ reps: 90 })], { kind: 'time', weight: 0 })
    const view = describeNext(nextWhileWorking(session([plank])), 'kg', t)
    expect(view).toEqual({ kind: 'set', exercise: 'Plank', position: '', load: '1:30' })
  })

  it('names a warm-up by its own count', () => {
    const squat = exercise('Squat', [set({ type: 'W', reps: 5, weight: 40 }), set({ type: 'W' }), set()])
    const view = describeNext(nextWhileWorking(session([squat])), 'kg', t)
    expect(view.position).toBe('Warm-up 1 of 2')
  })

  it('uses the display name given for the exercise', () => {
    const bench = exercise('Bench Press', [set()])
    const view = describeNext(nextWhileWorking(session([bench])), 'kg', t, (n) => `«${n}»`)
    expect(view.exercise).toBe('«Bench Press»')
  })

  it('says only that it is done when there is nothing left', () => {
    expect(describeNext({ kind: 'done' }, 'kg', t)).toEqual({
      kind: 'done',
      exercise: '',
      position: '',
      load: '',
    })
  })
})

describe('the watch projection', () => {
  it('carries what follows a rest and what to do outside it, from the same rules as the notification', () => {
    const bench = exercise('Bench Press', [set({ completed: true }), set(), set()])
    const projection = buildWearProjection(
      session([bench], { restExerciseIndex: 0 }),
      t,
      (n) => n,
      false,
    )
    expect(projection).toMatchObject({
      sessionName: 'Push day',
      stepSeconds: 15,
      vibrate: false,
      afterRest: { kind: 'set', exercise: 'Bench Press', position: 'Set 2 of 3', load: '60 kg × 8' },
      working: { kind: 'set', exercise: 'Bench Press', position: 'Set 2 of 3' },
    })
  })
})
