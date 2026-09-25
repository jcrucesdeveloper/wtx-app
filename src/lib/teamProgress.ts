import { buildMemberSession, type MemberSetLog, type PlannedExercise } from '@/lib/memberSession'

/**
 * The group vs the routine, not the group vs each other. Cooperative goals
 * beat competitive ones for enjoyment and effort among friends, and the
 * Köhler effect is strongest when the team only succeeds once *everyone*
 * does — so progress here is shared, with each member's part kept visible
 * (so nobody coasts) but never ranked.
 */

export interface TeamMember {
  userId: string
  displayName: string
  finishedAt: string | null
}

export interface TeamProgress {
  /** Planned working sets for one person — everyone follows the same routine. */
  plannedPerMember: number
  /** `plannedPerMember × members`. */
  total: number
  /** Working sets done towards the plan, across the team. */
  done: number
  /** Each member's part of `done`, in join order (never sorted). */
  segments: { userId: string; done: number }[]
  finished: number
  members: number
  allFinished: boolean
}

/** Sets that count towards the plan: per exercise, capped at what was planned (extras don't pad the bar). */
function contribution(routine: PlannedExercise[], userId: string, logs: MemberSetLog[]): number {
  return buildMemberSession(routine, userId, logs).exercises.reduce(
    (sum, e) => sum + (e.planned === null ? 0 : Math.min(e.done, e.planned)),
    0,
  )
}

export function teamProgress(routine: PlannedExercise[], members: TeamMember[], logs: MemberSetLog[]): TeamProgress {
  const plannedPerMember = buildMemberSession(routine, '', []).planned
  const segments = members.map((m) => ({ userId: m.userId, done: contribution(routine, m.userId, logs) }))
  const finished = members.filter((m) => m.finishedAt).length
  return {
    plannedPerMember,
    total: plannedPerMember * members.length,
    done: segments.reduce((sum, s) => sum + s.done, 0),
    segments,
    finished,
    members: members.length,
    allFinished: members.length > 0 && finished === members.length,
  }
}

/** Routine exercises every member has finished (planned working sets all done), in routine order. */
export function clearedExercises(routine: PlannedExercise[], memberIds: string[], logs: MemberSetLog[]): string[] {
  if (!memberIds.length) return []
  const sessions = memberIds.map((id) => buildMemberSession(routine, id, logs))
  const first = sessions[0]!
  return first.exercises
    .filter((e) => e.planned !== null && e.planned > 0)
    .filter((e) =>
      sessions.every((s) => {
        const mine = s.exercises.find((x) => x.name === e.name)
        return !!mine && mine.planned !== null && mine.done >= mine.planned
      }),
    )
    .map((e) => e.name)
}

export interface LastOneIn {
  userId: string
  name: string
  /** Planned working sets they still have (0 if they're done but haven't tapped Finish). */
  setsLeft: number
}

/**
 * The one member everyone is waiting on, once all the others are done — the
 * "weak link" whose effort the team now depends on. Framed as support in the
 * UI ("the team's with you"), never as blame.
 */
export function lastOneIn(routine: PlannedExercise[], members: TeamMember[], logs: MemberSetLog[]): LastOneIn | null {
  if (members.length < 2) return null
  const planned = buildMemberSession(routine, '', []).planned
  const status = members.map((m) => {
    const done = contribution(routine, m.userId, logs)
    return { member: m, done, complete: !!m.finishedAt || (planned > 0 && done >= planned) }
  })
  const remaining = status.filter((s) => !s.complete)
  if (remaining.length !== 1) return null
  const last = remaining[0]!
  return { userId: last.member.userId, name: last.member.displayName, setsLeft: Math.max(0, planned - last.done) }
}
