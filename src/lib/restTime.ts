import type { WorkoutTemplate } from '@/lib/wtx'
import { draftFromTemplate, type RoutineDraft } from '@/lib/serializeRoutine'

/** The rest lengths offered as one tap, in seconds. `0` is "off". */
export const REST_PRESETS = [0, 30, 60, 90, 120, 180, 240, 300] as const

/** What one press of − or + moves a rest by, in the editor and on the running timer. */
export const REST_STEP_SECONDS = 15

/** Longest rest the editor goes to. */
export const REST_MAX_SECONDS = 600

/**
 * How late the app may notice a rest ran out and still buzz for it. Later
 * than this (the app was in the background) the moment has passed — and on
 * Android the notification has already buzzed for it.
 */
export const REST_END_BUZZ_GRACE_MS = 3000

/** Whether a rest that ended at `endsAt` just ended, as seen at `now`. */
export function restJustEnded(endsAt: number, now: number): boolean {
  return now >= endsAt && now - endsAt <= REST_END_BUZZ_GRACE_MS
}

/** A rest length as the editor keeps it: whole seconds, from 0 (off) to the max. */
export function clampRestSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0
  return Math.min(REST_MAX_SECONDS, Math.max(0, Math.round(seconds)))
}

/**
 * How much of the rest is left, from 1 (just started) to 0 (over). A rest
 * whose length is unknown counts as just started rather than as over.
 */
export function restProgress(remainingSeconds: number, durationSeconds: number | null): number {
  if (remainingSeconds <= 0) return 0
  const total = Math.max(durationSeconds ?? 0, remainingSeconds)
  return Math.min(1, remainingSeconds / total)
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** True if the routine has an exercise by this name, so its rest can be saved there. */
export function routineHasExercise(template: WorkoutTemplate, exerciseName: string): boolean {
  return template.exercises.some((exercise) => sameName(exercise.name, exerciseName))
}

/**
 * The routine as an editable draft with one exercise's rest changed — every
 * exercise by that name, since it is the same movement — and nothing else.
 * `0` takes the rest out. `null` when the routine has no such exercise.
 */
export function routineDraftWithRest(
  template: WorkoutTemplate,
  exerciseName: string,
  seconds: number,
): RoutineDraft | null {
  if (!routineHasExercise(template, exerciseName)) return null
  const draft = draftFromTemplate(template)
  const restSeconds = clampRestSeconds(seconds) || undefined
  for (const exercise of draft.exercises) {
    if (sameName(exercise.name, exerciseName)) exercise.restSeconds = restSeconds
  }
  return draft
}
