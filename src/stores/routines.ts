import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { newUuid } from '@/lib/uuid'
import { parseTemplateText, type ParseResult } from '@/lib/parseRoutine'
import { DEFAULT_TEMPLATES } from '@/lib/wtx/defaultTemplates'
import { warmExerciseImages } from '@/lib/exercises/imageCache'
import { track } from '@/services/analytics'
import { ACCENT_COLORS } from '@/config/theme'
import { SECTION_NAME_MAX } from '@/lib/supabase/limits'

/** A `.wtt` template as stored in the library. Raw text is the source of truth. */
export interface StoredRoutine {
  id: string
  /** Original file name, or a generated one for pasted text. */
  filename: string
  /** Verbatim file contents — re-parsed on demand, never mutated. */
  rawText: string
  /** Epoch millis when it was added. */
  addedAt: number
  /**
   * The {@link RoutineSection} it's filed under; unset means unsorted. Part of
   * the routine (unlike favourites) because sections are the account's
   * layout: they sync with the library, so every device shows the same one.
   */
  sectionId?: string
}

/** A user-made group of routines on the Train screen ("Push/Pull/Legs", "Deload"…). */
export interface RoutineSection {
  id: string
  name: string
  /** A `#rrggbb` from the theme palette. */
  color: string
  /** Epoch millis when it was created. */
  addedAt: number
}

const STORAGE_KEY = 'wtx:routines'
const SECTIONS_KEY = 'wtx:routineSections'
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function readSections(): RoutineSection[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is RoutineSection =>
        s &&
        typeof s.id === 'string' &&
        typeof s.name === 'string' &&
        typeof s.color === 'string' &&
        typeof s.addedAt === 'number',
    )
  } catch {
    return []
  }
}

/** A section name as stored: trimmed, single-spaced, within the server's cap. */
export function cleanSectionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, SECTION_NAME_MAX)
}

function cleanColor(color: string, fallback: string): string {
  return HEX_COLOR.test(color) ? color.toLowerCase() : fallback
}

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

  const sections = ref<RoutineSection[]>(readSections())

  watch(
    sections,
    (value) => {
      try {
        if (value.length) localStorage.setItem(SECTIONS_KEY, JSON.stringify(value))
        else localStorage.removeItem(SECTIONS_KEY)
      } catch {
        /* storage unavailable — keep the in-memory sections */
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

  /** A routine never points at a section that's gone (deleted here or on another device). */
  function pruneSectionIds() {
    const ids = new Set(sections.value.map((s) => s.id))
    for (const routine of routines.value) {
      if (routine.sectionId !== undefined && !ids.has(routine.sectionId)) delete routine.sectionId
    }
  }

  function getSection(id: string): RoutineSection | undefined {
    return sections.value.find((s) => s.id === id)
  }

  /** The section a routine is filed under, if any. */
  function sectionOf(routineId: string): RoutineSection | undefined {
    const sectionId = getById(routineId)?.sectionId
    return sectionId ? getSection(sectionId) : undefined
  }

  /**
   * The palette colour fewest sections use, so each new one stands apart. The
   * app's own accent comes last: it already means "the one thing to do".
   */
  function nextSectionColor(): string {
    const palette = [...ACCENT_COLORS.slice(1), ...ACCENT_COLORS.slice(0, 1)]
    const uses = (value: string) => sections.value.filter((s) => s.color === value).length
    return palette.reduce((best, c) => (uses(c.value) < uses(best.value) ? c : best)).value
  }

  /**
   * Adds a section at the end of the list.
   *
   * @throws If the name is blank.
   */
  function addSection(name: string, color?: string): RoutineSection {
    const clean = cleanSectionName(name)
    if (!clean) throw new Error('A section needs a name.')
    const fallback = nextSectionColor()
    const section: RoutineSection = {
      id: newUuid(),
      name: clean,
      color: color ? cleanColor(color, fallback) : fallback,
      addedAt: Date.now(),
    }
    sections.value.push(section)
    return section
  }

  /** Renames and/or recolours a section. A blank name is ignored. */
  function updateSection(id: string, changes: { name?: string; color?: string }) {
    const section = getSection(id)
    if (!section) return
    const name = changes.name === undefined ? '' : cleanSectionName(changes.name)
    if (name) section.name = name
    if (changes.color !== undefined) section.color = cleanColor(changes.color, section.color)
  }

  /** Deletes a section. Its routines stay in the library, back among the unsorted ones. */
  function removeSection(id: string) {
    sections.value = sections.value.filter((s) => s.id !== id)
    pruneSectionIds()
  }

  /** Replaces the order of the sections, e.g. after a drag-and-drop reorder. */
  function reorderSections(newOrder: RoutineSection[]) {
    sections.value = newOrder
  }

  /** Files a routine under a section, or (with `null`) takes it out of any. */
  function moveToSection(routineId: string, sectionId: string | null) {
    const routine = getById(routineId)
    if (!routine) return
    if (sectionId && getSection(sectionId)) routine.sectionId = sectionId
    else delete routine.sectionId
  }

  /**
   * Applies a whole drag-and-drop layout at once: each group's routines, in
   * order, filed under that group's section (`null` = unsorted). Routines the
   * layout leaves out keep their relative order after the ones it names.
   */
  function arrange(layout: { sectionId: string | null; routineIds: string[] }[]) {
    const sectionIds = new Set(sections.value.map((s) => s.id))
    const seen = new Set<string>()
    const next: StoredRoutine[] = []
    for (const group of layout) {
      for (const id of group.routineIds) {
        const routine = getById(id)
        if (!routine || seen.has(id)) continue
        seen.add(id)
         
        const { sectionId: _previous, ...rest } = routine
        next.push(group.sectionId && sectionIds.has(group.sectionId) ? { ...rest, sectionId: group.sectionId } : rest)
      }
    }
    routines.value = [...next, ...routines.value.filter((r) => !seen.has(r.id))]
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

  /** Wipes the whole library and its sections, e.g. for a full data reset. Does not reseed defaults. */
  function clear() {
    routines.value = []
    sections.value = []
    pruneFavorites()
  }

  /** Wipes the library and its sections, then reseeds the starter routines so the user is never left with none. */
  function resetToDefaults() {
    routines.value = defaultRoutines()
    sections.value = []
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
    pruneSectionIds()
  }

  /**
   * Replaces the sections with a synced copy. Only the sync layer calls this.
   *
   * @param renamedIds Old id → new id, when a local section was folded into
   *   the account's one of the same name, so its routines follow it.
   */
  function applyRemoteSections(next: RoutineSection[], renamedIds: Record<string, string> = {}) {
    sections.value = next
    for (const routine of routines.value) {
      const renamed = routine.sectionId && renamedIds[routine.sectionId]
      if (renamed) routine.sectionId = renamed
    }
    pruneSectionIds()
  }

  return {
    routines,
    list,
    favoriteIds,
    sections,
    getSection,
    sectionOf,
    nextSectionColor,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    moveToSection,
    arrange,
    applyRemoteSections,
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
