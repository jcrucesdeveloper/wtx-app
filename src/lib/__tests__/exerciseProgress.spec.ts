import { describe, it, expect } from 'vitest'
import { estimatedOneRepMax, exerciseProgress, PROGRESS_SESSIONS } from '../exerciseProgress'
import { parseSessionText } from '../parseSession'
import type { WorkoutSession } from '../wtx'

function parse(text: string): WorkoutSession {
  const result = parseSessionText(text)
  if (!result.ok) throw new Error(result.error)
  return result.session
}

const bench = (date: string, sets: string, unit = 'kg') =>
  parse(`# Push - ${date}
unit: ${unit}

Bench Press | 3x8 | 60
${sets}
`)

describe('estimatedOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimatedOneRepMax(100, 5)).toBe(116.7)
    expect(estimatedOneRepMax(60, 10)).toBe(80)
  })

  it('returns the weight itself for a single', () => {
    expect(estimatedOneRepMax(140, 1)).toBe(140)
  })

  it('gives nothing for zero weight or reps', () => {
    expect(estimatedOneRepMax(0, 10)).toBe(0)
    expect(estimatedOneRepMax(100, 0)).toBe(0)
  })
})

describe('exerciseProgress', () => {
  it('keeps the best estimated 1RM per session, oldest first', () => {
    const progress = exerciseProgress(
      [
        bench('2026-09-08', '1 | 70 | 5\n2 | 65 | 8'),
        bench('2026-09-01', '1 | 60 | 8\n2 | 60 | 6'),
      ],
      'Bench Press',
    )
    expect(progress.metric).toBe('e1rm')
    expect(progress.points.map((p) => p.date)).toEqual(['2026-09-01', '2026-09-08'])
    expect(progress.points[0]).toMatchObject({ value: 76, topSet: { weight: 60, reps: 8 }, unit: 'kg' })
    // 65 × 8 (82.3) beats 70 × 5 (81.7) on estimated max.
    expect(progress.points[1]).toMatchObject({ value: 82.3, topSet: { weight: 65, reps: 8 } })
  })

  it('matches the exercise name case- and space-insensitively', () => {
    const progress = exerciseProgress([bench('2026-09-01', '1 | 60 | 8')], '  bench PRESS ')
    expect(progress.points).toHaveLength(1)
  })

  it('skips warm-ups and zero-weight sets', () => {
    const progress = exerciseProgress(
      [bench('2026-09-01', 'W | 100 | 5\n1 | 0 | 20\n2 | 60 | 8')],
      'Bench Press',
    )
    expect(progress.points[0]?.topSet).toEqual({ weight: 60, reps: 8 })
  })

  it('leaves out a session whose sets carry no weight', () => {
    const progress = exerciseProgress([bench('2026-09-01', '1 | 0 | 12')], 'Bench Press')
    expect(progress.points).toEqual([])
  })

  it(`keeps only the last ${PROGRESS_SESSIONS} sessions`, () => {
    const sessions = Array.from({ length: 15 }, (_, i) =>
      bench(`2026-09-${String(i + 1).padStart(2, '0')}`, `1 | ${50 + i} | 5`),
    )
    const progress = exerciseProgress(sessions, 'Bench Press')
    expect(progress.points).toHaveLength(PROGRESS_SESSIONS)
    expect(progress.points[0]?.date).toBe('2026-09-04')
    expect(progress.points[progress.points.length - 1]?.date).toBe('2026-09-15')
  })

  it('carries each session’s own unit', () => {
    const progress = exerciseProgress(
      [bench('2026-09-01', '1 | 60 | 8'), bench('2026-09-02', '1 | 135 | 8', 'lb')],
      'Bench Press',
    )
    expect(progress.points.map((p) => p.unit)).toEqual(['kg', 'lb'])
  })

  it('plots the longest hold in seconds for a timed exercise', () => {
    const plank = (date: string, sets: string) =>
      parse(`# Core - ${date}
unit: kg

Plank | 3x60 | 0 | time
${sets}
`)
    const progress = exerciseProgress(
      [plank('2026-09-01', '1 | 0 | 60\n2 | 0 | 75'), plank('2026-09-03', '1 | 0 | 90')],
      'Plank',
    )
    expect(progress.metric).toBe('seconds')
    expect(progress.points.map((p) => p.value)).toEqual([75, 90])
  })

  it('returns no points for an exercise never logged', () => {
    expect(exerciseProgress([bench('2026-09-01', '1 | 60 | 8')], 'Squat').points).toEqual([])
  })
})
