import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parseSessionText, type ParseSessionResult } from '@/lib/parseSession'
import { findLastSessionForRoutine } from '@/lib/sessionMatch'
import { formatFileTimeStamp } from '@/lib/format'
import type { StoredRoutine } from '@/stores/routines'
import type { WorkoutSession } from '@/lib/wtx'

/** A finished `.wts` session in the log. Raw text is the source of truth. */
export interface StoredSession {
  id: string
  /** Derived from the session's name, date, and time saved: `Name-YYYY-MM-DD-HHmm.wts`. */
  filename: string
  /** Verbatim file contents — re-parsed on demand, never mutated. */
  rawText: string
  /** Epoch millis when it was saved. */
  addedAt: number
  /** The routine this was started from, if any — used for "last time" prefill. */
  routineId?: string
}

const STORAGE_KEY = 'wtx:sessions'

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }
}

/** The one place the `Name-YYYY-MM-DD-HHmm.wts` naming scheme is built. */
function canonicalFilename(name: string, date: string, addedAt: number): string {
  return `${name || 'session'}-${date}-${formatFileTimeStamp(addedAt)}.wts`
}

/**
 * Reads sessions from storage, re-deriving each `filename` from its own
 * `rawText`/`addedAt` so older sessions saved before the naming scheme
 * changed (or changed again) always show up with today's convention.
 */
function readStored(): StoredSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (s): s is StoredSession =>
          s &&
          typeof s.id === 'string' &&
          typeof s.filename === 'string' &&
          typeof s.rawText === 'string' &&
          typeof s.addedAt === 'number',
      )
      .map((s) => {
        const result = parseSessionText(s.rawText)
        if (!result.ok) return s
        return {
          ...s,
          filename: canonicalFilename(result.session.name, result.session.date, s.addedAt),
        }
      })
  } catch {
    return []
  }
}

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<StoredSession[]>(readStored())

  watch(
    sessions,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* storage unavailable — keep the in-memory list */
      }
    },
    { deep: true },
  )

  /** Newest first — sessions are an immutable log, not user-reorderable. */
  const list = computed(() => [...sessions.value].sort((a, b) => b.addedAt - a.addedAt))

  function getById(id: string): StoredSession | undefined {
    return sessions.value.find((s) => s.id === id)
  }

  /** Parse a stored session's text (or return the parser error). */
  function parsed(id: string): ParseSessionResult | undefined {
    const session = getById(id)
    return session ? parseSessionText(session.rawText) : undefined
  }

  /**
   * Adds a finished session after checking it parses.
   *
   * @throws The parser's error message if `rawText` is not a valid `.wts`.
   */
  function add(rawText: string, routineId?: string, addedAt = Date.now()): StoredSession {
    const result = parseSessionText(rawText)
    if (!result.ok) throw new Error(result.error)

    const session: StoredSession = {
      id: newId(),
      filename: canonicalFilename(result.session.name, result.session.date, addedAt),
      rawText,
      addedAt,
      routineId,
    }
    sessions.value.unshift(session)
    return session
  }

  function remove(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  /** Wipes the whole log, e.g. for a full data reset. */
  function clear() {
    sessions.value = []
  }

  /** Most recent completed session for a routine, for "last time" prefill. */
  function lastForRoutine(routine: StoredRoutine): WorkoutSession | undefined {
    return findLastSessionForRoutine(sessions.value, routine)
  }

  return { sessions, list, getById, parsed, add, remove, clear, lastForRoutine }
})
