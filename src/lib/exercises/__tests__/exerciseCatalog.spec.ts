import { describe, it, expect } from 'vitest'
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  filterExerciseCatalog,
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
    expect(results.some((entry) => entry.name === 'Bench Press (Medium Grip)')).toBe(true)
  })

  it('ranks a name-starts-with match above a mid-string match', () => {
    const results = searchExerciseCatalog('squat', 100)
    const squatJerk = results.findIndex((entry) => entry.name === 'Squat Jerk')
    const gobletSquat = results.findIndex((entry) => entry.name === 'Goblet Squat')
    expect(squatJerk).toBeGreaterThanOrEqual(0)
    expect(gobletSquat).toBeGreaterThanOrEqual(0)
    expect(squatJerk).toBeLessThan(gobletSquat)
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
    const groupMatch = results.findIndex((entry) => entry.name === 'Squat')
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

  it('gives every entry a non-empty Spanish name', () => {
    expect(EXERCISE_CATALOG.every((entry) => entry.nameEs.trim().length > 0)).toBe(true)
  })

  it('translates common lifts to natural Spanish', () => {
    expect(findCatalogEntryByName('Squat')?.nameEs).toBe('Sentadilla')
    expect(findCatalogEntryByName('Bench Press')?.nameEs).toBe('Press de Banca')
    expect(findCatalogEntryByName('Deadlift')?.nameEs).toBe('Peso Muerto')
  })

  it('translates equipment variants by combining the base translation with the equipment tag', () => {
    expect(findCatalogEntryByName('Bench Press (Dumbbell)')?.nameEs).toBe('Press de Banca (Mancuerna)')
    expect(findCatalogEntryByName('Bench Press (Machine)')?.nameEs).toBe('Press de Banca (Máquina)')
  })

  it('matches a Spanish query, surfacing the equivalent English exercise', () => {
    const results = searchExerciseCatalog('sentadilla', 100)
    expect(results.some((entry) => entry.name === 'Squat')).toBe(true)
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

describe('equipment buckets', () => {
  const equipmentOf = (name: string) => findCatalogEntryByName(name)?.equipment

  it('gives every entry a known equipment bucket', () => {
    expect(
      EXERCISE_CATALOG.every((entry) =>
        (EQUIPMENT_TYPES as readonly string[]).includes(entry.equipment),
      ),
    ).toBe(true)
  })

  it('uses every bucket at least once', () => {
    for (const type of EQUIPMENT_TYPES) {
      expect(EXERCISE_CATALOG.some((entry) => entry.equipment === type)).toBe(true)
    }
  })

  it('maps upstream equipment straight through', () => {
    expect(equipmentOf('Bench Press (Medium Grip)')).toBe('Barbell')
    expect(equipmentOf('Bench Press (Dumbbell)')).toBe('Dumbbell')
    expect(equipmentOf('Chest Press (Machine)')).toBe('Machine')
    expect(equipmentOf('Chest Press (Cable)')).toBe('Cable')
    expect(equipmentOf('Pistol Squat (Kettlebell)')).toBe('Kettlebell')
    expect(equipmentOf('Back Flyes (Band)')).toBe('Band')
    expect(equipmentOf('Pushups')).toBe('Bodyweight')
  })

  it('folds EZ-bar into Barbell and niche gear into Other', () => {
    expect(equipmentOf('Close-Grip EZ Bar Curl')).toBe('Barbell')
    expect(equipmentOf('Medicine Ball Chest Pass')).toBe('Other')
    expect(equipmentOf('Exercise Ball Crunch')).toBe('Other')
    expect(equipmentOf('Hamstring-SMR')).toBe('Other')
  })

  it("resolves upstream's untagged/\"other\" entries from the name", () => {
    expect(equipmentOf('Trap Bar Deadlift')).toBe('Barbell')
    expect(equipmentOf('Band Assisted Pull-Up')).toBe('Band')
    expect(equipmentOf('Sled Push')).toBe('Other')
    expect(equipmentOf("Farmer's Walk")).toBe('Other')
    expect(equipmentOf('Parallel Bar Dip')).toBe('Bodyweight')
    expect(equipmentOf('Muscle Up')).toBe('Bodyweight')
    expect(equipmentOf("Child's Pose")).toBe('Bodyweight')
  })

  it('treats Smith machine lifts as Machine even where upstream says barbell', () => {
    expect(equipmentOf('Smith Incline Shoulder Raise')).toBe('Machine')
    expect(equipmentOf('Squat (Smith Machine)')).toBe('Machine')
  })
})

describe('filterExerciseCatalog', () => {
  it('returns the whole catalog, alphabetically, with no filters', () => {
    const { results, total } = filterExerciseCatalog({}, 10)
    expect(total).toBe(EXERCISE_CATALOG.length)
    expect(results).toEqual(EXERCISE_CATALOG.slice(0, 10))
  })

  it('filters by muscle group alone, across the whole catalog', () => {
    const { results, total } = filterExerciseCatalog({ muscleGroup: 'Neck' }, 1000)
    expect(total).toBeGreaterThan(0)
    expect(results).toHaveLength(total)
    expect(results.every((entry) => entry.muscleGroup === 'Neck')).toBe(true)
  })

  it('filters by equipment alone', () => {
    const { results } = filterExerciseCatalog({ equipment: 'Cable' }, 1000)
    expect(results.length).toBe(EXERCISE_CATALOG.filter((e) => e.equipment === 'Cable').length)
    expect(results.every((entry) => entry.equipment === 'Cable')).toBe(true)
  })

  it('ANDs muscle group, equipment and query together', () => {
    const { results, total } = filterExerciseCatalog(
      { query: 'press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
      1000,
    )
    expect(total).toBeGreaterThan(0)
    expect(results.some((entry) => entry.name === 'Bench Press (Dumbbell)')).toBe(true)
    expect(
      results.every(
        (entry) =>
          entry.muscleGroup === 'Chest' &&
          entry.equipment === 'Dumbbell' &&
          /press/i.test(entry.name + entry.nameEs),
      ),
    ).toBe(true)
    expect(results.some((entry) => entry.name === 'Bench Press (Machine)')).toBe(false)
  })

  it('reports the total beyond the limit', () => {
    const { results, total } = filterExerciseCatalog({ equipment: 'Barbell' }, 5)
    expect(results).toHaveLength(5)
    expect(total).toBeGreaterThan(5)
  })

  it('returns nothing when filters exclude every exercise', () => {
    expect(filterExerciseCatalog({ muscleGroup: 'Neck', equipment: 'Kettlebell' })).toEqual({
      results: [],
      total: 0,
    })
  })

  it('matches an equipment name typed into the search', () => {
    const { results } = filterExerciseCatalog({ query: 'kettlebell' }, 1000)
    // Kettlebell exercise without "kettlebell" in its name.
    expect(results.some((entry) => entry.name === 'Goblet Squat')).toBe(true)
  })

  it('matches Spanish muscle-group and equipment words', () => {
    const legs = filterExerciseCatalog({ query: 'piernas' }, 1000).results
    expect(legs.some((entry) => entry.name === 'Squat')).toBe(true)
    const dumbbell = filterExerciseCatalog({ query: 'mancuerna' }, 1000).results
    expect(dumbbell.some((entry) => entry.name === 'Goblet Squat')).toBe(false)
    expect(
      dumbbell.filter((entry) => entry.equipment === 'Dumbbell').length,
    ).toBe(EXERCISE_CATALOG.filter((entry) => entry.equipment === 'Dumbbell').length)
  })

  it('ignores accents in the query', () => {
    const { results } = filterExerciseCatalog({ query: 'maquina' }, 1000)
    expect(results.some((entry) => entry.name === 'Bench Press (Machine)')).toBe(true)
  })
})
