import { WorkoutParser, WorkoutSession } from '@/lib/wtx'

export type ParseSessionResult =
  { ok: true; session: WorkoutSession } | { ok: false; error: string }

/**
 * Parses `.wts` session text without throwing.
 *
 * @param text - Raw file contents.
 * @returns The parsed session, or the parser's error message.
 */
export function parseSessionText(text: string): ParseSessionResult {
  try {
    return { ok: true, session: WorkoutParser.parseSession(text) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
