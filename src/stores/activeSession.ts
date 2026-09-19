import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parseSessionText } from '@/lib/parseSession'
import {
  draftFromTemplate,
  newSetId,
  serializeSession,
  type SessionDraft,
} from '@/lib/serializeSession'
import { useSessionsStore, type StoredSession } from '@/stores/sessions'
import type { StoredRoutine } from '@/stores/routines'
import type { WorkoutTemplate } from '@/lib/wtx'

/** The live, in-progress workout. Only one can be active at a time. */
export interface ActiveSession {
  draft: SessionDraft
  /** The routine this was started from. */
  routineId: string
  /** Epoch millis — elapsed time is always derived from this, never incremented. */
  startedAt: number
  /** Absolute deadline for the current rest timer; `null` when none is running. */
  restEndsAt: number | null
  restExerciseIndex: number | null
  restSetId: string | null
}

const STORAGE_KEY = 'wtx:activeSession'

function readStored(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as ActiveSession) : null
  } catch {
    return null
  }
}

export const useActiveSessionStore = defineStore('activeSession', () => {
  const session = ref<ActiveSession | null>(readStored())
  /** Ticking clock for `elapsedSeconds`/`restRemainingSeconds` — never persisted. */
  const now = ref(Date.now())

  function persist() {
    try {
      if (session.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable — keep the in-memory session */
    }
  }

  /** Debounced like EditRoutineSheet's autosave — the draft changes on every keystroke. */
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    session,
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(persist, 400)
    },
    { deep: true },
  )

  function tick() {
    now.value = Date.now()
    const endsAt = session.value?.restEndsAt
    if (endsAt && now.value >= endsAt) skipRestTimer()
  }
  const tickTimer = setInterval(tick, 1000)
  window.addEventListener('visibilitychange', tick)
  window.addEventListener('focus', tick)
  onScopeDispose(() => {
    clearTimeout(saveTimer)
    clearInterval(tickTimer)
    window.removeEventListener('visibilitychange', tick)
    window.removeEventListener('focus', tick)
  })

  const isActive = computed(() => session.value !== null)

  /** Elapsed workout time, self-correcting after backgrounding/reload. */
  const elapsedSeconds = computed(() => {
    if (!session.value) return 0
    return Math.max(0, Math.floor((now.value - session.value.startedAt) / 1000))
  })

  const restRemainingSeconds = computed(() => {
    const endsAt = session.value?.restEndsAt
    if (!endsAt) return 0
    return Math.max(0, Math.ceil((endsAt - now.value) / 1000))
  })

  /**
   * Starts a new session from a routine's parsed template.
   *
   * Callers are responsible for resolving any already-active session first
   * (resume or discard) — this always overwrites in place.
   */
  function start(routine: StoredRoutine, template: WorkoutTemplate) {
    const sessions = useSessionsStore()
    const lastSession = sessions.lastForRoutine(routine)
    session.value = {
      draft: draftFromTemplate(template, routine.filename, lastSession),
      routineId: routine.id,
      startedAt: Date.now(),
      restEndsAt: null,
      restExerciseIndex: null,
      restSetId: null,
    }
    now.value = Date.now()
  }

  function findSet(exerciseIndex: number, setId: string) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    const set = exercise?.loggedSets.find((s) => s.id === setId)
    return exercise && set ? { exercise, set } : undefined
  }

  function updateSet(
    exerciseIndex: number,
    setId: string,
    patch: { weight?: number | null; reps?: number | null },
  ) {
    const found = findSet(exerciseIndex, setId)
    if (!found) return
    if (patch.weight !== undefined) found.set.weight = patch.weight
    if (patch.reps !== undefined) found.set.reps = patch.reps
  }

  function completeSet(exerciseIndex: number, setId: string) {
    const found = findSet(exerciseIndex, setId)
    if (!found) return
    found.set.completed = true
    if (!found.set.isWarmup && found.exercise.restSeconds) {
      startRestTimer(exerciseIndex, setId, found.exercise.restSeconds)
    }
  }

  function uncompleteSet(exerciseIndex: number, setId: string) {
    const found = findSet(exerciseIndex, setId)
    if (found) found.set.completed = false
  }

  function addSet(exerciseIndex: number, opts?: { isWarmup?: boolean }) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (!exercise) return
    exercise.loggedSets.push({
      id: newSetId(),
      isWarmup: opts?.isWarmup ?? false,
      weight: null,
      reps: null,
      completed: false,
    })
  }

  function removeSet(exerciseIndex: number, setId: string) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (!exercise) return
    exercise.loggedSets = exercise.loggedSets.filter((s) => s.id !== setId)
  }

  function updateNote(exerciseIndex: number, note: string) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (exercise) exercise.note = note
  }

  function startRestTimer(exerciseIndex: number, setId: string, seconds: number) {
    if (!session.value) return
    session.value.restExerciseIndex = exerciseIndex
    session.value.restSetId = setId
    session.value.restEndsAt = Date.now() + seconds * 1000
    now.value = Date.now()
  }

  function skipRestTimer() {
    if (!session.value) return
    session.value.restEndsAt = null
    session.value.restExerciseIndex = null
    session.value.restSetId = null
  }

  /** Nudges the running rest timer; clamped so it never goes negative. */
  function adjustRestTimer(deltaSeconds: number) {
    if (!session.value?.restEndsAt) return
    session.value.restEndsAt = Math.max(Date.now(), session.value.restEndsAt + deltaSeconds * 1000)
  }

  /** Serializes, saves to the session log, and clears the active session. */
  function finish(): StoredSession {
    if (!session.value) throw new Error('No active session to finish.')

    const rawText = serializeSession(session.value.draft)
    const result = parseSessionText(rawText)
    if (!result.ok) throw new Error(result.error)

    const sessions = useSessionsStore()
    const filename = `${session.value.draft.name || 'Session'} ${session.value.draft.date}.wts`
    const stored = sessions.add(rawText, filename, session.value.routineId)

    session.value = null
    persist()
    return stored
  }

  /** Discards the in-progress session. Callers own any confirmation prompt. */
  function discard() {
    session.value = null
    persist()
  }

  return {
    session,
    isActive,
    elapsedSeconds,
    restRemainingSeconds,
    start,
    updateSet,
    completeSet,
    uncompleteSet,
    addSet,
    removeSet,
    updateNote,
    startRestTimer,
    skipRestTimer,
    adjustRestTimer,
    finish,
    discard,
  }
})
