import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { requireSupabase } from '@/services/supabase'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useAuthStore } from '@/stores/auth'
import { useSessionsStore } from '@/stores/sessions'
import { memberProgress } from '@/lib/roomRecap'
import { plannedWorkingSets, type PlannedExercise } from '@/lib/memberSession'
import { clearedExercises, lastOneIn, teamProgress } from '@/lib/teamProgress'
import { parseTemplateText } from '@/lib/parseRoutine'
import { allTimeBestsByExercise, type ExerciseBest } from '@/lib/sessionRecords'
import {
  completesExercise,
  isLiveRecord,
  parsePrPayload,
  parseReactionPayload,
  type ReactionEmoji,
  type RoomEvent,
} from '@/lib/roomEvents'
import { newUuid } from '@/lib/uuid'
import type { WorkoutSession } from '@/lib/wtx'
import type { RoomRow, Tables } from '@/lib/supabase/database.types'
import type { SessionSetDraft } from '@/lib/serializeSession'

export type SetLog = Tables<'set_logs'>

export interface RoomMember {
  userId: string
  displayName: string
  joinedAt: string
  finishedAt: string | null
}

/** A room error the UI can translate: `room.errors.<code>`. */
export class RoomError extends Error {
  constructor(public code: 'room_not_found' | 'room_full' | 'not_authenticated' | 'unknown', message?: string) {
    super(message ?? code)
  }
}

const CURRENT_KEY = 'wtx:currentRoom'
const MUTED_KEY = 'wtx:roomAlertsMuted'
const RETRY_MS = 5000
const MAX_EVENTS = 30
/** Minimum gap between two cheers from this device, so a tap-spree can't flood the room. */
const REACTION_THROTTLE_MS = 400

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

const nameKey = (name: string) => name.trim().toLowerCase()

/** Active-session actions that change a set the room should know about. */
const SET_ACTIONS = new Set(['completeSet', 'uncompleteSet', 'updateSet', 'cycleSetType', 'removeSet', 'removeExercise'])

