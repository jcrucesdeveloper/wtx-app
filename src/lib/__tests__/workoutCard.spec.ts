import { describe, it, expect } from 'vitest'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  SAFE_BOTTOM,
  SAFE_TOP,
  SQUARE_MARGIN,
  coverCrop,
  drawWorkoutCard,
  fitLifts,
  topLifts,
  liftRowsFor,
  photoRect,
  workoutCardContent,
  workoutCardFrame,
  workoutCardSize,
  type WorkoutCardData,
  type WorkoutCardFormat,
  type WorkoutCardLabels,
  type WorkoutCardLift,
  type WorkoutCardStyle,
} from '../workoutCard'
import { parseSessionText } from '../parseSession'
import { formatNumber } from '../format'
import type { WorkoutSession } from '../wtx'

const EN: WorkoutCardLabels = {
  eyebrow: 'Workout complete',
  time: 'time',
  sets: 'sets',
  exercises: 'exercises',
  volume: 'kg volume',
  record: 'New PR',
  records: (count) => `${count} new PRs`,
  recordMark: 'PR',
  streakLabel: 'Streak',
  streak: (weeks) => `${weeks}-week streak`,
  progressLabel: 'Vs last time',
  progress: (volume) => `+${volume} kg volume`,
  more: (count) => `+${count} more`,
}

const ES: WorkoutCardLabels = {
  eyebrow: 'Entrenamiento completado',
  time: 'tiempo',
  sets: 'series',
  exercises: 'ejercicios',
  volume: 'kg de volumen',
  record: 'Nuevo récord personal',
  records: (count) => `${count} récords nuevos`,
  recordMark: 'PR',
  streakLabel: 'Racha',
  streak: (weeks) => `Racha de ${weeks} semanas`,
  progressLabel: 'Vs. la última vez',
  progress: (volume) => `+${volume} kg de volumen`,
  more: (count) => `+${count} más`,
}

function session(name: string, lines: string[], unit = 'kg'): WorkoutSession {
  const result = parseSessionText(`# ${name} - 2026-10-13\nunit: ${unit}\n\n${lines.join('\n')}\n`)
  if (!result.ok) throw new Error(result.error)
  return result.session
}

/** An exercise with `sets` identical logged sets. */
function lift(name: string, weight: number, reps: number, sets = 3): string[] {
  return [
    `${name} | ${sets}x${reps} | ${weight}`,
    ...Array.from({ length: sets }, (_, i) => `${i + 1} | ${weight} | ${reps}`),
  ]
}

function content(
  s: WorkoutSession,
  recap: Parameters<typeof workoutCardContent>[0]['recap'] = null,
  labels = EN,
): WorkoutCardData {
  return workoutCardContent({
    session: s,
    recap,
    labels,
    host: 'wtxworkout.com',
    accent: '#e0263a',
  })
}

const pr = (exerciseName: string, weight: number, reps: number) => ({
  exerciseName,
  weight,
  reps,
  previousWeight: weight - 2.5,
  previousReps: reps,
})

const SMALL = session('Quick Pull', lift('Pull Up', 0, 8, 2))
const TYPICAL = session('Push Day', [
  ...lift('Bench Press', 72.5, 5, 4),
  ...lift('Overhead Press', 55, 8),
  ...lift('Lateral Raise', 10, 15),
])
const HUGE = session(
  'Saturday Full Lower Body Volume Session With Accessories And Core Work To Finish',
  Array.from({ length: 16 }, (_, i) =>
    lift(`Exercise Number ${i + 1} With A Long Name`, 200 - i * 7.5, 8, 5),
  ).flat(),
)

