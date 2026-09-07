import type {
  ExerciseType,
  Session,
  SessionExercise,
  SessionSet,
  Template,
  TemplateExercise,
} from './types'
import { WorkoutSession } from './WorkoutSession'
import { WorkoutTemplate } from './WorkoutTemplate'

const META_RE = /^([a-zA-Z_]+):\s*(.*)$/
const SET_LABEL_RE = /^(W|\d+)$/
const NUMBER_RE = /^-?\d+(\.\d+)?$/
const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/

export class WorkoutParser {
  /**
   * Parses the contents of a `.wtt` template file.
   *
   * @param text - Raw file contents.
   * @returns The parsed template, including its exercises.
   * @throws If the name line or an exercise/metadata line is malformed.
   */
  static parseTemplate(text: string): WorkoutTemplate {
    return new WorkoutTemplate(WorkoutParser.parseTemplateRaw(text))
  }

  /**
   * Parses a `.wtt` file into its raw data shape, before any domain wrapping.
   *
   * @param text - Raw file contents.
   * @returns The plain {@link Template} record.
   * @throws If the name line or an exercise/metadata line is malformed.
   */
  static parseTemplateRaw(text: string): Template {
    let name: string | undefined
    const meta: Record<string, string> = {}
    const exercises: TemplateExercise[] = []

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (line === '') continue

      if (line.startsWith('#')) {
        name = line.slice(1).trim()
        continue
      }

      if (line.includes('|')) {
        exercises.push(WorkoutParser.parseTemplateExerciseLine(line))
        continue
      }

      const metaMatch = META_RE.exec(line)
      if (!metaMatch) {
        throw new Error(`Unrecognized line: "${line}"`)
      }
      meta[metaMatch[1]!] = metaMatch[2] ?? ''
    }

    if (!name) {
      throw new Error('Template is missing a name line (e.g. "# Push Day")')
    }

