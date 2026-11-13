import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActiveSessionStore } from '@/stores/activeSession'
import { WorkoutParser } from '@/lib/wtx'
import type { StoredRoutine } from '@/stores/routines'

vi.mock('@/services/haptics', () => ({
  HapticsService: {
    restOver: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    light: vi.fn<() => void>(),
    medium: vi.fn<() => void>(),
    selection: vi.fn<() => void>(),
  },
}))
vi.mock('@/services/restSound', () => ({ RestSoundService: { restEnded: vi.fn<() => void>() } }))

const ROUTINE = { id: 'r1', filename: 'push-day.wtt' } as StoredRoutine

const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
Overhead Press | reps 2x10 | 30
`

function startWorkout() {
  const store = useActiveSessionStore()
  store.start(ROUTINE, WorkoutParser.parseTemplate(TEMPLATE))
  return store
}

function setIds(store: ReturnType<typeof useActiveSessionStore>, index: number) {
  return store.session!.draft.exercises[index]!.loggedSets.map((s) => s.id)
}

describe('activeSession startRestNow', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the rest after the last logged set, at the exercise’s length', () => {
    const store = startWorkout()
    const [first, second] = setIds(store, 0)
    store.completeSet(0, first!)
    store.completeSet(0, second!)
    store.skipRestTimer()

    expect(store.manualRestSetId(0)).toBe(second)
    store.startRestNow(0)
    expect(store.session!.restSetId).toBe(second)
    expect(store.session!.restExerciseIndex).toBe(0)
    expect(store.session!.restDurationSeconds).toBe(90)
    expect(store.restRemainingSeconds).toBe(90)
  })

  it('skips a set taken back: the rest follows the last one still logged', () => {
    const store = startWorkout()
    const [first, second] = setIds(store, 0)
    store.completeSet(0, first!)
    store.completeSet(0, second!)
    store.uncompleteSet(0, second!)
    store.skipRestTimer()

    store.startRestNow(0)
    expect(store.session!.restSetId).toBe(first)
  })

  it('does nothing while a rest is running', () => {
    const store = startWorkout()
    const [first] = setIds(store, 0)
    store.completeSet(0, first!)
    vi.advanceTimersByTime(30_000)
    const endsAt = store.session!.restEndsAt

    expect(store.manualRestSetId(0)).toBeNull()
    store.startRestNow(0)
    expect(store.session!.restEndsAt).toBe(endsAt)
  })

  it('does nothing before any set is logged', () => {
    const store = startWorkout()
    expect(store.manualRestSetId(0)).toBeNull()
    store.startRestNow(0)
    expect(store.session!.restEndsAt).toBeNull()
  })

  it('does nothing for an exercise with its rest off', () => {
    const store = startWorkout()
    const [first] = setIds(store, 1)
    store.completeSet(1, first!)

    expect(store.manualRestSetId(1)).toBeNull()
    store.startRestNow(1)
    expect(store.session!.restEndsAt).toBeNull()
  })
})
