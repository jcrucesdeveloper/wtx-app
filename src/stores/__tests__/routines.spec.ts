import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { REMOVE_UNDO_MS, RoutineLimitError, useRoutinesStore } from '@/stores/routines'
import { ROUTINE_MAX, ROUTINE_WARN_AT } from '@/lib/supabase/limits'
import { buildDataExportZip } from '@/lib/exportData'

const FAVORITES_KEY = 'wtx:routineFavorites'
const TEXT = (name: string) => `# ${name}\nunit: kg\n\nSquat | reps 3x5 | 100\n`

/** A fresh store over whatever is in storage — what an app restart does. */
function restart() {
  setActivePinia(createPinia())
  return useRoutinesStore()
}

describe('routines store: favourites', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wtx:routines', '[]')
    setActivePinia(createPinia())
  })

  it('marks and unmarks a routine', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')

    store.toggleFavorite(legs.id)
    expect(store.isFavorite(legs.id)).toBe(true)

    store.toggleFavorite(legs.id)
    expect(store.isFavorite(legs.id)).toBe(false)
  })

  it('ignores a routine that is not in the library', () => {
    const store = useRoutinesStore()
    store.toggleFavorite('nope')
    expect(store.favoriteIds).toEqual([])
  })

  it('survives an app restart', async () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    store.toggleFavorite(legs.id)
    await nextTick()

    expect(restart().isFavorite(legs.id)).toBe(true)
  })

  it('cleans up the flag when the routine is deleted', async () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    store.toggleFavorite(legs.id)
    store.toggleFavorite(push.id)

    store.remove(legs.id)
    await nextTick()

    expect(store.favoriteIds).toEqual([push.id])
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([push.id])
  })

  it('leaves nothing in storage once the last favourite is gone', async () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    store.toggleFavorite(legs.id)
    await nextTick()
    store.remove(legs.id)
    await nextTick()

    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull()
  })

  it('drops every flag when the library is wiped or reset', () => {
    const store = useRoutinesStore()
    store.toggleFavorite(store.add(TEXT('Legs'), 'legs.wtt').id)
    store.resetToDefaults()
    expect(store.favoriteIds).toEqual([])

    store.toggleFavorite(store.list[0]!.id)
    store.clear()
    expect(store.favoriteIds).toEqual([])
  })

  it('follows a routine whose id is rewritten, and drops one deleted elsewhere', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    store.toggleFavorite(legs.id)
    store.toggleFavorite(push.id)

    store.applyRemote([{ ...legs, id: 'new-legs' }], { [legs.id]: 'new-legs' })

    expect(store.favoriteIds).toEqual(['new-legs'])
  })

  it('keeps the flag off the routine itself, so it cannot be synced, shared or exported', async () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    store.toggleFavorite(legs.id)
    await nextTick()

    expect(Object.keys(store.getById(legs.id)!).sort()).toEqual(['addedAt', 'filename', 'id', 'rawText'])
    expect(store.getById(legs.id)!.rawText).toBe(TEXT('Legs'))
    expect(localStorage.getItem('wtx:routines')).not.toMatch(/favou?rite/i)

    const zip = new TextDecoder('latin1').decode(buildDataExportZip(store.routines, []))
    expect(zip).not.toMatch(/favou?rite/i)
  })
})

describe('routines store: sections', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wtx:routines', '[]')
    setActivePinia(createPinia())
  })

  it('starts with none, so a new library shows no sections', () => {
    expect(useRoutinesStore().sections).toEqual([])
  })

  it('creates, renames, recolours and orders sections', () => {
    const store = useRoutinesStore()
    const ppl = store.addSection('  Push   Pull  Legs ')
    const cardio = store.addSection('Cardio', '#F59E0B')
    expect(ppl.name).toBe('Push Pull Legs')
    expect(cardio.color).toBe('#f59e0b')
    // Each new section gets a colour no other section has yet.
    expect(ppl.color).not.toBe(cardio.color)

    store.updateSection(ppl.id, { name: 'PPL', color: '#06b6d4' })
    store.updateSection(ppl.id, { name: '   ', color: 'not a colour' })
    expect(store.getSection(ppl.id)).toMatchObject({ name: 'PPL', color: '#06b6d4' })

    store.reorderSections([cardio, ppl])
    expect(store.sections.map((s) => s.name)).toEqual(['Cardio', 'PPL'])
  })

  it('refuses a blank name and caps a long one', () => {
    const store = useRoutinesStore()
    expect(() => store.addSection('   ')).toThrow('A section needs a name.')
    expect(store.addSection('x'.repeat(100)).name).toHaveLength(40)
  })

  it('files a routine under a section and takes it out again', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const ppl = store.addSection('PPL')

    store.moveToSection(legs.id, ppl.id)
    expect(store.sectionOf(legs.id)?.id).toBe(ppl.id)

    store.moveToSection(legs.id, 'missing')
    expect(store.sectionOf(legs.id)).toBeUndefined()
  })

  it('a routine can be a favourite and in a section at once', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const ppl = store.addSection('PPL')
    store.moveToSection(legs.id, ppl.id)
    store.toggleFavorite(legs.id)
    expect(store.isFavorite(legs.id)).toBe(true)
    expect(store.sectionOf(legs.id)?.id).toBe(ppl.id)
  })

  it('deleting a section keeps its routines, unsorted', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const ppl = store.addSection('PPL')
    store.moveToSection(legs.id, ppl.id)

    store.removeSection(ppl.id)
    expect(store.sections).toEqual([])
    expect(store.getById(legs.id)).toBeDefined()
    expect(store.getById(legs.id)?.sectionId).toBeUndefined()
  })

  it('applies a drag-and-drop layout in one go', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const pull = store.add(TEXT('Pull'), 'pull.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    const ppl = store.addSection('PPL')

    store.arrange([
      { sectionId: ppl.id, routineIds: [legs.id, push.id] },
      { sectionId: null, routineIds: [pull.id] },
    ])
    expect(store.list.map((r) => r.id)).toEqual([legs.id, push.id, pull.id])
    expect(store.list.map((r) => r.sectionId)).toEqual([ppl.id, ppl.id, undefined])
  })

  it('survives an app restart', async () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const ppl = store.addSection('PPL', '#10b981')
    store.moveToSection(legs.id, ppl.id)
    await nextTick()

    const again = restart()
    expect(again.sections).toEqual([ppl])
    expect(again.sectionOf(legs.id)?.name).toBe('PPL')
  })

  it('a data reset clears the sections too', () => {
    const store = useRoutinesStore()
    store.addSection('PPL')
    store.resetToDefaults()
    expect(store.sections).toEqual([])
  })

  it('a synced copy moves routines to the renamed section and unfiles the dropped ones', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    const a = store.addSection('A')
    const b = store.addSection('B')
    store.moveToSection(legs.id, a.id)
    store.moveToSection(push.id, b.id)

    store.applyRemoteSections([{ ...a, id: 'remote-a' }], { [a.id]: 'remote-a' })
    expect(store.getById(legs.id)?.sectionId).toBe('remote-a')
    expect(store.getById(push.id)?.sectionId).toBeUndefined()
  })
})

