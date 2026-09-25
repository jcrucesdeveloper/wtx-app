import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parseSessionText } from '@/lib/parseSession'
import {
  draftFromTemplate,
  newSetId,
  serializeSession,
  type SessionDraft,
  type SessionExerciseDraft,
  type SessionSetType,
} from '@/lib/serializeSession'
import { useSessionsStore, type StoredSession } from '@/stores/sessions'
import type { StoredRoutine } from '@/stores/routines'
import type { WorkoutTemplate } from '@/lib/wtx'
import { HapticsService } from '@/services/haptics'
import { warmExerciseImages } from '@/lib/exercises/imageCache'

/** The live, in-progress workout. Only one can be active at a time. */
export interface ActiveSession {
  draft: SessionDraft
  /** The routine this was started from. */
  routineId: string
  /** The group workout room this session is logged in, if any. */
  roomId?: string
  /** Epoch millis — elapsed time is always derived from this, never incremented. */
  startedAt: number
  /** Absolute deadline for the current rest timer; `null` when none is running. */
  restEndsAt: number | null
  /** The rest timer's original length, for rendering progress; `null` when none is running. */
  restDurationSeconds: number | null
  restExerciseIndex: number | null
  restSetId: string | null
}

const STORAGE_KEY = 'wtx:activeSession'

/** Migrates a pre-`type` stored set (`isWarmup: boolean`) to the `type` field. */
function migrateSet(set: Record<string, unknown>): void {
  if ('type' in set) return
  set.type = set.isWarmup ? 'W' : 'number'
  delete set.isWarmup
}

function readStored(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    for (const exercise of parsed.draft?.exercises ?? []) {
      for (const set of exercise.loggedSets ?? []) migrateSet(set)
    }
    return parsed as ActiveSession
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
    if (endsAt && now.value >= endsAt) {
      skipRestTimer()
      HapticsService.warning()
    }
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
  function start(routine: StoredRoutine, template: WorkoutTemplate, opts?: { roomId?: string }) {
    const sessions = useSessionsStore()
    const lastSession = sessions.lastForRoutine(routine)
    session.value = {
      draft: draftFromTemplate(template, routine.filename, lastSession),
      routineId: routine.id,
      ...(opts?.roomId ? { roomId: opts.roomId } : {}),
      startedAt: Date.now(),
      restEndsAt: null,
      restDurationSeconds: null,
      restExerciseIndex: null,
      restSetId: null,
    }
    now.value = Date.now()
    void warmExerciseImages(template.exercises.map((e) => e.name))
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
    if (found.set.type !== 'W' && found.exercise.restSeconds) {
      startRestTimer(exerciseIndex, setId, found.exercise.restSeconds)
    }
  }

  function uncompleteSet(exerciseIndex: number, setId: string) {
    const found = findSet(exerciseIndex, setId)
    if (found) found.set.completed = false
  }

  function addSet(exerciseIndex: number, opts?: { type?: SessionSetType }) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (!exercise) return
    exercise.loggedSets.push({
      id: newSetId(),
      type: opts?.type ?? 'number',
      weight: null,
      reps: null,
      completed: false,
    })
  }

  /** Tapping a set's number cycles it through plain number → warm-up → drop set. */
  function cycleSetType(exerciseIndex: number, setId: string) {
    const found = findSet(exerciseIndex, setId)
    if (!found) return
    const set = found.set
    set.type = set.type === 'number' ? 'W' : set.type === 'W' ? 'D' : 'number'
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

  /**
   * Appends a new exercise to the end of the in-progress session — e.g. when
   * the planned equipment is unavailable and something else is subbed in.
   * Only this session is affected until the user chooses to sync on finish.
   */
  function addExercise(name: string) {
    if (!session.value) return
    session.value.draft.exercises.push({
      name,
      kind: 'reps',
      sets: 3,
      reps: 10,
      weight: 0,
      note: '',
      loggedSets: Array.from({ length: 3 }, () => ({
        id: newSetId(),
        type: 'number' as const,
        weight: null,
        reps: null,
        completed: false,
      })),
    })
  }

  /**
   * Removes an exercise from the in-progress session. Only this session is
   * affected — the routine/template it was started from is untouched.
   */
  function removeExercise(index: number) {
    if (!session.value) return
    const restExerciseIndex = session.value.restExerciseIndex
    if (restExerciseIndex !== null) {
      if (restExerciseIndex === index) skipRestTimer()
      else if (restExerciseIndex > index) session.value.restExerciseIndex = restExerciseIndex - 1
    }
    session.value.draft.exercises.splice(index, 1)
  }

  /**
   * Reorders the in-progress session's exercises. Only this session is
   * affected — the routine/template it was started from is untouched.
   */
  function reorderExercises(newOrder: SessionExerciseDraft[]) {
    if (!session.value) return
    const restExerciseIndex = session.value.restExerciseIndex
    const restExercise =
      restExerciseIndex !== null ? session.value.draft.exercises[restExerciseIndex] : undefined

    session.value.draft.exercises = newOrder

    if (restExercise) {
      const newIndex = newOrder.indexOf(restExercise)
      session.value.restExerciseIndex = newIndex === -1 ? null : newIndex
    }
  }

  function startRestTimer(exerciseIndex: number, setId: string, seconds: number) {
    if (!session.value) return
    session.value.restExerciseIndex = exerciseIndex
    session.value.restSetId = setId
    session.value.restEndsAt = Date.now() + seconds * 1000
    session.value.restDurationSeconds = seconds
    now.value = Date.now()
  }

  function skipRestTimer() {
    if (!session.value) return
    session.value.restEndsAt = null
    session.value.restDurationSeconds = null
    session.value.restExerciseIndex = null
    session.value.restSetId = null
  }

  /** Nudges the running rest timer; clamped so it never goes negative. */
  function adjustRestTimer(deltaSeconds: number) {
    if (!session.value?.restEndsAt) return
    session.value.restEndsAt = Math.max(Date.now(), session.value.restEndsAt + deltaSeconds * 1000)
  }

  /**
   * Serializes, saves to the session log, and clears the active session.
   *
   * @param opts.routineIdOverride Links the saved session to a different
   *   routine than the one it was started from — e.g. when the user saved a
   *   mid-workout exercise swap as a new routine on finish.
   * @param opts.name Renames the session as it's saved; blank keeps the current name.
   * @param opts.localOnly Keeps the session on this device, out of account sync.
   */
  function finish(
    opts: { routineIdOverride?: string; name?: string; localOnly?: boolean } = {},
  ): StoredSession {
    if (!session.value) throw new Error('No active session to finish.')

    const name = opts.name?.trim()
    const draft = name ? { ...session.value.draft, name } : session.value.draft
    const rawText = serializeSession(draft)
    const result = parseSessionText(rawText)
    if (!result.ok) throw new Error(result.error)

    const sessions = useSessionsStore()
    const stored = sessions.add(
      rawText,
      opts.routineIdOverride ?? session.value.routineId,
      Date.now(),
      session.value.roomId,
      opts.localOnly,
    )

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
    cycleSetType,
    updateNote,
    addExercise,
    removeExercise,
    reorderExercises,
    startRestTimer,
    skipRestTimer,
    adjustRestTimer,
    finish,
    discard,
  }
})
