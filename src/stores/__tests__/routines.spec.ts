import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { useRoutinesStore } from '@/stores/routines'
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
