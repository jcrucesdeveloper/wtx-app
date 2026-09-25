import type { ExerciseBest } from '@/lib/sessionRecords'

/** The cheers anyone in a room can send each other. */
export const REACTION_EMOJIS = ['💪', '🔥', '👏', '🙌', '😤', '🚀'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && (REACTION_EMOJIS as readonly string[]).includes(value)
}

/**
 * Something that happened in the room, for live toasts. Reactions and PRs
 * arrive over Realtime Broadcast (ephemeral, never stored); the rest are
 * derived from `room_members` / `set_logs` changes.
 */
export type RoomEvent = { id: string; at: number; from: string } & (
  | { kind: 'reaction'; to: string; emoji: ReactionEmoji }
  | { kind: 'pr'; exercise: string; weight: number; reps: number }
  | { kind: 'exercise-done'; exercise: string }
  | { kind: 'finished' }
  | { kind: 'joined' }
  // Team moments (`from` is '' — they belong to everyone).
  | { kind: 'team-cleared'; exercise: string }
  | { kind: 'team-finished' }
)

/** Payload of a `reaction` broadcast. */
export interface ReactionPayload {
  from: string
  to: string
  emoji: ReactionEmoji
}

/** Payload of a `pr` broadcast. */
export interface PrPayload {
  from: string
  exercise: string
  weight: number
  reps: number
}

const isShortString = (v: unknown, max = 120): v is string => typeof v === 'string' && v.length > 0 && v.length <= max
const isSaneNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 100_000

/** Broadcasts come from other clients — accept only well-formed payloads. */
export function parseReactionPayload(value: unknown): ReactionPayload | null {
  const p = value as Partial<ReactionPayload> | null
  if (!p || !isShortString(p.from, 64) || !isShortString(p.to, 64) || !isReactionEmoji(p.emoji)) return null
  return { from: p.from, to: p.to, emoji: p.emoji }
}

export function parsePrPayload(value: unknown): PrPayload | null {
  const p = value as Partial<PrPayload> | null
  if (!p || !isShortString(p.from, 64) || !isShortString(p.exercise) || !isSaneNumber(p.weight) || !isSaneNumber(p.reps)) {
    return null
  }
  return { from: p.from, exercise: p.exercise, weight: p.weight, reps: p.reps }
}

/**
 * Whether a working set is a new personal record worth announcing live —
 * the same rule as the end-of-workout recap (`detectPersonalRecords`):
 * strictly heavier than the all-time best, and only for exercises with
 * history. Within one workout, only a set heavier than the last one
 * announced counts again.
 */
export function isLiveRecord(
  prior: ExerciseBest | undefined,
  announcedThisWorkout: number | undefined,
  weight: number,
): boolean {
  if (!prior || weight <= prior.weight) return false
  return announcedThisWorkout === undefined || weight > announcedThisWorkout
}

/** Whether this set is the one that completes the exercise's planned working sets. */
export function completesExercise(planned: number | undefined, workingSetsBefore: number): boolean {
  return !!planned && planned > 0 && workingSetsBefore + 1 === planned
}
