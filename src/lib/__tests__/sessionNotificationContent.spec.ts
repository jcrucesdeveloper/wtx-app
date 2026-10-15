import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { buildSessionNotification, type Translate } from '@/lib/sessionNotificationContent'
import type { ActiveSession } from '@/stores/activeSession'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'

const t: Translate = (key, params) => i18n.global.t(key, params ?? {})
const NOW = 1_700_000_000_000

let nextId = 0
function set(partial: Partial<SessionSetDraft> = {}): SessionSetDraft {
  return {
    id: `s${nextId++}`,
    type: 'number',
    weight: null,
    reps: null,
    completed: false,
    ...partial,
  }
}

function exercise(
  name: string,
  sets: SessionSetDraft[],
  partial: Partial<SessionExerciseDraft> = {},
) {
  return {
    name,
    kind: 'reps',
    sets: sets.length,
    reps: 8,
    weight: 80,
    note: '',
    loggedSets: sets,
    ...partial,
  } satisfies SessionExerciseDraft
}

function session(
  exercises: SessionExerciseDraft[],
  partial: Partial<ActiveSession> = {},
): ActiveSession {
  return {
    draft: { name: 'Push day', date: '2026-10-15', unit: 'kg', exercises },
    routineId: 'r1',
    startedAt: NOW - 600_000,
    restEndsAt: null,
    restDurationSeconds: null,
    restExerciseIndex: null,
    restSetId: null,
    ...partial,
  }
}

describe('buildSessionNotification', () => {
  it('is null without a session, so the notification goes away', () => {
    expect(buildSessionNotification(null, t, NOW)).toBeNull()
  })

  it('shows the first exercise with a set left, and that set numbered among working sets', () => {
    const s = session([
      exercise('Squat', [set({ completed: true })]),
      exercise('Bench Press', [
        set({ type: 'W', completed: true }),
        set({ completed: true }),
        set({ completed: true }),
        set({ weight: 82.5, reps: 6 }),
        set(),
      ]),
    ])
    const content = buildSessionNotification(s, t, NOW)
    expect(content).toMatchObject({
      exerciseName: 'Bench Press',
      title: 'Bench Press',
      body: 'Set 3 of 4 · 82.5 kg × 6',
      startedAt: s.startedAt,
      restEndsAt: null,
      afterRest: null,
    })
  })

  it('falls back to last time, then the plan, for the load', () => {
    const ghost = session([exercise('Row', [set({ ghostWeight: 60, ghostReps: 10 })])])
    expect(buildSessionNotification(ghost, t, NOW)?.body).toBe('Set 1 of 1 · 60 kg × 10')
    const planned = session([exercise('Row', [set()])])
    expect(buildSessionNotification(planned, t, NOW)?.body).toBe('Set 1 of 1 · 80 kg × 8')
  })

  it('names warm-ups and drop sets, and leaves out a zero weight', () => {
    const s = session([exercise('Dips', [set({ type: 'W', reps: 5, weight: 0 })], { weight: 0 })])
    expect(buildSessionNotification(s, t, NOW)?.body).toBe('Warm-up · 5')
  })

  it('shows a time exercise as a clock', () => {
    const s = session([exercise('Plank', [set({ reps: 90 })], { kind: 'time', weight: 0 })])
    expect(buildSessionNotification(s, t, NOW)?.body).toBe('Set 1 of 1 · 1:30')
  })

  it('says so when every set is logged', () => {
    const s = session([exercise('Squat', [set({ completed: true })])])
    expect(buildSessionNotification(s, t, NOW)).toMatchObject({
      title: 'Squat',
      body: 'All sets logged. Finish when you are ready.',
    })
  })

  it('counts down a running rest and says what comes after it', () => {
    const s = session(
      [exercise('Squat', [set({ completed: true }), set({ weight: 100, reps: 5 })])],
      {
        restEndsAt: NOW + 90_000,
        restDurationSeconds: 90,
        restExerciseIndex: 0,
      },
    )
    const content = buildSessionNotification(s, t, NOW)
    expect(content).toMatchObject({
      title: 'Squat',
      body: 'Resting · then Set 2 of 2 · 100 kg × 5',
      restEndsAt: NOW + 90_000,
      afterRest: { exerciseName: 'Squat', title: 'Squat', body: 'Set 2 of 2 · 100 kg × 5' },
    })
  })

  it('names the next exercise when the rest ends one', () => {
    const s = session(
      [
        exercise('Squat', [set({ completed: true })]),
        exercise('Lunge', [set({ reps: 12, weight: 20 })]),
      ],
      { restEndsAt: NOW + 60_000, restDurationSeconds: 60, restExerciseIndex: 0 },
    )
    const content = buildSessionNotification(s, t, NOW)
    expect(content).toMatchObject({
      exerciseName: 'Squat',
      body: 'Resting · next: Lunge',
      afterRest: { exerciseName: 'Lunge', body: 'Set 1 of 1 · 20 kg × 12' },
    })
  })

  it('ignores a rest deadline that has already passed', () => {
    const s = session([exercise('Squat', [set()])], { restEndsAt: NOW - 1, restExerciseIndex: 0 })
    expect(buildSessionNotification(s, t, NOW)).toMatchObject({ restEndsAt: null, afterRest: null })
  })

  it('uses the session name when there are no exercises', () => {
    expect(buildSessionNotification(session([]), t, NOW)).toMatchObject({
      exerciseName: null,
      title: 'Push day',
      body: '',
    })
  })
})