describe('workoutCardContent', () => {
  it('leads with time, sets and volume', () => {
    const data = content(TYPICAL, { elapsedSeconds: 3125, weekStreak: 0, personalRecords: [] })
    expect(data.stats).toEqual([
      { value: '52:05', label: 'time' },
      { value: '10', label: 'sets' },
      { value: formatNumber(3220), label: 'kg volume' },
    ])
  })

  it('has no time without a recap, and counts exercises when nothing was loaded', () => {
    expect(content(SMALL).stats).toEqual([
      { value: '2', label: 'sets' },
      { value: '1', label: 'exercises' },
    ])
  })

  it('lists the best set of each exercise, in the order it was done', () => {
    const data = content(TYPICAL)
    expect(data.lifts).toEqual([
      // 72.5 must not be rounded to 73.
      { name: 'Bench Press', detail: '72.5 kg × 5' },
      { name: 'Overhead Press', detail: '55 kg × 8' },
      { name: 'Lateral Raise', detail: '10 kg × 15' },
    ])
  })

  it('shows reps alone for a bodyweight set and a duration for a timed one', () => {
    const data = content(
      session('Core', ['Pull Up | 1x8 | 0', '1 | 0 | 8', 'Plank | 1x60 | 0 | time', '1 | 0 | 90']),
    )
    expect(data.lifts.map((l) => l.detail)).toEqual(['× 8', '1m30s'])
  })

  it('leaves out an exercise with nothing logged', () => {
    const data = content(session('Push Day', ['Bench Press | 3x5 | 100', ...lift('Dips', 0, 10)]))
    expect(data.lifts.map((l) => l.name)).toEqual(['Dips'])
  })

  it('highlights the top record and marks every record lift', () => {
    const data = content(TYPICAL, {
      elapsedSeconds: 60,
      weekStreak: 9,
      personalRecords: [pr('bench press', 72.5, 5), pr('Lateral Raise', 10, 15)],
    })
    // Two records: the label counts them, the text shows the top one.
    expect(data.highlight).toEqual({ label: '2 new PRs', text: 'bench press · 72.5 kg × 5' })
    expect(data.lifts.filter((l) => l.record).map((l) => l.name)).toEqual([
      'Bench Press',
      'Lateral Raise',
    ])
    const one = content(TYPICAL, {
      elapsedSeconds: 60,
      weekStreak: 9,
      personalRecords: [pr('Bench Press', 72.5, 5)],
    })
    expect(one.highlight?.label).toBe('New PR')
  })

  it('falls back to the streak, and to nothing for a streak of one', () => {
    expect(
      content(TYPICAL, { elapsedSeconds: 60, weekStreak: 4, personalRecords: [] }).highlight,
    ).toEqual({
      label: 'Streak',
      text: '4-week streak',
    })
    expect(
      content(TYPICAL, { elapsedSeconds: 60, weekStreak: 1, personalRecords: [] }).highlight,
    ).toBeUndefined()
  })

  it('puts progress on last time after a record and before the streak', () => {
    const up = { volumeDelta: 1250, workingSetsDelta: 1, isVolumeUp: true }
    const recap = { elapsedSeconds: 60, weekStreak: 4, personalRecords: [], comparison: up }
    expect(content(TYPICAL, recap).highlight).toEqual({
      label: 'Vs last time',
      text: `+${formatNumber(1250)} kg volume`,
    })
    // A record still leads.
    const withPr = { ...recap, personalRecords: [pr('Bench Press', 72.5, 5)] }
    expect(content(TYPICAL, withPr).highlight?.label).toBe('New PR')
    // Less volume than last time is never the headline: the streak takes over.
    const down = { volumeDelta: -300, workingSetsDelta: 0, isVolumeUp: false }
    expect(content(TYPICAL, { ...recap, comparison: down }).highlight?.label).toBe('Streak')
  })

  it('uses the translated exercise names and labels', () => {
    const data = workoutCardContent({
      session: TYPICAL,
      recap: { elapsedSeconds: 60, weekStreak: 0, personalRecords: [pr('Bench Press', 72.5, 5)] },
      labels: ES,
      exerciseName: (name) => (name === 'Bench Press' ? 'Press de banca' : name),
      host: 'wtxworkout.com',
      accent: '#e0263a',
    })
    expect(data.lifts[0]).toEqual({ name: 'Press de banca', detail: '72.5 kg × 5', record: true })
    expect(data.highlight).toEqual({
      label: 'Nuevo récord personal',
      text: 'Press de banca · 72.5 kg × 5',
    })
    expect(data.stats.map((s) => s.label)).toEqual(['tiempo', 'series', 'kg de volumen'])
  })

  it('carries nothing but the workout: no account, no date, no notes', () => {
    const noted = session('Push Day', [
      'Bench Press | 1x5 | 100 | felt a twinge in my shoulder',
      '1 | 100 | 5',
    ])
    expect(JSON.stringify(content(noted))).not.toMatch(/twinge|2026/)
  })
})

