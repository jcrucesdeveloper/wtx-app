import { describe, it, expect } from 'vitest'
import { WorkoutParser } from '../wtx'
import { parseTemplateText } from '../parseRoutine'

const PUSH_DAY = `# Push Day
unit: kg
description: Chest, shoulders, and triceps.

Warm up | time 1m30s
Bench Press | reps 4x8 | 60 | rest 1m30s
Lateral Raise | reps 3x15 | 8 | rest 1m
`

describe('vendored wtx parser', () => {
  it('parses a .wtt template', () => {
    const t = WorkoutParser.parseTemplate(PUSH_DAY)
    expect(t.name).toBe('Push Day')
    expect(t.unit).toBe('kg')
    expect(t.notes).toBe('Chest, shoulders, and triceps.')
    expect(t.exerciseCount).toBe(3)

    const warmup = t.exercises[0]!
    const bench = t.exercises[1]!
    expect(warmup.kind).toBe('time')
    expect(warmup.durationSeconds).toBe(90)
    expect(bench.kind).toBe('reps')
    expect(bench.sets).toBe(4)
    expect(bench.targetReps).toBe(8)
    expect(bench.targetWeight).toBe(60)
    expect(bench.restSeconds).toBe(90)
  })

  it('derives totals', () => {
    const t = WorkoutParser.parseTemplate(PUSH_DAY)
    // 90s warm-up + 4×90s + 3×60s rest
    expect(t.totalTime).toBe(90 + 4 * 90 + 3 * 60)
    expect(t.estimatedVolume).toBe(4 * 8 * 60 + 3 * 15 * 8)
  })
})

describe('parseTemplateText', () => {
  it('returns ok for valid input', () => {
    const result = parseTemplateText(PUSH_DAY)
    expect(result.ok).toBe(true)
  })

  it('returns the parser error for invalid input', () => {
    const result = parseTemplateText('Bench Press | reps 4x8')
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/name line/) })
  })
})
