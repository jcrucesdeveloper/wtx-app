import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { newUuid } from '@/lib/uuid'
import { parseTemplateText, type ParseResult } from '@/lib/parseRoutine'
import { DEFAULT_TEMPLATES } from '@/lib/wtx/defaultTemplates'
import { warmExerciseImages } from '@/lib/exercises/imageCache'
import { track } from '@/services/analytics'

/** A `.wtt` template as stored in the library. Raw text is the source of truth. */
export interface StoredRoutine {
  id: string
  /** Original file name, or a generated one for pasted text. */
  filename: string
  /** Verbatim file contents — re-parsed on demand, never mutated. */
  rawText: string
  /** Epoch millis when it was added. */
  addedAt: number
}

const STORAGE_KEY = 'wtx:routines'

/**
 * Which routines are favourites, as a list of ids under its own key. It is a
 * fact about this device, not about the routine: kept out of
 * {@link StoredRoutine} so it can never ride along into sync, an export or a
 * shared routine, all of which are built from the routine itself.
 */
const FAVORITES_KEY = 'wtx:routineFavorites'

function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** The starter library for a visitor who has never had anything in storage. */
function defaultRoutines(): StoredRoutine[] {
  const now = Date.now()
  const routines = DEFAULT_TEMPLATES.map((template, index) => ({
    id: newUuid(),
    filename: template.filename,
    rawText: template.rawText,
    addedAt: now + index,
  }))
  // DEFAULT_TEMPLATES is alphabetical (leg, pull, push); reverse for Push/Pull/Leg display order.
  return routines.reverse()
}

function readStored(): StoredRoutine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaultRoutines()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is StoredRoutine =>
        r &&
        typeof r.id === 'string' &&
        typeof r.filename === 'string' &&
        typeof r.rawText === 'string' &&
        typeof r.addedAt === 'number',
    )
  } catch {
    return []
  }
}

export const useRoutinesStore = defineStore('routines', () => {
  const routines = ref<StoredRoutine[]>(readStored())

  watch(
    routines,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* storage unavailable — keep the in-memory list */
      }
    },
    { deep: true },
  )

  /** Warms the on-device image cache for every exercise across the library, on init and on any change. */
  watch(
    routines,
    (value) => {
      const names = value.flatMap((r) => {
        const result = parseTemplateText(r.rawText)
        return result.ok ? result.template.exercises.map((e) => e.name) : []
      })
      void warmExerciseImages(names)
    },
    { deep: true, immediate: true },
  )

  const favoriteIds = ref<string[]>(readFavorites())

  watch(
    favoriteIds,
    (value) => {
      try {
        if (value.length) localStorage.setItem(FAVORITES_KEY, JSON.stringify(value))
        else localStorage.removeItem(FAVORITES_KEY)
      } catch {
        /* storage unavailable — keep the in-memory flags */
      }
    },
    { deep: true },
  )

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }

  /** Marks a routine as a favourite, or unmarks it. On this device only. */
  function toggleFavorite(id: string) {
    if (isFavorite(id)) favoriteIds.value = favoriteIds.value.filter((f) => f !== id)
    else if (getById(id)) favoriteIds.value = [...favoriteIds.value, id]
  }

  /** A flag never outlives its routine. */
  function pruneFavorites() {
    const ids = new Set(routines.value.map((r) => r.id))
    if (favoriteIds.value.some((id) => !ids.has(id))) {
      favoriteIds.value = favoriteIds.value.filter((id) => ids.has(id))
    }
  }

  /** Display order — newest first by default, but user-reorderable via {@link reorder}. */
  const list = computed(() => routines.value)

  /** Replaces the display order, e.g. after a drag-and-drop reorder. */
  function reorder(newOrder: StoredRoutine[]) {
    routines.value = newOrder
  }

  function getById(id: string): StoredRoutine | undefined {
    return routines.value.find((r) => r.id === id)
  }

  /** An existing routine with byte-identical text, if one is already stored. */
  function findByText(rawText: string): StoredRoutine | undefined {
    return routines.value.find((r) => r.rawText === rawText)
  }

  /** Parse a stored routine's text (or return the parser error). */
  function parsed(id: string): ParseResult | undefined {
    const routine = getById(id)
    return routine ? parseTemplateText(routine.rawText) : undefined
  }

  /**
   * Adds a routine after checking it parses.
   *
   * @throws The parser's error message if `rawText` is not a valid `.wtt`.
   */
  function add(rawText: string, filename: string): StoredRoutine {
    const result = parseTemplateText(rawText)
    if (!result.ok) throw new Error(result.error)

    const routine: StoredRoutine = {
      id: newUuid(),
      filename: filename.trim() || `${result.template.name || 'routine'}.wtt`,
      rawText,
      addedAt: Date.now(),
    }
    routines.value.unshift(routine)
    track('routine_created')
    return routine
  }

  /**
   * Replaces a routine's text in place after checking it parses.
   *
   * @throws The parser's error message, or if no routine has that id.
   */
  function update(id: string, rawText: string): StoredRoutine {
    const result = parseTemplateText(rawText)
    if (!result.ok) throw new Error(result.error)

    const routine = routines.value.find((r) => r.id === id)
    if (!routine) throw new Error('That routine is no longer in your library.')

    routine.rawText = rawText
    return routine
  }

  function remove(id: string) {
    routines.value = routines.value.filter((r) => r.id !== id)
    pruneFavorites()
  }

  /** Wipes the whole library, e.g. for a full data reset. Does not reseed defaults. */
  function clear() {
    routines.value = []
    pruneFavorites()
  }

  /** Wipes the library and reseeds the starter routines, so the user is never left with none. */
  function resetToDefaults() {
    routines.value = defaultRoutines()
    pruneFavorites()
  }

  /**
   * Replaces the library with a synced copy. Only the sync layer calls this —
   * it's the one action the sync store doesn't treat as a local change.
   *
   * @param renamedIds Old id → new id, when the copy is the same library with
   *   ids rewritten, so a favourite follows its routine to the new id.
   */
  function applyRemote(next: StoredRoutine[], renamedIds: Record<string, string> = {}) {
    routines.value = next
    favoriteIds.value = favoriteIds.value.map((id) => renamedIds[id] ?? id)
    // A routine deleted on another device takes its flag with it here too.
    pruneFavorites()
  }

  return {
    routines,
    list,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    getById,
    findByText,
    parsed,
    add,
    update,
    remove,
    reorder,
    clear,
    resetToDefaults,
    applyRemote,
  }
})
