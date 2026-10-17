import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { parseSessionText } from '@/lib/parseSession'
import {
  draftFromTemplate,
  newSetId,
  serializeSession,
  type SessionDraft,
  type SessionExerciseDraft,
  type SessionSetDraft,
  type SessionSetType,
} from '@/lib/serializeSession'
import { useSessionsStore, type StoredSession } from '@/stores/sessions'
import type { StoredRoutine } from '@/stores/routines'
import { findLastLoggedExercise } from '@/lib/sessionMatch'
import { isTimeExercise } from '@/lib/sessionTime'
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
    removedSet = null
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
    // A timed set has no weight: zero keeps it out of volume and weight records.
    if (found.exercise.kind === 'time') found.set.weight = 0
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

  /**
   * The set last taken out with {@link removeSet}, so it can be put back
   * exactly where it was. Only the last one, and only in memory: it backs an
   * undo that lasts seconds, not a history.
   */
  let removedSet: {
    exercise: SessionExerciseDraft
    set: SessionSetDraft
    position: number
    /** The rest that was running after this set, if one was. */
    rest: { endsAt: number; durationSeconds: number | null } | null
  } | null = null

  /**
   * Takes one set out of an exercise, logged or not. An exercise left with no
   * sets stays in the workout, empty, until one is added or it is removed. A
   * rest running after the removed set stops with it. The set can be put back
   * with {@link restoreSet} until another set is removed.
   */
  function removeSet(exerciseIndex: number, setId: string) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (!session.value || !exercise) return
    const position = exercise.loggedSets.findIndex((s) => s.id === setId)
    if (position === -1) return
    const set = exercise.loggedSets[position]!

    const restingAfterIt =
      session.value.restSetId === setId &&
      session.value.restExerciseIndex === exerciseIndex &&
      session.value.restEndsAt !== null
    removedSet = {
      exercise,
      set,
      position,
      rest: restingAfterIt
        ? { endsAt: session.value.restEndsAt!, durationSeconds: session.value.restDurationSeconds }
        : null,
    }
    if (restingAfterIt) skipRestTimer()
    exercise.loggedSets.splice(position, 1)
  }

  /**
   * Puts the set last removed back where it was, with everything it had —
   * logged or not, its numbers, its type. Its rest comes back too if it is
   * still running and no other rest has started since. Does nothing when
   * that set isn't the last one removed, or its exercise is no longer at
   * `exerciseIndex`.
   */
  function restoreSet(exerciseIndex: number, setId: string) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    const removed = removedSet
    if (!session.value || !exercise || removed?.set.id !== setId || removed.exercise !== exercise) {
      return
    }
    removedSet = null
    if (exercise.loggedSets.some((s) => s.id === setId)) return
    exercise.loggedSets.splice(Math.min(removed.position, exercise.loggedSets.length), 0, removed.set)

    if (removed.rest && session.value.restEndsAt === null && removed.rest.endsAt > Date.now()) {
      session.value.restEndsAt = removed.rest.endsAt
      session.value.restDurationSeconds = removed.rest.durationSeconds
      session.value.restExerciseIndex = exerciseIndex
      session.value.restSetId = setId
      now.value = Date.now()
    }
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
   * Swaps the exercise at `index` for another one, in place — the machine is
   * taken, so something else goes in its slot. The slot keeps its shape (how
   * many sets, which are warm-ups or drop sets, the rest between them), but
   * nothing logged carries over: a weight lifted on one movement is not a
   * weight lifted on another, and would end up in the wrong exercise's
   * history and records. Callers own the confirmation when sets are logged.
   *
   * Each set comes back empty, prefilled as a placeholder with the last time
   * the new exercise was logged, if it ever was. Only this session is
   * affected — the routine it was started from is untouched.
   */
  function replaceExercise(index: number, name: string) {
    const exercise = session.value?.draft.exercises[index]
    if (!session.value || !exercise) return
    if (session.value.restExerciseIndex === index) skipRestTimer()

    const last = findLastLoggedExercise(useSessionsStore().sessions, name)
    const lastWorking = last?.workingSets ?? []
    const lastWarmup = last?.warmupSets ?? []
    let workingCursor = 0
    let warmupCursor = 0

    exercise.name = name
    exercise.weight = last?.topSet?.weight ?? 0
    exercise.note = ''
    // New ids: these are new sets, not the old ones edited.
    exercise.loggedSets = exercise.loggedSets.map((set) => {
      const ghost =
        set.type === 'W'
          ? (lastWarmup[warmupCursor++] ?? lastWarmup[lastWarmup.length - 1])
          : (lastWorking[workingCursor++] ?? lastWorking[lastWorking.length - 1])
      return {
        id: newSetId(),
        type: set.type,
        weight: null,
        reps: null,
        completed: false,
        ...(ghost
          ? { ghostWeight: ghost.weight, ghostReps: ghost.reps, ghostFromLast: true }
          : {}),
      }
    })
  }

  /**
   * Switches how an exercise is tracked: weight × reps, or time (seconds go
   * where reps would). A session's exercise has one kind for all its sets —
   * that's how `.wts` stores it — so a set's numbers can't carry over: 80 kg
   * × 8 is not 8 seconds. Every set keeps its place and type (warm-up, drop
   * set) but comes back empty, prefilled with the last time this exercise was
   * logged the same way, if it ever was. Callers own the confirmation when
   * sets are logged. Only this session is affected — the routine it was
   * started from is untouched.
   */
  function setExerciseKind(index: number, kind: 'reps' | 'time') {
    const exercise = session.value?.draft.exercises[index]
    if (!session.value || !exercise || exercise.kind === kind) return
    if (session.value.restExerciseIndex === index) skipRestTimer()

    const last = findLastLoggedExercise(useSessionsStore().sessions, exercise.name)
    const sameKind = last && isTimeExercise(last.note) === (kind === 'time') ? last : undefined
    const lastWorking = sameKind?.workingSets ?? []
    const lastWarmup = sameKind?.warmupSets ?? []
    let workingCursor = 0
    let warmupCursor = 0

    exercise.kind = kind
    exercise.reps = sameKind?.topSet?.reps ?? (kind === 'time' ? 60 : 10)
    exercise.weight = kind === 'time' ? 0 : (sameKind?.topSet?.weight ?? 0)
    exercise.loggedSets = exercise.loggedSets.map((set) => {
      const ghost =
        set.type === 'W'
          ? (lastWarmup[warmupCursor++] ?? lastWarmup[lastWarmup.length - 1])
          : (lastWorking[workingCursor++] ?? lastWorking[lastWorking.length - 1])
      return {
        id: newSetId(),
        type: set.type,
        weight: null,
        reps: null,
        completed: false,
        ...(ghost ? { ghostWeight: ghost.weight, ghostReps: ghost.reps, ghostFromLast: true } : {}),
      }
    })
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

  /**
   * Nudges the running rest timer; clamped so it never goes negative. The
   * rest's length moves with it, so its progress stays a share of the whole.
   */
  function adjustRestTimer(deltaSeconds: number) {
    if (!session.value?.restEndsAt) return
    const before = session.value.restEndsAt
    session.value.restEndsAt = Math.max(Date.now(), before + deltaSeconds * 1000)
    const duration = session.value.restDurationSeconds
    if (duration !== null) {
      session.value.restDurationSeconds = Math.max(
        0,
        duration + (session.value.restEndsAt - before) / 1000,
      )
    }
  }

  /**
   * Sets how long to rest after this exercise's sets, for the rest of this
   * session; `0` or `undefined` turns its rest off. The routine is untouched.
   *
   * A rest already running after this exercise is re-timed to the new length,
   * counted from when it started (a rest past the new length ends now); with
   * the rest turned off, it stops.
   */
  function setRestSeconds(exerciseIndex: number, seconds: number | undefined) {
    const exercise = session.value?.draft.exercises[exerciseIndex]
    if (!session.value || !exercise) return
    const next = seconds && seconds > 0 ? Math.round(seconds) : undefined
    const previous = exercise.restSeconds
    exercise.restSeconds = next

    const endsAt = session.value.restEndsAt
    if (session.value.restExerciseIndex !== exerciseIndex || endsAt === null) return
    if (next === undefined) return skipRestTimer()
    const startedAt = endsAt - (session.value.restDurationSeconds ?? previous ?? next) * 1000
    session.value.restEndsAt = Math.max(Date.now(), startedAt + next * 1000)
    session.value.restDurationSeconds = (session.value.restEndsAt - startedAt) / 1000
    now.value = Date.now()
  }

  /**
   * Serializes, saves to the session log, and clears the active session.
   *
   * @param opts.routineIdOverride Links the saved session to a different
   *   routine than the one it was started from — e.g. when the user saved a
   *   mid-workout exercise swap as a new routine on finish.
   * @param opts.name Renames the session as it's saved; blank keeps the current name.
   * @param opts.localOnly Keeps the session on this device, out of account sync.
   * @param opts.shareToFeed Posts the finished session to the Social feed for followers.
   */
  function finish(
    opts: {
      routineIdOverride?: string
      name?: string
      localOnly?: boolean
      shareToFeed?: boolean
    } = {},
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
      !opts.localOnly && opts.shareToFeed,
    )

    session.value = null
    removedSet = null
    persist()
    return stored
  }

  /** Discards the in-progress session. Callers own any confirmation prompt. */
  function discard() {
    session.value = null
    removedSet = null
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
    restoreSet,
    cycleSetType,
    updateNote,
    addExercise,
    removeExercise,
    replaceExercise,
    reorderExercises,
    setExerciseKind,
    startRestTimer,
    skipRestTimer,
    adjustRestTimer,
    setRestSeconds,
    finish,
    discard,
  }
})