describe('topLifts', () => {
  const lifts = (names: string[], records: string[] = []): WorkoutCardLift[] =>
    names.map((name) => ({
      name,
      detail: '1',
      ...(records.includes(name) ? { record: true } : {}),
    }))

  it('keeps them all when there are few enough', () => {
    expect(topLifts(lifts(['A', 'B']), 3).map((l) => l.name)).toEqual(['A', 'B'])
  })

  it('takes records first, then the earliest, shown in the order they were done', () => {
    const picked = topLifts(lifts(['A', 'B', 'C', 'D', 'E'], ['D']), 3)
    expect(picked.map((l) => l.name)).toEqual(['A', 'B', 'D'])
  })
})

describe('fitLifts', () => {
  const lifts: WorkoutCardLift[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => ({
    name,
    detail: '1',
  }))

  it('shows them all when they fit', () => {
    expect(fitLifts(lifts, 6)).toEqual({ rows: lifts, more: 0 })
  })

  it('gives one row to the count of the rest when they do not', () => {
    const { rows, more } = fitLifts(lifts, 4)
    expect(rows.map((l) => l.name)).toEqual(['a', 'b', 'c'])
    expect(more).toBe(3)
  })

  it('keeps records ahead of the rest, in the order they were done', () => {
    const marked = lifts.map((l) => (l.name === 'e' || l.name === 'b' ? { ...l, record: true } : l))
    const { rows, more } = fitLifts(marked, 4)
    expect(rows.map((l) => l.name)).toEqual(['a', 'b', 'e'])
    expect(more).toBe(3)
  })

  it('shows only the count when there is no room for a row', () => {
    expect(fitLifts(lifts, 1)).toEqual({ rows: [], more: 6 })
    expect(fitLifts(lifts, 0)).toEqual({ rows: [], more: 6 })
  })
})

describe('coverCrop', () => {
  it('crops the sides of a landscape photo to fill a story', () => {
    expect(coverCrop(4000, 3000, 1080, 1920)).toEqual({ sx: 1156.25, sy: 0, sw: 1687.5, sh: 3000 })
  })

  it('crops the top and bottom of a photo taller than a story', () => {
    const crop = coverCrop(1000, 4000, 1080, 1920)
    expect(crop.sx).toBeCloseTo(0)
    expect(crop.sw).toBeCloseTo(1000)
    expect(crop.sy).toBeCloseTo((4000 - crop.sh) / 2)
    expect(crop.sw / crop.sh).toBeCloseTo(1080 / 1920)
  })

  it('uses a photo that is already 9:16 whole', () => {
    expect(coverCrop(1080, 1920, 1080, 1920)).toEqual({ sx: 0, sy: 0, sw: 1080, sh: 1920 })
  })
})

/**
 * A canvas context that records where text lands instead of drawing it. Text
 * is measured as 0.62 of its font size per character — wider than the real
 * font, so anything that fits here fits on a phone.
 */