describe('routines store: limit', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function fill(count: number) {
    localStorage.setItem(
      'wtx:routines',
      JSON.stringify(
        Array.from({ length: count }, (_, i) => ({ id: `r${i}`, filename: `r${i}.wtt`, rawText: TEXT(`R${i}`), addedAt: i })),
      ),
    )
    return restart()
  }

  it('warns near the cap and refuses a routine past it', () => {
    const store = fill(ROUTINE_WARN_AT - 1)
    expect(store.nearLimit).toBe(false)
    store.add(TEXT('One more'), '')
    expect(store.nearLimit).toBe(true)

    const full = fill(ROUTINE_MAX)
    expect(full.canAdd).toBe(false)
    expect(() => full.add(TEXT('Too many'), '')).toThrow(RoutineLimitError)
    expect(() => full.add(TEXT('Too many'), '')).toThrow(String(ROUTINE_MAX))
    expect(full.list).toHaveLength(ROUTINE_MAX)

    full.remove('r0')
    expect(full.canAdd).toBe(true)
    expect(() => full.add(TEXT('Fits again'), '')).not.toThrow()
  })
})

describe('routines store: undoable delete', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('wtx:routines', '[]')
    setActivePinia(createPinia())
  })

  it('deletes at once and puts the routine back where it was, with its star and section', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const pull = store.add(TEXT('Pull'), 'pull.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    const ppl = store.addSection('PPL')
    store.moveToSection(pull.id, ppl.id)
    store.toggleFavorite(pull.id)

    store.remove(pull.id)
    expect(store.list.map((r) => r.id)).toEqual([push.id, legs.id])
    expect(store.isFavorite(pull.id)).toBe(false)
    expect(store.removed?.routine.id).toBe(pull.id)

    store.restore()
    expect(store.list.map((r) => r.id)).toEqual([push.id, pull.id, legs.id])
    expect(store.isFavorite(pull.id)).toBe(true)
    expect(store.sectionOf(pull.id)?.id).toBe(ppl.id)
    expect(store.removed).toBeNull()
  })

  it('lets the undo go after a few seconds', () => {
    vi.useFakeTimers()
    try {
      const store = useRoutinesStore()
      const legs = store.add(TEXT('Legs'), 'legs.wtt')
      store.remove(legs.id)
      vi.advanceTimersByTime(REMOVE_UNDO_MS - 1)
      expect(store.removed).not.toBeNull()
      vi.advanceTimersByTime(1)
      expect(store.removed).toBeNull()
      store.restore()
      expect(store.getById(legs.id)).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers back only the last delete', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const push = store.add(TEXT('Push'), 'push.wtt')
    store.remove(legs.id)
    store.remove(push.id)
    store.restore()
    expect(store.list.map((r) => r.id)).toEqual([push.id])
  })

  it('restores unfiled when its section went meanwhile', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    const ppl = store.addSection('PPL')
    store.moveToSection(legs.id, ppl.id)
    store.remove(legs.id)
    store.removeSection(ppl.id)
    store.restore()
    expect(store.getById(legs.id)?.sectionId).toBeUndefined()
  })

  it('adding a routine drops the undo, so the library never outgrows what it was', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    store.remove(legs.id)
    const push = store.add(TEXT('Push'), 'push.wtt')
    expect(store.removed).toBeNull()
    store.restore()
    expect(store.list.map((r) => r.id)).toEqual([push.id])
  })

  it('a reset drops the undo', () => {
    const store = useRoutinesStore()
    const legs = store.add(TEXT('Legs'), 'legs.wtt')
    store.remove(legs.id)
    store.clear()
    store.restore()
    expect(store.list).toEqual([])
  })
})
