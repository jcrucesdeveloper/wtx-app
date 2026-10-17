import { buildMemberSession, type MemberSetLog, type PlannedExercise } from '@/lib/memberSession'
import { buildRoomRecap, type BestSet, type ExerciseComparison } from '@/lib/roomRecap'
import { clearedExercises, teamProgress, type TeamMember } from '@/lib/teamProgress'

/**
 * What a group workout added up to, for the "Together" recap and the team
 * card on the finish screen. Same stance as `teamProgress`: the group against
 * the routine. Everyone's numbers are shown side by side, because seeing
 * them is what motivates, but in join order and never ranked. Every member
 * gets one highlight of their own, never one measured against the others.
 */

/** A member's own best moment: their heaviest set, or their longest hold if they only did timed work. */
export type MemberHighlight =
  | { kind: 'top-set'; exercise: string; set: BestSet; timed: boolean }
  | { kind: 'none' }

export interface SummaryMember {
  userId: string
  displayName: string
  finishedAt: string | null
  /** Planned working sets done (extras don't count), and how many were planned. */
  done: number
  planned: number
  /** Every working set, extras included. */
  sets: number
  volume: number
  /** From the room's start to their Finish, once they've finished. */
  seconds: number | null
  /** Exercise of their latest set: what they're on, while they're still going. */
  currentExercise: string | null
  highlight: MemberHighlight
}

/** Something the group did, in the order it happened. `at` is an ISO timestamp. */
export type Moment =
  | { kind: 'cleared'; exercise: string; at: string }
  | { kind: 'finished'; userId: string; at: string }

export interface RoomSummary {
  members: SummaryMember[]
  team: {
    done: number
    total: number
    sets: number
    volume: number
    finished: number
    members: number
    allFinished: boolean
  }
  /** From the start to the last Finish, once everyone has finished. */
  seconds: number | null
  moments: Moment[]
  /** Side by side per exercise, in routine order. */
  exercises: ExerciseComparison[]
}

export interface RoomSummaryInput {
  /** The routine in the room's current order. */
  routine: PlannedExercise[]
  /** In join order. */
  members: TeamMember[]
  logs: MemberSetLog[]
  startedAt: string | null
}

const key = (name: string) => name.trim().toLowerCase()

function secondsBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  const ms = Date.parse(to) - Date.parse(from)
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null
}

/** A member's heaviest set across the rep exercises; with only timed work, the longest hold. */
function highlightOf(userId: string, exercises: ExerciseComparison[]): MemberHighlight {
  let top: MemberHighlight = { kind: 'none' }
  for (const timed of [false, true]) {
    for (const exercise of exercises) {
      if ((exercise.kind === 'time') !== timed) continue
      const best = exercise.entries.find((e) => e.userId === userId)?.best
      if (!best) continue
      const current = top.kind === 'top-set' ? top.set : null
      const beats = !current
        ? true
        : timed
          ? best.reps > current.reps
          : best.weight > current.weight || (best.weight === current.weight && best.reps > current.reps)
      if (beats) top = { kind: 'top-set', exercise: exercise.exercise, set: best, timed }
    }
    if (top.kind === 'top-set') return top
  }
  return top
}

/** When the last member completed their planned sets of `exercise` — the moment the team cleared it. */
function clearedAt(exercise: string, routine: PlannedExercise[], members: TeamMember[], logs: MemberSetLog[]): string | null {
  let latest: string | null = null
  for (const m of members) {
    const mine = buildMemberSession(routine, m.userId, logs).exercises.find((e) => key(e.name) === key(exercise))
    if (!mine || mine.planned === null || mine.planned === 0) return null
    const own = logs
      .filter((l) => l.user_id === m.userId && key(l.exercise_name) === key(exercise) && l.set_type !== 'W')
      .sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at))
    const done = own[mine.planned - 1]
    if (!done) return null
    if (!latest || Date.parse(done.completed_at) > Date.parse(latest)) latest = done.completed_at
  }
  return latest
}

export function buildRoomSummary({ routine, members, logs, startedAt }: RoomSummaryInput): RoomSummary {
  const ids = members.map((m) => m.userId)
  const recap = buildRoomRecap(ids, logs, routine)
  const progress = teamProgress(routine, members, logs)

  const summaryMembers = members.map((m, i): SummaryMember => {
    const session = buildMemberSession(routine, m.userId, logs)
    const totals = recap.totals[i]!
    return {
      userId: m.userId,
      displayName: m.displayName,
      finishedAt: m.finishedAt,
      done: progress.segments[i]!.done,
      planned: progress.plannedPerMember,
      sets: totals.sets,
      volume: totals.volume,
      seconds: secondsBetween(startedAt, m.finishedAt),
      currentExercise: session.currentExercise,
      highlight: highlightOf(m.userId, recap.exercises),
    }
  })

  const moments: Moment[] = []
  for (const exercise of clearedExercises(routine, ids, logs)) {
    const at = clearedAt(exercise, routine, members, logs)
    if (at) moments.push({ kind: 'cleared', exercise, at })
  }
  for (const m of members) {
    if (m.finishedAt) moments.push({ kind: 'finished', userId: m.userId, at: m.finishedAt })
  }
  moments.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  const lastFinish = progress.allFinished
    ? members.reduce<string | null>(
        (latest, m) => (!latest || Date.parse(m.finishedAt!) > Date.parse(latest) ? m.finishedAt : latest),
        null,
      )
    : null

  return {
    members: summaryMembers,
    team: {
      done: progress.done,
      total: progress.total,
      sets: recap.totals.reduce((sum, t) => sum + t.sets, 0),
      volume: recap.totals.reduce((sum, t) => sum + t.volume, 0),
      finished: progress.finished,
      members: progress.members,
      allFinished: progress.allFinished,
    },
    seconds: secondsBetween(startedAt, lastFinish),
    moments,
    exercises: recap.exercises,
  }
}

/**
 * How loud the group recap is, in the language of `celebrationTier`: most
 * group workouts are a calm `routine`. A `win` is when everyone finished the
 * whole plan. An `event` is a `win` by three or more, which is rare enough
 * to mean something.
 */
export function groupCelebrationTier(summary: RoomSummary): 'routine' | 'win' | 'event' {
  const { team } = summary
  const complete = team.allFinished && team.total > 0 && team.done >= team.total
  if (!complete) return 'routine'
  return team.members >= 3 ? 'event' : 'win'
}
