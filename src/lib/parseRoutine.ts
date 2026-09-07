import { WorkoutParser, WorkoutTemplate } from '@/lib/wtx'

export type ParseResult = { ok: true; template: WorkoutTemplate } | { ok: false; error: string }

/**
 * Parses `.wtt` template text without throwing.
 *
 * @param text - Raw file contents.
 * @returns The parsed template, or the parser's error message.
 */
export function parseTemplateText(text: string): ParseResult {
  try {
    return { ok: true, template: WorkoutParser.parseTemplate(text) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
