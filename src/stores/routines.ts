import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parseRoutineText, type ParseResult } from '@/lib/parseRoutine'

/** A `.wtt` routine as stored in the library. Raw text is the source of truth. */
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

function readStored(): StoredRoutine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
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

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

  /** In the user's chosen order (drag to reorder); newest additions land last. */
  const list = computed(() => routines.value)

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
    return routine ? parseRoutineText(routine.rawText) : undefined
  }

  /**
   * Adds a routine after checking it parses.
   *
   * @throws The parser's error message if `rawText` is not a valid `.wtt`.
   */
  function add(rawText: string, filename: string): StoredRoutine {
    const result = parseRoutineText(rawText)
    if (!result.ok) throw new Error(result.error)

    const routine: StoredRoutine = {
      id: newId(),
      filename: filename.trim() || `${result.routine.name || 'routine'}.wtt`,
      rawText,
      addedAt: Date.now(),
    }
    routines.value.push(routine)
    return routine
  }

  /**
   * Replaces a routine's text in place after checking it parses.
   *
   * @throws The parser's error message, or if no routine has that id.
   */
  function update(id: string, rawText: string): StoredRoutine {
    const result = parseRoutineText(rawText)
    if (!result.ok) throw new Error(result.error)

    const routine = routines.value.find((r) => r.id === id)
    if (!routine) throw new Error('That routine is no longer in your library.')

    routine.rawText = rawText
    return routine
  }

  function remove(id: string) {
    routines.value = routines.value.filter((r) => r.id !== id)
  }

  /**
   * Reorders the library to match `orderedIds`. Ids not present are dropped from
   * the ordering hint but kept (appended in their existing order), and unknown
   * ids are ignored, so a stale list from the UI can't lose routines.
   */
  function reorder(orderedIds: string[]) {
    const byId = new Map(routines.value.map((r) => [r.id, r]))
    const next: StoredRoutine[] = []
    for (const id of orderedIds) {
      const routine = byId.get(id)
      if (routine) {
        next.push(routine)
        byId.delete(id)
      }
    }
    for (const routine of byId.values()) next.push(routine)
    routines.value = next
  }

  return { routines, list, getById, findByText, parsed, add, update, remove, reorder }
})
