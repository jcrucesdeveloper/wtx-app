import { describe, it, expect } from 'vitest'
import {
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  findCatalogEntryByName,
  searchExerciseCatalog,
} from '../exerciseCatalog'

describe('searchExerciseCatalog', () => {
  it('returns a capped alphabetical slice for an empty query', () => {
    const results = searchExerciseCatalog('', 10)
    expect(results).toHaveLength(10)
    expect(results).toEqual(EXERCISE_CATALOG.slice(0, 10))
  })

  it('matches case-insensitively', () => {
    const results = searchExerciseCatalog('bench press')
    expect(results.some((entry) => entry.name === 'Barbell Bench Press - Medium Grip')).toBe(true)
  })

  it('ranks a name-starts-with match above a mid-string match', () => {
    const results = searchExerciseCatalog('squat', 100)
    const squatJerk = results.findIndex((entry) => entry.name === 'Squat Jerk')
    const barbellSquat = results.findIndex((entry) => entry.name === 'Barbell Squat')
    expect(squatJerk).toBeGreaterThanOrEqual(0)
    expect(barbellSquat).toBeGreaterThanOrEqual(0)
    expect(squatJerk).toBeLessThan(barbellSquat)
  })

  it('respects the limit', () => {
    const results = searchExerciseCatalog('a', 5)
    expect(results).toHaveLength(5)
  })

  it('returns nothing for a query no exercise matches', () => {
    expect(searchExerciseCatalog('zzzznotanexercise')).toEqual([])
  })

  it('matches a muscle group, surfacing exercises with no matching name', () => {
    const results = searchExerciseCatalog('legs', 1000)
    // Legs-group exercise with no "legs" in its name.
    const groupMatch = results.findIndex((entry) => entry.name === 'Barbell Squat')
    // Non-Legs-group exercise that happens to say "legs" in its name.
    const nameMatch = results.findIndex(
      (entry) => entry.name === 'Kettlebell Pass Between The Legs',
    )
    expect(groupMatch).toBeGreaterThanOrEqual(0)
    expect(nameMatch).toBeGreaterThanOrEqual(0)
    expect(groupMatch).toBeLessThan(nameMatch)
  })

  it('ranks a muscle-group match above an unrelated name-includes match', () => {
    const results = searchExerciseCatalog('chest', 1000)
    // Chest-group exercise with no "chest" in its name.
    const groupMatch = results.findIndex((entry) => entry.name === 'Alternating Floor Press')
    // Non-Chest-group exercise that happens to say "chest" in its name.
    const nameMatch = results.findIndex((entry) => entry.name === 'Supine Chest Throw')
    expect(groupMatch).toBeGreaterThanOrEqual(0)
    expect(nameMatch).toBeGreaterThanOrEqual(0)
    expect(groupMatch).toBeLessThan(nameMatch)
  })

  it('gives every entry a known muscle group', () => {
    expect(
      EXERCISE_CATALOG.every((entry) =>
        (MUSCLE_GROUPS as readonly string[]).includes(entry.muscleGroup),
      ),
    ).toBe(true)
  })
})

describe('findCatalogEntryByName', () => {
  it('finds an exact match', () => {
    expect(findCatalogEntryByName('3/4 Sit-Up')?.id).toBe('3_4_Sit-Up')
  })

  it('matches case-insensitively', () => {
    expect(findCatalogEntryByName('3/4 sit-up')?.id).toBe('3_4_Sit-Up')
  })

  it('does not fuzzy-match a partial name', () => {
    expect(findCatalogEntryByName('Sit')).toBeUndefined()
  })

  it('returns undefined for a custom exercise name', () => {
    expect(findCatalogEntryByName('My Custom Exercise')).toBeUndefined()
  })

  it('returns undefined for an empty name', () => {
    expect(findCatalogEntryByName('  ')).toBeUndefined()
  })
})
