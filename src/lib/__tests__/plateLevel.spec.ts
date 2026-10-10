import { describe, expect, it } from 'vitest'
import { PLATE_STEPS, countWorkoutDays, plateLevel } from '@/lib/plateLevel'

describe('countWorkoutDays', () => {
  it('counts each day once, however many workouts it has', () => {
    expect(countWorkoutDays(['2026-10-01', '2026-10-01', '2026-10-03'])).toBe(2)
  })

  it('is zero with no workouts', () => {
    expect(countWorkoutDays([])).toBe(0)
  })
})

describe('plateLevel', () => {
  it('has no plate before the first workout, and one workout to go', () => {
    const level = plateLevel(0)
    expect(level.current).toBeNull()
    expect(level.next).toEqual({ at: 1, kg: 5, count: 1 })
    expect(level.remaining).toBe(1)
    expect(level.progress).toBe(0)
  })

  it('earns the white plate on the first workout', () => {
    const level = plateLevel(1)
    expect(level.current?.kg).toBe(5)
    expect(level.next?.kg).toBe(10)
    expect(level.remaining).toBe(9)
  })

  it('moves to each plate exactly at its threshold', () => {
    expect(plateLevel(9).current?.kg).toBe(5)
    expect(plateLevel(10).current?.kg).toBe(10)
    expect(plateLevel(25).current?.kg).toBe(15)
    expect(plateLevel(50).current?.kg).toBe(20)
    expect(plateLevel(100).current).toEqual({ at: 100, kg: 25, count: 1 })
  })

  it('stacks red plates past the first one', () => {
    expect(plateLevel(199).current?.count).toBe(1)
    expect(plateLevel(200).current?.count).toBe(2)
    expect(plateLevel(365).current?.count).toBe(3)
    expect(plateLevel(500).current?.count).toBe(4)
  })

  it('reports progress between two steps', () => {
    const level = plateLevel(75)
    expect(level.current?.kg).toBe(20)
    expect(level.remaining).toBe(25)
    expect(level.progress).toBe(0.5)
  })

  it('has nothing left to earn at the last step', () => {
    const last = PLATE_STEPS[PLATE_STEPS.length - 1]!
    const level = plateLevel(last.at + 50)
    expect(level.current).toEqual(last)
    expect(level.next).toBeNull()
    expect(level.remaining).toBe(0)
    expect(level.progress).toBe(1)
  })

  it('never goes down as the count rises', () => {
    let previous = 0
    for (let days = 0; days <= 1100; days++) {
      const level = plateLevel(days)
      const rank = level.current ? PLATE_STEPS.indexOf(level.current) + 1 : 0
      expect(rank).toBeGreaterThanOrEqual(previous)
      previous = rank
    }
  })
})