function recordingContext() {
  const texts: { text: string; left: number; right: number; top: number; bottom: number }[] = []
  const state = { font: '10px sans-serif', fillStyle: '' as unknown }
  const size = () => Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? 10)
  const width = (text: string) => text.length * size() * 0.62
  const gradient = { addColorStop: () => {} }
  const target: Record<string, unknown> = {
    measureText: (text: string) => ({ width: width(text) }),
    fillText: (text: string, x: number, y: number) =>
      texts.push({
        text,
        left: x,
        right: x + width(text),
        top: y - size(),
        bottom: y + size() * 0.25,
      }),
    createLinearGradient: () => gradient,
  }
  const ctx = new Proxy(target, {
    get: (t, key: string) => (key in t ? t[key] : key in state ? state[key as 'font'] : () => {}),
    set: (_, key: string, value) => {
      ;(state as Record<string, unknown>)[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, texts }
}

const CASES: [string, WorkoutCardData][] = [
  ['a small workout with no record or streak', content(SMALL)],
  [
    'a typical workout with a record',
    content(TYPICAL, {
      elapsedSeconds: 3125,
      weekStreak: 6,
      personalRecords: [pr('Bench Press', 72.5, 5)],
    }),
  ],
  [
    'a huge workout with a very long name',
    content(HUGE, {
      elapsedSeconds: 3 * 3600 + 59 * 60 + 59,
      weekStreak: 52,
      personalRecords: [pr('Exercise Number 14 With A Long Name', 102.5, 8)],
    }),
  ],
  [
    'a workout in Spanish with a streak',
    content(HUGE, { elapsedSeconds: 2890, weekStreak: 14, personalRecords: [] }, ES),
  ],
  [
    'a workout in Spanish with a record',
    content(
      TYPICAL,
      { elapsedSeconds: 2890, weekStreak: 2, personalRecords: [pr('Overhead Press', 55, 8)] },
      ES,
    ),
  ],
]

describe('drawWorkoutCard', () => {
  for (const style of ['card', 'photo'] as WorkoutCardStyle[]) {
    describe(`as a ${style}`, () => {
      it.each(CASES)('keeps %s clear of the story interface and inside the frame', (_, data) => {
        const { ctx, texts } = recordingContext()
        drawWorkoutCard(ctx, data, style)

        expect(texts.length).toBeGreaterThan(0)
        for (const t of texts) {
          expect(t.top).toBeGreaterThanOrEqual(SAFE_TOP)
          expect(t.bottom).toBeLessThanOrEqual(CARD_HEIGHT - SAFE_BOTTOM)
          expect(t.left).toBeGreaterThanOrEqual(0)
          expect(t.right).toBeLessThanOrEqual(CARD_WIDTH)
        }
      })
    })
  }

  it.each(CASES)('sizes the sticker to %s and keeps everything inside it', (_, data) => {
    const { ctx, texts } = recordingContext()
    const size = workoutCardSize(ctx, data, 'sticker')
    drawWorkoutCard(ctx, data, 'sticker')

    expect(size.width).toBe(CARD_WIDTH)
    expect(size.height).toBeLessThan(CARD_HEIGHT / 2)
    for (const t of texts) {
      expect(t.top).toBeGreaterThanOrEqual(0)
      expect(t.bottom).toBeLessThanOrEqual(size.height)
      expect(t.right).toBeLessThanOrEqual(CARD_WIDTH)
    }
  })

  it.each(['card', 'photo', 'sticker'] as WorkoutCardStyle[])(
    'names the app and its address on the %s, small',
    (style) => {
      const { ctx, texts } = recordingContext()
      const data = CASES[1]![1]
      drawWorkoutCard(ctx, data, style)

      const brand = texts.find((t) => t.text === 'WTX')!
      const host = texts.find((t) => t.text === 'wtxworkout.com')!
      const title = texts.find((t) => t.text === 'Push Day')!
      expect(brand).toBeDefined()
      expect(host).toBeDefined()
      // Present, but never the largest thing on the image.
      expect(brand.bottom - brand.top).toBeLessThan((title.bottom - title.top) / 1.5)
    },
  )

  it('shows only the top three lifts by default, with no count of the rest', () => {
    const data = CASES[2]![1]
    const { ctx, texts } = recordingContext()
    drawWorkoutCard(ctx, data, 'card')
    // Long names are cut with an ellipsis, so a row is found by its start, under the totals.
    const totals = texts.find((t) => t.text === data.stats[1]!.label)!
    const rows = texts.filter((t) => t.text.startsWith('Exercise Number') && t.top > totals.bottom)
    expect(rows).toHaveLength(3)
    expect(texts.some((t) => t.text.endsWith(' more'))).toBe(false)
    // The record is one of them.
    expect(texts.some((t) => t.text === 'PR')).toBe(true)
  })

  it('lists every lift that fits when asked, and says how many did not fit', () => {
    const data = { ...CASES[2]![1], allLifts: true }
    const card = recordingContext()
    drawWorkoutCard(card.ctx, data, 'card')
    const more = card.texts.map((t) => /^\+(\d+) more$/.exec(t.text)?.[1]).find(Boolean)
    // Sixteen lifts never fit: at least two are shown and the rest are counted.
    expect(Number(more)).toBeGreaterThan(0)
    expect(Number(more)).toBeLessThanOrEqual(14)
    // The record is one of the lifts that made it.
    expect(card.texts.some((t) => t.text === 'PR')).toBe(true)

    const photo = recordingContext()
    drawWorkoutCard(photo.ctx, data, 'photo')
    // No rows of lifts over a photo: no record marks, no count of the rest.
    expect(photo.texts.some((t) => t.text === 'PR' || t.text.endsWith(' more'))).toBe(false)
  })

  it.each(['card', 'photo', 'sticker'] as WorkoutCardStyle[])(
    'puts the record on the %s right under the name, above the totals',
    (style) => {
      const { ctx, texts } = recordingContext()
      const data = CASES[1]![1]
      drawWorkoutCard(ctx, data, style)
      const title = texts.find((t) => t.text === 'Push Day')!
      const record = texts.find((t) => t.text === data.highlight!.text)!
      const sets = texts.find((t) => t.text === data.stats[1]!.label)!
      expect(record.top).toBeGreaterThan(title.bottom)
      expect(record.bottom).toBeLessThan(sets.top)
    },
  )

  it('cuts a very long name to two lines', () => {
    const { ctx, texts } = recordingContext()
    drawWorkoutCard(ctx, CASES[2]![1], 'card')
    const titleLines = texts.filter((t) => t.text.startsWith('Saturday') || t.text.endsWith('…'))
    expect(titleLines.filter((t) => t.bottom - t.top > 80)).toHaveLength(2)
  })
})

describe('the square format', () => {
  it('is 1080 square with an even margin, and the story keeps its safe zones', () => {
    expect(workoutCardFrame('square')).toEqual({
      width: CARD_WIDTH,
      height: CARD_WIDTH,
      safeTop: SQUARE_MARGIN,
      safeBottom: SQUARE_MARGIN,
    })
    expect(workoutCardFrame()).toEqual({
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      safeTop: SAFE_TOP,
      safeBottom: SAFE_BOTTOM,
    })
  })

  it.each(['card', 'photo'] as WorkoutCardStyle[])(
    'sizes the %s by its format, and the sticker by its content',
    (style) => {
      const { ctx } = recordingContext()
      const data = CASES[1]![1]
      expect(workoutCardSize(ctx, data, style, 'square')).toEqual({ width: 1080, height: 1080 })
      expect(workoutCardSize(ctx, data, style, 'story')).toEqual({ width: 1080, height: 1920 })
      expect(workoutCardSize(ctx, data, 'sticker', 'square')).toEqual(
        workoutCardSize(ctx, data, 'sticker'),
      )
    },
  )

  for (const style of ['card', 'photo'] as WorkoutCardStyle[]) {
    it.each(CASES)(`keeps %s inside the margin of a square ${style}`, (_, data) => {
      const { ctx, texts } = recordingContext()
      drawWorkoutCard(ctx, data, style, undefined, 'square')

      expect(texts.some((t) => t.text === 'WTX')).toBe(true)
      for (const t of texts) {
        expect(t.top).toBeGreaterThanOrEqual(SQUARE_MARGIN)
        expect(t.bottom).toBeLessThanOrEqual(CARD_WIDTH - SQUARE_MARGIN)
        expect(t.left).toBeGreaterThanOrEqual(0)
        expect(t.right).toBeLessThanOrEqual(CARD_WIDTH)
      }
    })
  }

  it('fits some lifts on a square card when there is room, and never a lone "+N more"', () => {
    for (const [, base] of CASES) {
      const data = { ...base, allLifts: true }
      const { ctx, texts } = recordingContext()
      drawWorkoutCard(ctx, data, 'card', undefined, 'square')
      const shown = data.lifts.filter((lift) => texts.some((t) => t.text === lift.detail))
      const more = texts.some((t) => t.text.endsWith(' more') || t.text.endsWith(' más'))
      // A "+N more" line only ever follows at least one lift.
      expect(!more || shown.length > 0).toBe(true)
    }
    // A small workout with no highlight has room for its one lift.
    const small = recordingContext()
    drawWorkoutCard(small.ctx, CASES[0]![1], 'card', undefined, 'square')
    expect(small.texts.some((t) => t.text === '× 8')).toBe(true)
  })

  it('draws the story exactly as before when no format is given', () => {
    const a = recordingContext()
    const b = recordingContext()
    const format: WorkoutCardFormat = 'story'
    drawWorkoutCard(a.ctx, CASES[2]![1], 'card')
    drawWorkoutCard(b.ctx, CASES[2]![1], 'card', undefined, format)
    expect(b.texts).toEqual(a.texts)
  })
})

describe('liftRowsFor', () => {
  it('gives no rows when fewer than two would fit', () => {
    expect(liftRowsFor(-10)).toBe(0)
    expect(liftRowsFor(100)).toBe(0)
    expect(liftRowsFor(176)).toBe(2)
    expect(liftRowsFor(900)).toBe(10)
  })
})

describe('the photo look, as a frame', () => {
  const FORMATS: WorkoutCardFormat[] = ['story', 'square']

  for (const format of FORMATS) {
    it.each(CASES)(`never draws text over the photo of a ${format} with %s`, (_, data) => {
      const { ctx, texts } = recordingContext()
      drawWorkoutCard(ctx, data, 'photo', undefined, format)
      const rect = photoRect(data, format)
      for (const t of texts) expect(t.top).toBeGreaterThan(rect.y + rect.height)
    })

    it(`gives the photo most of a ${format}, and draws it into exactly that space`, () => {
      const data = CASES[1]![1]
      const frame = workoutCardFrame(format)
      const rect = photoRect(data, format)
      expect((rect.width * rect.height) / (frame.width * frame.height)).toBeGreaterThan(0.55)
      // Of the part a story leaves visible, the photo is the larger share by far.
      const seen =
        Math.min(rect.y + rect.height, frame.height - frame.safeBottom) -
        Math.max(rect.y, frame.safeTop)
      expect(seen / (frame.height - frame.safeTop - frame.safeBottom)).toBeGreaterThan(0.6)

      const drawn: number[][] = []
      const { ctx } = recordingContext()
      ;(ctx as unknown as { drawImage: (...a: number[]) => void }).drawImage = (_img, ...a) =>
        drawn.push(a)
      const photo = { width: 3000, height: 4000 } as unknown as HTMLImageElement
      drawWorkoutCard(ctx, data, 'photo', photo, format)
      expect(drawn).toHaveLength(1)
      expect(drawn[0]!.slice(4)).toEqual([rect.x, rect.y, rect.width, rect.height])
    })

    it(`keeps every word in the frame of a ${format} at least about 11 pt on a phone`, () => {
      for (const [, data] of CASES) {
        const { ctx, texts } = recordingContext()
        drawWorkoutCard(ctx, data, 'photo', undefined, format)
        // 31 px of a 1080 px image is 11 pt across a 390 pt wide phone.
        for (const t of texts) expect(t.bottom - t.top).toBeGreaterThanOrEqual(31 * 1.25)
      }
    })
  }

  it('makes the photo larger when there is no highlight to fit under it', () => {
    const plain = CASES[0]![1]
    const record = CASES[1]![1]
    expect(photoRect(plain).height).toBeGreaterThan(photoRect(record).height)
  })
})