    return {
      name,
      unit: meta.unit,
      description: meta.description,
      notes: meta.notes,
      tags: meta.tags
        ? meta.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : undefined,
      exercises,
    }
  }

  /**
   * Parses the contents of a `.wts` session file.
   *
   * @param text - Raw file contents.
   * @returns The parsed session, including logged sets per exercise.
   * @throws If the header line or an exercise/set/metadata line is malformed.
   */
  static parseSession(text: string): WorkoutSession {
    return new WorkoutSession(WorkoutParser.parseSessionRaw(text))
  }

  /**
   * Parses a `.wts` file into its raw data shape, before any domain wrapping.
   *
   * @param text - Raw file contents.
   * @returns The plain {@link Session} record.
   * @throws If the header line or an exercise/set/metadata line is malformed.
   */
  static parseSessionRaw(text: string): Session {
    let name: string | undefined
    let date: string | undefined
    const meta: Record<string, string> = {}
    const exercises: SessionExercise[] = []

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (line === '') continue

      if (line.startsWith('#')) {
        ;({ name, date } = WorkoutParser.parseSessionHeader(line))
        continue
      }

      if (!line.includes('|')) {
        const metaMatch = META_RE.exec(line)
        if (!metaMatch) {
          throw new Error(`Unrecognized line: "${line}"`)
        }
        meta[metaMatch[1]!] = metaMatch[2] ?? ''
        continue
      }

      const firstField = line.slice(0, line.indexOf('|')).trim()
      if (SET_LABEL_RE.test(firstField)) {
        const current = exercises[exercises.length - 1]
        if (!current) {
          throw new Error(`Set line with no preceding exercise: "${line}"`)
        }
        current.loggedSets.push(WorkoutParser.parseSetLine(line))
      } else {
        exercises.push({ ...WorkoutParser.parseSessionExerciseLine(line), loggedSets: [] })
      }
    }

    if (!name || !date) {
      throw new Error('Session is missing a header line (e.g. "# Push Day - 2026-08-21")')
    }

    return {
      name,
      date,
      template: meta.template,
      unit: meta.unit,
      description: meta.description,
      notes: meta.notes,
      exercises,
    }
  }

  /**
   * Splits a `Name | field | field` line into trimmed fields.
   *
   * @param line - A single line from a template or session file.
   * @returns The trimmed fields, in order.
   */
  private static splitFields(line: string): string[] {
    return line.split('|').map((field) => field.trim())
  }

  /**
   * Checks whether a field is a bare number (used for the untagged weight field).
   *
   * @param field - A single trimmed field.
   * @returns True if the field is a plain integer or decimal.
   */
  private static isNumber(field: string): boolean {
    return NUMBER_RE.test(field)
  }

  /**
   * Parses a compact duration like `1m30s`, `2m`, or `45s` into total seconds.
   *
   * @param raw - The duration text, without its `time `/`rest ` prefix.
   * @returns The duration in seconds.
   * @throws If the text doesn't match the `<h>h<m>m<s>s` shape.
   */
  private static parseDurationInSeconds(raw: string): number {
    const value = raw.trim()
    const match = DURATION_RE.exec(value)
    if (!match) {
      throw new Error(`Invalid duration: "${raw}"`)
    }

    const [, h, m, s] = match
    if (!h && !m && !s) {
      throw new Error(`Invalid duration: "${raw}"`)
    }

    return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0)
  }

  /**
   * Parses a template's `reps 4x8` or `time 1m30s` field into an {@link ExerciseType}.
   *
   * @param field - The type field, including its `reps `/`time ` prefix.
   * @returns The parsed exercise type.
   * @throws If the field is missing its prefix or the value is malformed.
   */
  private static parseExerciseType(field: string): ExerciseType {
    if (field.startsWith('reps ')) {
      const value = field.slice('reps '.length).trim()
      const match = /^(\d+)x(\d+)$/.exec(value)
      if (!match) {
        throw new Error(`Invalid reps field: "${field}"`)
      }
      return { kind: 'reps', sets: Number(match[1]), reps: Number(match[2]) }
    }

    if (field.startsWith('time ')) {
      return {
        kind: 'time',
        seconds: WorkoutParser.parseDurationInSeconds(field.slice('time '.length)),
      }
    }

    throw new Error(`Expected a "reps ..." or "time ..." field, got: "${field}"`)
  }

  /**
   * Parses one exercise line from a `.wtt` template.
   *
   * @param line - `Name | <reps|time> | [Weight] | [rest Duration]`.
   * @returns The parsed exercise.
   * @throws If the name or type is missing, or a trailing field is unrecognized.
   */
  private static parseTemplateExerciseLine(line: string): TemplateExercise {
    const [name, ...rest] = WorkoutParser.splitFields(line)
    if (!name || rest.length === 0) {
      throw new Error(`Invalid exercise line: "${line}"`)
    }

    const exercise: TemplateExercise = { name, type: WorkoutParser.parseExerciseType(rest[0]!) }

    for (const field of rest.slice(1)) {
      if (field.startsWith('rest ')) {
        exercise.restSeconds = WorkoutParser.parseDurationInSeconds(field.slice('rest '.length))
      } else if (field.startsWith('muscle ')) {
        exercise.muscleGroup = field.slice('muscle '.length).trim()
      } else if (WorkoutParser.isNumber(field)) {
        exercise.weight = Number(field)
      } else {
        throw new Error(`Unrecognized field in exercise line: "${field}"`)
      }
    }

    return exercise
  }

  /**
   * Parses a session's `# Name - YYYY-MM-DD` header line.
   *
   * @param line - The header line.
   * @returns The routine name and ISO date.
   * @throws If the line has no ` - ` separator before a `YYYY-MM-DD` date.
   */
  private static parseSessionHeader(line: string): { name: string; date: string } {
    const text = line.slice(1).trim()
    const match = /^(.+?)\s+-\s+(\d{4}-\d{2}-\d{2})$/.exec(text)
    if (!match) {
      throw new Error(`Invalid session header (expected "# Name - YYYY-MM-DD"): "${line}"`)
    }
    return { name: match[1]!.trim(), date: match[2]! }
  }

  /**
   * Parses one exercise line from a `.wts` session (its logged sets are attached separately).
   *
   * @param line - `Name | SetsxReps | Weight | [note]`.
   * @returns The exercise without its {@link SessionSet} list yet.
   * @throws If the name, sets-by-reps, or weight field is missing/malformed.
   */
  private static parseSessionExerciseLine(line: string): Omit<SessionExercise, 'loggedSets'> {
    const [name, setsReps, weight, note] = WorkoutParser.splitFields(line)
    const match = setsReps ? /^(\d+)x(\d+)$/.exec(setsReps) : null
    if (!name || !match || weight === undefined) {
      throw new Error(`Invalid exercise line: "${line}"`)
    }

    return {
      name,
      sets: Number(match[1]),
      reps: Number(match[2]),
      weight: Number(weight),
      note: note || undefined,
    }
  }

  /**
   * Parses one logged set line following a session exercise line.
   *
   * @param line - `Label | Weight | Reps`, where Label is `W` or a set number.
   * @returns The parsed set.
   * @throws If the label, weight, or reps field is missing.
   */
  private static parseSetLine(line: string): SessionSet {
    const [label, weight, reps] = WorkoutParser.splitFields(line)
    if (!label || weight === undefined || reps === undefined) {
      throw new Error(`Invalid set line: "${line}"`)
    }
    return { label, weight: Number(weight), reps: Number(reps) }
  }
}