function toRoomError(error: { message?: string } | null | undefined): RoomError {
  const message = error?.message ?? ''
  for (const code of ['room_not_found', 'room_full', 'not_authenticated'] as const) {
    if (message.includes(code)) return new RoomError(code, message)
  }
  return new RoomError('unknown', message)
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

function readCurrentId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

/**
 * The group workout room this device is in: its members, their live sets
 * (Supabase Realtime) and who is online (Presence). Completed sets from the
 * active session are pushed here as they're ticked.
 */
export const useRoomStore = defineStore('room', () => {
  const room = ref<RoomRow | null>(null)
  const members = ref<RoomMember[]>([])
  const setLogs = ref<SetLog[]>([])
  const onlineIds = ref<string[]>([])
  const currentRoomId = ref<string | null>(readCurrentId())
  /** Group alerts off (toasts and bursts) — the user's call, never forced on them. */
  const muted = ref(readMuted())

  watch(muted, (value) => {
    try {
      localStorage.setItem(MUTED_KEY, value ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  })

  watch(currentRoomId, (id) => {
    try {
      if (id) localStorage.setItem(CURRENT_KEY, id)
      else localStorage.removeItem(CURRENT_KEY)
    } catch {
      /* storage unavailable */
    }
  })

  let channel: RealtimeChannel | null = null

  const myId = computed(() => useAuthStore().user?.id ?? null)
  const isHost = computed(() => !!room.value && room.value.host_id === myId.value)

  /** Live happenings for toasts (newest last). Cleared when the room changes. */
  const events = ref<RoomEvent[]>([])

  function addEvent(event: DistributiveOmit<RoomEvent, 'id' | 'at'>) {
    const stamped = { ...event, id: newUuid(), at: Date.now() } as RoomEvent
    events.value = [...events.value.slice(-(MAX_EVENTS - 1)), stamped]
  }

  const isMember = (userId: string) => members.value.some((m) => m.userId === userId)

  /** The room's routine — everyone follows the same snapshot. */
  const routineExercises = computed<PlannedExercise[]>(() => {
    const parsed = room.value ? parseTemplateText(room.value.routine_wtt) : undefined
    return parsed?.ok ? parsed.template.exercises : []
  })

  /** Planned working sets per exercise (by normalized name). */
  const plannedByName = computed(
    () => new Map(routineExercises.value.map((e) => [nameKey(e.name), plannedWorkingSets(e)])),
  )

  /** The group vs the routine: shared progress, each member's part visible but unranked. */
  const team = computed(() => teamProgress(routineExercises.value, members.value, setLogs.value))
  /** Whoever the team is waiting on once everyone else is done. */
  const lastIn = computed(() => lastOneIn(routineExercises.value, members.value, setLogs.value))
  const cleared = computed(() =>
    clearedExercises(
      routineExercises.value,
      members.value.map((m) => m.userId),
      setLogs.value,
    ),
  )

  /** Exercises already cleared when we started following the room — only new ones are celebrated. */
  let clearedSeen: Set<string> | null = null
  watch(cleared, (names) => {
    if (!clearedSeen) return
    for (const name of names) {
      if (clearedSeen.has(name)) continue
      clearedSeen.add(name)
      addEvent({ kind: 'team-cleared', from: '', exercise: name })
    }
  })

  /** Members in join order, with live progress and online state. */
  const progress = computed(() =>
    members.value.map((m) => ({
      ...m,
      ...memberProgress(m.userId, setLogs.value),
      online: onlineIds.value.includes(m.userId),
    })),
  )

  async function fetchMembers(roomId: string) {
    const { data, error } = await requireSupabase()
      .from('room_members')
      .select('room_id, user_id, joined_at, finished_at, profiles(display_name)')
      .eq('room_id', roomId)
      .order('joined_at')
    if (error) throw error
    if (room.value?.id !== roomId) return
    const previous = members.value
    const next = (data ?? []).map((row) => ({
      userId: row.user_id,
      displayName: (row.profiles as { display_name: string } | null)?.display_name ?? '—',
      joinedAt: row.joined_at,
      finishedAt: row.finished_at,
    }))

    // Diff against what we had (not on the first load) to announce joins and finishes.
    if (previous.length) {
      const before = new Map(previous.map((m) => [m.userId, m]))
      for (const m of next) {
        const was = before.get(m.userId)
        if (!was) addEvent({ kind: 'joined', from: m.userId })
        else if (!was.finishedAt && m.finishedAt) addEvent({ kind: 'finished', from: m.userId })
      }
      const allDone = (list: RoomMember[]) => list.length > 1 && list.every((m) => m.finishedAt)
      if (!allDone(previous) && allDone(next)) addEvent({ kind: 'team-finished', from: '' })
    }
    members.value = next
  }

  /** Announces "Ana finished Squat" when someone else's set completes an exercise's plan. */
  function noticeExerciseDone(log: SetLog) {
    if (log.user_id === myId.value || log.set_type === 'W') return
    if (setLogs.value.some((l) => l.id === log.id)) return
    const key = nameKey(log.exercise_name)
    const before = setLogs.value.filter(
      (l) => l.user_id === log.user_id && l.set_type !== 'W' && nameKey(l.exercise_name) === key,
    ).length
    if (completesExercise(plannedByName.value.get(key), before)) {
      addEvent({ kind: 'exercise-done', from: log.user_id, exercise: log.exercise_name })
    }
  }

  function upsertLocalLog(log: SetLog) {
    const index = setLogs.value.findIndex((l) => l.id === log.id)
    if (index >= 0) setLogs.value[index] = log
    else setLogs.value.push(log)
  }

  function removeLocalLog(id: string) {
    setLogs.value = setLogs.value.filter((l) => l.id !== id)
  }

  function subscribe(roomId: string) {
    const sb = requireSupabase()
    const filter = `room_id=eq.${roomId}`
    channel = sb
      .channel(`room:${roomId}`, {
        config: { presence: { key: myId.value ?? '' }, broadcast: { self: false } },
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (p) => {
        if (room.value?.id === roomId) room.value = p.new as RoomRow
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_members', filter }, () => {
        void fetchMembers(roomId)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_members', filter }, () => {
        void fetchMembers(roomId)
      })
      // Delete events can't be filtered server-side; the old row carries the primary key.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_members' }, (p) => {
        if ((p.old as { room_id?: string }).room_id === roomId) void fetchMembers(roomId)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'set_logs', filter }, (p) => {
        noticeExerciseDone(p.new as SetLog)
        upsertLocalLog(p.new as SetLog)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'set_logs', filter }, (p) => {
        upsertLocalLog(p.new as SetLog)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'set_logs' }, (p) => {
        const id = (p.old as { id?: string }).id
        if (id) removeLocalLog(id)
      })
      // Cheers and live PRs: ephemeral Broadcast messages, validated since they come from other clients.
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reaction = parseReactionPayload(payload)
        if (reaction && isMember(reaction.from)) addEvent({ kind: 'reaction', ...reaction })
      })
      .on('broadcast', { event: 'pr' }, ({ payload }) => {
        const pr = parsePrPayload(payload)
        if (pr && isMember(pr.from)) addEvent({ kind: 'pr', ...pr })
      })
      .on('presence', { event: 'sync' }, () => {
        onlineIds.value = channel ? Object.keys(channel.presenceState()) : []
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel?.track({ online_at: new Date().toISOString() })
      })
  }

  function close() {
    if (channel) void requireSupabase().removeChannel(channel)
    channel = null
    onlineIds.value = []
  }

  /** Loads a room this user belongs to and starts following it live. */
  async function open(roomId: string) {
    if (room.value?.id === roomId && channel) return
    close()
    const sb = requireSupabase()
    const { data, error } = await sb.from('rooms').select('*').eq('id', roomId).maybeSingle()
    if (error) throw toRoomError(error)
    if (!data) throw new RoomError('room_not_found')

    room.value = data
    members.value = []
    setLogs.value = []
    events.value = []
    clearedSeen = null
    currentRoomId.value = roomId

    const [, logs] = await Promise.all([
      fetchMembers(roomId),
      sb.from('set_logs').select('*').eq('room_id', roomId).order('completed_at'),
    ])
    if (logs.error) throw toRoomError(logs.error)
    if (room.value?.id !== roomId) return
    setLogs.value = logs.data ?? []
    clearedSeen = new Set(cleared.value)
    subscribe(roomId)
  }

  /** Creates a room from a library routine, with this user as host. */
  async function create(routineId: string): Promise<RoomRow> {
    const routines = useRoutinesStore()
    const routine = routines.getById(routineId)
    const parsed = routines.parsed(routineId)
    if (!routine || !parsed?.ok) throw new RoomError('unknown', 'Routine not found')

    const { data, error } = await requireSupabase().rpc('create_room', {
      p_routine_wtt: routine.rawText,
      p_routine_name: parsed.template.name || routine.filename.replace(/\.wtt$/i, ''),
      p_unit: parsed.template.unit ?? null,
    })
    if (error || !data) throw toRoomError(error)
    await open(data.id)
    return data
  }

  /** Joins a room by its 6-character code. */
  async function join(code: string): Promise<RoomRow> {
    const { data, error } = await requireSupabase().rpc('join_room', { p_code: code })
    if (error || !data) throw toRoomError(error)
    await open(data.id)
    return data
  }

  /** Host only: moves the room from the lobby into the workout. */
  async function start() {
    if (!room.value) return
    const { error } = await requireSupabase().from('rooms').update({ status: 'active' }).eq('id', room.value.id)
    if (error) throw toRoomError(error)
    // Don't wait for the realtime echo — the host's own screen should move on now
    // (the echo then brings the server's started_at for the shared countdown).
    if (room.value.status === 'lobby') {
      room.value = { ...room.value, status: 'active', started_at: new Date().toISOString() }
    }
  }

  /** Host only: ends the room for everyone. */
  async function end() {
    if (!room.value) return
    const { error } = await requireSupabase().from('rooms').update({ status: 'finished' }).eq('id', room.value.id)
    if (error) throw toRoomError(error)
    room.value = { ...room.value, status: 'finished' }
  }

  /** Marks this user's workout finished; the room closes once everyone has. */
  async function finishMine(roomId: string) {
    const uid = myId.value
    if (!uid) return
    await requireSupabase()
      .from('room_members')
      .update({ finished_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', uid)
  }

  /** Leaves the room: before it starts this removes the membership, afterwards it just stops following. */
  async function leave() {
    const current = room.value
    const uid = myId.value
    if (current && uid && current.status === 'lobby' && !isHost.value) {
      await requireSupabase().from('room_members').delete().eq('room_id', current.id).eq('user_id', uid)
    }
    reset()
  }

  /** Recent rooms this user has been in, newest first (for the Social tab). */
  async function history(limit = 20): Promise<RoomRow[]> {
    const { data, error } = await requireSupabase()
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw toRoomError(error)
    return data ?? []
  }

  function reset() {
    close()
    room.value = null
    members.value = []
    setLogs.value = []
    events.value = []
    clearedSeen = null
    currentRoomId.value = null
    bestsRoomId = null
    announcedRecords.clear()
  }

  // --- Cheers and live PRs (Realtime Broadcast) -----------------------------

  let lastReactionAt = 0

  /**
   * Sends a cheer to a member. Broadcast-only: nothing is stored, and it
   * reaches whoever is connected right now.
   *
   * @returns Whether it was sent (false when throttled or not connected).
   */
  function sendReaction(to: string, emoji: ReactionEmoji): boolean {
    const from = myId.value
    const now = Date.now()
    if (!channel || !from || now - lastReactionAt < REACTION_THROTTLE_MS) return false
    lastReactionAt = now
    void channel.send({ type: 'broadcast', event: 'reaction', payload: { from, to, emoji } })
    return true
  }

  /** All-time bests from this user's past sessions, computed once per room workout. */
  let bests = new Map<string, ExerciseBest>()
  let bestsRoomId: string | null = null
  /** Heaviest weight already announced per exercise this workout. */
  const announcedRecords = new Map<string, number>()

  function priorBests(roomId: string): Map<string, ExerciseBest> {
    if (bestsRoomId !== roomId) {
      const sessions = useSessionsStore()
      const past = sessions.list
        .map((s) => sessions.parsed(s.id))
        .filter((r): r is { ok: true; session: WorkoutSession } => r?.ok === true)
        .map((r) => r.session)
      bests = allTimeBestsByExercise(past)
      bestsRoomId = roomId
      announcedRecords.clear()
    }
    return bests
  }

  /** Celebrates a new all-time best the moment the set is ticked — here and for everyone in the room. */
  function checkLiveRecord(roomId: string, exerciseName: string, set: SessionSetDraft) {
    const from = myId.value
    if (!from || set.type !== 'number' || set.weight === null || set.reps === null) return
    const key = nameKey(exerciseName)
    if (!isLiveRecord(priorBests(roomId).get(key), announcedRecords.get(key), set.weight)) return
    announcedRecords.set(key, set.weight)

    const pr = { from, exercise: exerciseName, weight: set.weight, reps: set.reps }
    if (room.value?.id === roomId) addEvent({ kind: 'pr', ...pr })
    if (channel && room.value?.id === roomId) void channel.send({ type: 'broadcast', event: 'pr', payload: pr })
  }

  // --- Pushing the active session's sets -----------------------------------

  /** Set pushes/deletes that failed (offline), retried until they land. */
  const pending = new Map<string, () => Promise<void>>()
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  function schedulePending() {
    clearTimeout(retryTimer)
    if (!pending.size) return
    retryTimer = setTimeout(async () => {
      for (const [id, run] of pending) {
        try {
          await run()
          pending.delete(id)
        } catch {
          /* still failing — keep it */
        }
      }
      schedulePending()
    }, RETRY_MS)
  }

  function enqueue(id: string, run: () => Promise<void>) {
    pending.set(id, run)
    run()
      .then(() => {
        if (pending.get(id) === run) pending.delete(id)
      })
      .catch(schedulePending)
  }

  function pushSet(roomId: string, exerciseName: string, set: SessionSetDraft) {
    const uid = myId.value
    if (!uid) return
    const row = {
      id: set.id,
      room_id: roomId,
      user_id: uid,
      exercise_name: exerciseName,
      set_type: set.type,
      weight: set.weight ?? 0,
      reps: set.reps ?? 0,
    }
    if (room.value?.id === roomId) {
      const existing = setLogs.value.find((l) => l.id === set.id)
      upsertLocalLog({ ...row, completed_at: existing?.completed_at ?? new Date().toISOString() })
    }
    enqueue(set.id, async () => {
      const { error } = await requireSupabase().from('set_logs').upsert(row)
      if (error) throw error
    })
  }

  function deleteSet(roomId: string, setId: string) {
    if (room.value?.id === roomId) removeLocalLog(setId)
    enqueue(setId, async () => {
      const { error } = await requireSupabase().from('set_logs').delete().eq('id', setId)
      if (error) throw error
    })
  }

  const activeSession = useActiveSessionStore()
  activeSession.$onAction(({ name, args, after }) => {
    if (!SET_ACTIONS.has(name)) return
    const roomId = activeSession.session?.roomId
    if (!roomId || !myId.value) return
    const exercises = activeSession.session?.draft.exercises ?? []

    if (name === 'removeExercise') {
      const doneIds = (exercises[args[0] as number]?.loggedSets ?? []).filter((s) => s.completed).map((s) => s.id)
      after(() => doneIds.forEach((id) => deleteSet(roomId, id)))
      return
    }

    const exercise = exercises[args[0] as number]
    const setId = args[1] as string
    if (!exercise) return
    after(() => {
      const set = exercise.loggedSets.find((s) => s.id === setId)
      if (set?.completed) {
        pushSet(roomId, exercise.name, set)
        checkLiveRecord(roomId, exercise.name, set)
      } else if (name === 'uncompleteSet' || name === 'removeSet') deleteSet(roomId, setId)
    })
  })

  return {
    room,
    members,
    setLogs,
    onlineIds,
    currentRoomId,
    isHost,
    progress,
    team,
    lastIn,
    muted,
    events,
    sendReaction,
    open,
    create,
    join,
    start,
    end,
    finishMine,
    leave,
    history,
    reset,
  }
})
