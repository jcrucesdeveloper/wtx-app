/**
 * The image shared from the finish screen, in three styles:
 *
 * - `card`    a 9:16 story card: the workout's name and numbers, then the
 *             lifts themselves — a strength workout has no route to show, so
 *             what was lifted is the picture.
 * - `photo`   the user's own photo in a frame, like a Polaroid: the photo
 *             whole and uncovered, the name and the numbers in the band under it.
 * - `sticker` just the numbers on a transparent background, to place over a
 *             photo or video in another app.
 *
 * The card and the photo come as a 9:16 story or a 1:1 square (a feed post,
 * a chat); the sticker is sized to what is on it.
 *
 * Every style carries the app's icon, name and address inside the block of
 * numbers, small: a share says where it came from, and cropping that out
 * means cropping the numbers.
 *
 * A record (or the streak) sits right under the name as the centrepiece: a
 * card is posted for its flex, so the flex leads and the totals back it up.
 */
import type { WorkoutSession } from '@/lib/wtx'
import type { PersonalRecord } from '@/lib/sessionRecords'
import type { SessionComparison } from '@/lib/sessionComparisons'
import { formatClock, formatCompactDuration, formatNumber } from '@/lib/format'
import { isTimeExercise } from '@/lib/sessionTime'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

/**
 * What a story covers with its own interface: the account row at the top, the
 * reply bar (and, on an ad, its button) at the bottom. Nothing is drawn there.
 */
export const SAFE_TOP = 250
export const SAFE_BOTTOM = 340

export type WorkoutCardStyle = 'card' | 'photo' | 'sticker'

/**
 * The shape of the image: a 9:16 `story` (Instagram / WhatsApp status), or a
 * 1:1 `square` for a feed post or a chat. A sticker is always sized to its content.
 */
export type WorkoutCardFormat = 'story' | 'square'

/** The edge of a square card that is kept clear, all round: a feed post has no interface over it. */
export const SQUARE_MARGIN = 72

/** The size of the image, and the bands at the top and bottom that nothing is drawn in. */
export interface WorkoutCardFrame {
  width: number
  height: number
  safeTop: number
  safeBottom: number
}

export function workoutCardFrame(format: WorkoutCardFormat = 'story'): WorkoutCardFrame {
  return format === 'square'
    ? { width: CARD_WIDTH, height: CARD_WIDTH, safeTop: SQUARE_MARGIN, safeBottom: SQUARE_MARGIN }
    : { width: CARD_WIDTH, height: CARD_HEIGHT, safeTop: SAFE_TOP, safeBottom: SAFE_BOTTOM }
}

export interface WorkoutCardStat {
  value: string
  label: string
}

/** One exercise on the card: its name and the best set logged for it. */
export interface WorkoutCardLift {
  name: string
  /** The top set, e.g. "100 kg × 5". */
  detail: string
  /** This set was a personal record. */
  record?: boolean
}

export interface WorkoutCardData {
  /** Small label above the title, e.g. "Workout complete". */
  eyebrow: string
  /** The workout's name. */
  title: string
  /** Up to three headline numbers. */
  stats: WorkoutCardStat[]
  /**
   * The one thing worth bragging about, drawn as the card's centrepiece under
   * the name: a personal record, else progress on last time, else a streak
   * that is still going. Sharers post achievements and hold back ordinary
   * sessions, so the best fact the workout has leads.
   */
  highlight?: { label: string; text: string }
  /** Every exercise with a logged set, in the order it was done. */
  lifts: WorkoutCardLift[]
  /**
   * Every lift that fits instead of only the top {@link TOP_LIFTS}. Off by
   * default: people sharing a workout want a summary, not every detail.
   */
  allLifts?: boolean
  /** The short mark beside a record lift, e.g. "PR". */
  recordLabel: string
  /** The line that stands in for the lifts that did not fit, e.g. "+4 more". */
  moreLabel: (count: number) => string
  /** The app's public host, e.g. `wtxworkout.com`. */
  host: string
  /** The user's accent colour. */
  accent: string
}

/** The words on the card, already in the user's language. */
export interface WorkoutCardLabels {
  eyebrow: string
  time: string
  sets: string
  exercises: string
  /** The volume stat's label, unit included, e.g. "kg volume". */
  volume: string
  record: string
  /** The highlight's label when more than one record fell, e.g. "3 new PRs". */
  records: (count: number) => string
  recordMark: string
  streakLabel: string
  streak: (weeks: number) => string
  /** The highlight's label for progress on last time, e.g. "Vs last time". */
  progressLabel: string
  /** The volume gained on last time, given formatted ("1,250"), e.g. "+1,250 kg volume". */
  progress: (volume: string) => string
  more: (count: number) => string
}

/** How many lifts the card shows unless the user asks for all of them. */
export const TOP_LIFTS = 3

/**
 * What goes on the card for a finished workout. Only what the finish screen
 * itself shows: the name, the totals, the best set of each exercise, and the
 * top record or the streak.
 */
export function workoutCardContent(input: {
  session: WorkoutSession
  /** Absent when the finish screen was opened without its recap. */
  recap?: {
    elapsedSeconds: number
    weekStreak: number
    personalRecords: PersonalRecord[]
    /** Against the last time this routine was logged; absent the first time. */
    comparison?: SessionComparison | null
  } | null
  labels: WorkoutCardLabels
  /** The exercise's name in the user's language. */
  exerciseName?: (name: string) => string
  host: string
  accent: string
}): WorkoutCardData {
  const { session, recap, labels } = input
  const displayName = input.exerciseName ?? ((name: string) => name)
  const unit = session.unit ?? ''
  const key = (name: string) => name.trim().toLowerCase()
  const recordNames = new Set((recap?.personalRecords ?? []).map((r) => key(r.exerciseName)))

  // Three numbers, the most telling first. Volume when anything was loaded,
  // otherwise how many exercises (a bodyweight or timed workout has no volume).
  const stats: WorkoutCardStat[] = []
  if (recap && recap.elapsedSeconds > 0) {
    stats.push({ value: formatClock(recap.elapsedSeconds), label: labels.time })
  }
  stats.push({ value: String(session.totalWorkingSets), label: labels.sets })
  if (session.totalVolume > 0) {
    stats.push({ value: formatNumber(session.totalVolume), label: labels.volume })
  } else {
    stats.push({ value: String(session.exerciseCount), label: labels.exercises })
  }

  const lifts: WorkoutCardLift[] = session.exercises.flatMap((exercise) => {
    const top = exercise.topSet
    if (!top) return []
    let detail: string
    if (isTimeExercise(exercise.note)) detail = formatCompactDuration(top.reps) || '0s'
    // Not formatNumber: it rounds, and a 72.5 set must not read as 73.
    else if (top.weight > 0) detail = `${top.weight} ${unit}`.trim() + ` × ${top.reps}`
    else detail = `× ${top.reps}`
    return [
      {
        name: displayName(exercise.name),
        detail,
        ...(recordNames.has(key(exercise.name)) ? { record: true } : {}),
      },
    ]
  })

  const records = recap?.personalRecords ?? []
  const topPr = records[0]
  let highlight: WorkoutCardData['highlight']
  if (topPr) {
    highlight = {
      label: records.length > 1 ? labels.records(records.length) : labels.record,
      text:
        `${displayName(topPr.exerciseName)} · ${topPr.weight} ${unit}`.trim() + ` × ${topPr.reps}`,
    }
  } else if (recap?.comparison?.isVolumeUp && recap.comparison.volumeDelta > 0) {
    highlight = {
      label: labels.progressLabel,
      text: labels.progress(formatNumber(recap.comparison.volumeDelta)),
    }
  } else if (recap && recap.weekStreak >= 2) {
    // Only a streak that is going: showing a broken one lowers what people do next.
    highlight = { label: labels.streakLabel, text: labels.streak(recap.weekStreak) }
  }

  return {
    eyebrow: labels.eyebrow,
    title: session.name.trim() || labels.eyebrow,
    stats,
    highlight,
    lifts,
    recordLabel: labels.recordMark,
    moreLabel: labels.more,
    host: input.host,
    accent: input.accent,
  }
}

/**
 * The `count` lifts the card leads with: records first — they are the reason
 * to post — then the rest in the order they were done, shown in that order.
 */
export function topLifts(lifts: WorkoutCardLift[], count: number): WorkoutCardLift[] {
  if (lifts.length <= count) return lifts
  const keep = new Set(
    lifts
      .map((lift, index) => ({ lift, index }))
      .sort((a, b) => Number(!!b.lift.record) - Number(!!a.lift.record) || a.index - b.index)
      .slice(0, Math.max(0, count))
      .map((item) => item.index),
  )
  return lifts.filter((_, index) => keep.has(index))
}

/**
 * The lifts that fit in `maxRows` rows. When they don't all fit, one row is
 * given up for the "+N more" line, and records are kept ahead of everything
 * else — they are the reason to post — with the order they were done in
 * preserved.
 */
export function fitLifts(
  lifts: WorkoutCardLift[],
  maxRows: number,
): { rows: WorkoutCardLift[]; more: number } {
  if (maxRows <= 0) return { rows: [], more: lifts.length }
  if (lifts.length <= maxRows) return { rows: lifts, more: 0 }
  const room = Math.max(0, maxRows - 1)
  const keep = new Set(
    lifts
      .map((lift, index) => ({ lift, index }))
      .sort((a, b) => Number(!!b.lift.record) - Number(!!a.lift.record) || a.index - b.index)
      .slice(0, room)
      .map((item) => item.index),
  )
  return { rows: lifts.filter((_, index) => keep.has(index)), more: lifts.length - keep.size }
}

/** The part of a `sw`×`sh` photo that fills a `dw`×`dh` frame without distortion, centred. */
export function coverCrop(
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(dw / sw, dh / sh)
  const width = dw / scale
  const height = dh / scale
  return { sx: (sw - width) / 2, sy: (sh - height) / 2, sw: width, sh: height }
}

// The dark theme's tokens (src/assets/base.css): a share always looks like the app at its default.
const BACKGROUND = '#0f1012'
const PANEL = 'rgba(15, 16, 18, 0.8)'
const TINT = 'rgba(255, 255, 255, 0.08)'
const HAIRLINE = 'rgba(255, 255, 255, 0.12)'
const TEXT = '#f4f4f5'
const MUTED = 'rgba(244, 244, 245, 0.66)'
const FONT = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const MARGIN_X = 96
const CONTENT_WIDTH = CARD_WIDTH - MARGIN_X * 2
/** The baseline of the brand row: the last thing above a story's reply bar. */
const brandBaseline = (frame: WorkoutCardFrame) => frame.height - frame.safeBottom - 44
const LIFT_ROW = 88
/**
 * The smallest a row gets when every lift is asked for. At 66 the names stay
 * about 11 pt on a 390 pt wide phone, the size iOS treats as its smallest:
 * glance legibility drops sharply as text shrinks, and more so for light text
 * on dark (Dobres et al. 2016, Ergonomics).
 */
const COMPACT_LIFT_ROW = 66
/** Fewer rows than this and the lifts are left off: one lift and a "+N more" says less than none. */
const MIN_LIFT_ROWS = 2
const STICKER_PADDING = 64

type Ctx = CanvasRenderingContext2D

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT}`
}

/** The largest size from `max` down to `min` at which `text` fits `width`. */
function fitSize(ctx: Ctx, text: string, weight: number, max: number, min: number, width: number) {
  for (let size = max; size > min; size -= 4) {
    ctx.font = font(weight, size)
    if (ctx.measureText(text).width <= width) return size
  }
  return min
}

/** `text` cut with an ellipsis so it fits `width` in the current font. */
function ellipsize(ctx: Ctx, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/** Greedy word wrap into at most `maxLines` lines; the last one is ellipsized. */
function wrap(ctx: Ctx, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(next).width <= width) {
      line = next
      continue
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  if (lines.length > maxLines)
    lines.splice(maxLines - 1, lines.length, lines.slice(maxLines - 1).join(' '))
  return lines.map((l) => ellipsize(ctx, l, width))
}

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** The app icon's tile colour (android ic_launcher_background): the mark looks like the icon in the store. */
const ICON_TILE = '#181818'

/**
 * The app icon, drawn in a `size`-pixel box: the barbell on its dark tile. A
 * viewer who wants the app looks for this icon in the store, so the share
 * shows the icon itself rather than a bare glyph.
 */
function drawMark(ctx: Ctx, x: number, y: number, size: number) {
  roundedRect(ctx, x, y, size, size, size * 0.24)
  ctx.fillStyle = ICON_TILE
  ctx.fill()
  // The tile is nearly the card's own dark: an edge keeps it an icon.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'
  ctx.lineWidth = 3
  ctx.stroke()
  const u = size / 100
  ctx.fillStyle = TEXT
  const rects: [number, number, number, number, number][] = [
    [24, 47, 52, 6, 3],
    [13, 31, 10, 38, 3.5],
    [77, 31, 10, 38, 3.5],
  ]
  for (const [rx, ry, rw, rh, rr] of rects) {
    roundedRect(ctx, x + rx * u, y + ry * u, rw * u, rh * u, rr * u)
    ctx.fill()
  }
}

/** One horizontal band of the card: how tall it is, and how to draw it with its top at `y`. */
interface Band {
  height: number
  draw: (x: number, y: number) => void
}

const gap = (height: number): Band => ({ height, draw: () => {} })

function eyebrowBand(ctx: Ctx, data: WorkoutCardData, width: number): Band {
  return {
    height: 60,
    draw: (x, y) => {
      ctx.fillStyle = MUTED
      ctx.font = font(600, 38)
      ctx.fillText(ellipsize(ctx, data.eyebrow, width), x, y + 42)
    },
  }
}

/** The workout's name: as large as fits, on up to two lines, then cut. */
function titleBand(ctx: Ctx, data: WorkoutCardData, width: number, max: number, min: number): Band {
  const size = fitSize(ctx, data.title, 800, max, min, width)
  ctx.font = font(800, size)
  const lines = wrap(ctx, data.title, width, 2)
  const lineHeight = size * 1.1
  return {
    height: lines.length * lineHeight + size * 0.1,
    draw: (x, y) => {
      ctx.fillStyle = TEXT
      ctx.font = font(800, size)
      lines.forEach((line, i) => ctx.fillText(line, x, y + lineHeight * i + size * 0.94))
    },
  }
}

/** The headline numbers, side by side under a hairline. */
function statsBand(ctx: Ctx, data: WorkoutCardData, width: number): Band {
  const stats = data.stats.slice(0, 3)
  const column = width / Math.max(1, stats.length)
  return {
    height: 196,
    draw: (x, y) => {
      ctx.fillStyle = HAIRLINE
      ctx.fillRect(x, y, width, 3)
      stats.forEach((stat, index) => {
        const left = x + index * column
        ctx.fillStyle = TEXT
        ctx.font = font(800, fitSize(ctx, stat.value, 800, 92, 52, column - 36))
        ctx.fillText(ellipsize(ctx, stat.value, column - 36), left, y + 118)
        ctx.fillStyle = MUTED
        ctx.font = font(600, 34)
        ctx.fillText(ellipsize(ctx, stat.label, column - 36), left, y + 170)
      })
    },
  }
}

const HIGHLIGHT_HEIGHT = 188

/**
 * The record or the streak, as the card's centrepiece: its label in the
 * accent (the only place the accent appears), the record itself large below.
 */
function highlightBand(ctx: Ctx, data: WorkoutCardData, width: number): Band {
  const highlight = data.highlight!
  const inset = 44
  const room = width - inset * 2
  return {
    height: HIGHLIGHT_HEIGHT,
    draw: (x, y) => {
      roundedRect(ctx, x, y, width, HIGHLIGHT_HEIGHT, 40)
      ctx.fillStyle = TINT
      ctx.fill()
      // A bar of the accent down the left edge, so the panel reads as "this one".
      roundedRect(ctx, x, y + 32, 10, HIGHLIGHT_HEIGHT - 64, 5)
      ctx.fillStyle = data.accent
      ctx.fill()

      ctx.font = font(800, 34)
      ctx.fillStyle = data.accent
      ctx.fillText(ellipsize(ctx, highlight.label, room), x + inset, y + 66)
      ctx.fillStyle = TEXT
      ctx.font = font(800, fitSize(ctx, highlight.text, 800, 60, 36, room))
      ctx.fillText(ellipsize(ctx, highlight.text, room), x + inset, y + 144)
    },
  }
}

/** The lifts, one per row: the name on the left, its best set on the right. */
function liftsBand(
  ctx: Ctx,
  data: WorkoutCardData,
  width: number,
  maxRows: number,
  row = LIFT_ROW,
): Band {
  // Type and spacing shrink with the row, so a compact list keeps its proportions.
  const k = row / LIFT_ROW
  const size = (px: number) => Math.round(px * k)
  // By default only the top few, with no "+N more": the card is a summary.
  const { rows, more } = data.allLifts
    ? fitLifts(data.lifts, maxRows)
    : { rows: topLifts(data.lifts, Math.min(TOP_LIFTS, maxRows)), more: 0 }
  const count = rows.length + (more > 0 ? 1 : 0)
  return {
    height: count * row,
    draw: (x, y) => {
      rows.forEach((lift, index) => {
        const top = y + index * row
        const baseline = top + size(58)
        if (index > 0) {
          ctx.fillStyle = HAIRLINE
          ctx.fillRect(x, top, width, 2)
        }
        ctx.font = font(700, size(42))
        const detail = ellipsize(ctx, lift.detail, width * 0.5)
        const detailWidth = ctx.measureText(detail).width
        ctx.fillStyle = TEXT
        ctx.fillText(detail, x + width - detailWidth, baseline)

        let right = x + width - detailWidth - 28
        if (lift.record) {
          // The record mark never shrinks: it is already the smallest text on the card.
          ctx.font = font(800, 30)
          const markWidth = ctx.measureText(data.recordLabel).width
          ctx.fillStyle = data.accent
          ctx.fillText(data.recordLabel, right - markWidth, baseline - 3)
          right -= markWidth + 24
        }
        ctx.fillStyle = TEXT
        ctx.font = font(600, size(42))
        ctx.fillText(ellipsize(ctx, lift.name, right - x), x, baseline)
      })
      if (more > 0) {
        const top = y + rows.length * row
        if (rows.length > 0) {
          ctx.fillStyle = HAIRLINE
          ctx.fillRect(x, top, width, 2)
        }
        ctx.fillStyle = MUTED
        ctx.font = font(600, size(38))
        ctx.fillText(ellipsize(ctx, data.moreLabel(more), width), x, top + size(58))
      }
    },
  }
}

/** The app's mark and name, and where to find it. Small, and part of the block. */
function drawBrand(ctx: Ctx, data: WorkoutCardData, x: number, baseline: number, width: number) {
  drawMark(ctx, x, baseline - 58, 72)
  ctx.fillStyle = TEXT
  ctx.font = font(800, 44)
  ctx.fillText('WTX', x + 96, baseline)
  const nameWidth = ctx.measureText('WTX').width
  ctx.fillStyle = MUTED
  ctx.font = font(600, 36)
  const host = ellipsize(ctx, data.host, width - 96 - nameWidth - 40)
  ctx.fillText(host, x + width - ctx.measureText(host).width, baseline)
}

function brandBand(ctx: Ctx, data: WorkoutCardData, width: number): Band {
  return { height: 84, draw: (x, y) => drawBrand(ctx, data, x, y + 66, width) }
}

function heightOf(bands: Band[]): number {
  return bands.reduce((sum, band) => sum + band.height, 0)
}

function drawBands(bands: Band[], x: number, y: number) {
  for (const band of bands) {
    band.draw(x, y)
    y += band.height
  }
}

/**
 * The name, the highlight and the numbers: the part every style shares. The
 * highlight comes straight after the name, ahead of the totals — a record is
 * what the share is for, the totals back it up.
 */
function summaryBands(ctx: Ctx, data: WorkoutCardData, width: number, titleMax: number): Band[] {
  return [
    titleBand(ctx, data, width, titleMax, 72),
    gap(data.highlight ? 36 : 44),
    ...(data.highlight ? [highlightBand(ctx, data, width), gap(40)] : []),
    statsBand(ctx, data, width),
  ]
}

/** How many rows of lifts fit in `room` pixels, or 0 when too few would. */
export function liftRowsFor(room: number, row = LIFT_ROW): number {
  const rows = Math.floor(room / row)
  return rows >= MIN_LIFT_ROWS ? rows : 0
}

/** The row height that fits `count` lifts in `room`, between the compact floor and the full row. */
export function compactLiftRow(room: number, count: number): number {
  if (count <= 0) return LIFT_ROW
  return Math.min(LIFT_ROW, Math.max(COMPACT_LIFT_ROW, Math.floor(room / count)))
}

function drawCard(ctx: Ctx, data: WorkoutCardData, frame: WorkoutCardFrame) {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, frame.width, frame.height)

  const baseline = brandBaseline(frame)
  const square = frame.height === frame.width
  const top = frame.safeTop + (square ? 0 : 30)
  const bottom = baseline - (square ? 116 : 130)
  const fixed = [
    eyebrowBand(ctx, data, CONTENT_WIDTH),
    ...summaryBands(ctx, data, CONTENT_WIDTH, square ? 96 : 120),
  ]
  // The lifts get whatever height the name and the numbers leave. Asked for
  // all of them, the rows shrink (down to a floor) so as many as possible fit.
  const room = bottom - top - heightOf(fixed) - 40
  const row = data.allLifts ? compactLiftRow(room, data.lifts.length) : LIFT_ROW
  const maxRows = liftRowsFor(room, row)
  const bands =
    data.lifts.length && maxRows > 0
      ? [...fixed, gap(40), liftsBand(ctx, data, CONTENT_WIDTH, maxRows, row)]
      : fixed
  // A short workout sits a little above the middle rather than leaving the card bottom-heavy.
  drawBands(bands, MARGIN_X, top + Math.max(0, bottom - top - heightOf(bands)) * 0.36)

  ctx.fillStyle = HAIRLINE
  ctx.fillRect(MARGIN_X, baseline - 96, CONTENT_WIDTH, 3)
  drawBrand(ctx, data, MARGIN_X, baseline, CONTENT_WIDTH)
}

/**
 * The photo look is a frame, like a Polaroid: the photo on top, whole and
 * uncovered, and the numbers in the band under it. People post a photo of
 * themselves for the photo, so nothing is drawn over it; the frame is what
 * says it is a workout, and where it came from.
 */
const FRAME_BORDER = 32
/** The frame's text is inset further than the photo, so it lines up inside the chin. */
const CHIN_INSET = 72
/** The story's chin is a little larger than the square's: it has the room, and a story is seen smaller. */
const chinScale = (frame: WorkoutCardFrame) => (frame.height === frame.width ? 1 : 1.12)

/** One-line title, the highlight, the totals: the chin's rows, top to bottom, unscaled. */
const CHIN_TITLE = 76
const CHIN_HIGHLIGHT = 56
const CHIN_STATS = 140
const chinHeight = (data: WorkoutCardData, k: number) =>
  Math.round((CHIN_TITLE + (data.highlight ? 12 + CHIN_HIGHLIGHT : 0) + 16 + CHIN_STATS) * k)

/** Where the photo sits in the photo look, in pixels of the image. */
export interface PhotoRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The part of the photo look the photo fills. The preview lays its "add a
 * photo" buttons over exactly this, so it is worked out here, once.
 */
export function photoRect(
  data: Pick<WorkoutCardData, 'highlight'>,
  format: WorkoutCardFormat = 'story',
): PhotoRect {
  const frame = workoutCardFrame(format)
  const k = chinScale(frame)
  const textBottom = frame.height - frame.safeBottom - 8
  const chinTop = textBottom - chinHeight(data as WorkoutCardData, k) - Math.round(36 * k)
  return {
    x: FRAME_BORDER,
    y: FRAME_BORDER,
    width: frame.width - FRAME_BORDER * 2,
    height: chinTop - FRAME_BORDER,
  }
}

/** The app's mark beside its name and address, stacked, right-aligned at `right`. */
function drawStackedBrand(ctx: Ctx, data: WorkoutCardData, right: number, top: number, k: number) {
  const icon = Math.round(64 * k)
  drawMark(ctx, right - icon, top, icon)
  const textRight = right - icon - Math.round(18 * k)
  ctx.fillStyle = TEXT
  ctx.font = font(800, Math.round(34 * k))
  const name = 'WTX'
  ctx.fillText(name, textRight - ctx.measureText(name).width, top + Math.round(30 * k))
  ctx.fillStyle = MUTED
  ctx.font = font(600, Math.round(31 * k))
  ctx.fillText(data.host, textRight - ctx.measureText(data.host).width, top + Math.round(64 * k))
}

function stackedBrandWidth(ctx: Ctx, data: WorkoutCardData, k: number): number {
  ctx.font = font(800, Math.round(34 * k))
  const name = ctx.measureText('WTX').width
  ctx.font = font(600, Math.round(31 * k))
  const host = ctx.measureText(data.host).width
  return Math.max(name, host) + Math.round((18 + 64) * k)
}

function drawPhotoCard(
  ctx: Ctx,
  data: WorkoutCardData,
  format: WorkoutCardFormat,
  photo?: CanvasImageSource & { width: number; height: number },
) {
  const frame = workoutCardFrame(format)
  const k = chinScale(frame)
  const s = (px: number) => Math.round(px * k)
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, frame.width, frame.height)

  const rect = photoRect(data, format)
  ctx.save()
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 28)
  ctx.clip()
  if (photo) {
    const crop = coverCrop(photo.width, photo.height, rect.width, rect.height)
    ctx.drawImage(
      photo,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    )
  } else {
    // Where the photo will go: the preview puts its camera and gallery buttons here.
    ctx.fillStyle = TINT
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
  ctx.restore()

  const left = CHIN_INSET
  const width = frame.width - CHIN_INSET * 2
  let y = frame.height - frame.safeBottom - 8 - chinHeight(data, k)

  // The name on one line, the app's mark beside it.
  const brandWidth = stackedBrandWidth(ctx, data, k)
  const titleRoom = width - brandWidth - s(32)
  const titleSize = fitSize(ctx, data.title, 800, s(64), s(44), titleRoom)
  ctx.fillStyle = TEXT
  ctx.font = font(800, titleSize)
  ctx.fillText(ellipsize(ctx, data.title, titleRoom), left, y + s(CHIN_TITLE) - s(18))
  drawStackedBrand(ctx, data, left + width, y + s(4), k)
  y += s(CHIN_TITLE)

  // The record, the progress or the streak: its label in the accent, on one line.
  if (data.highlight) {
    y += s(12)
    const baseline = y + s(42)
    ctx.font = font(800, s(32))
    ctx.fillStyle = data.accent
    const label = ellipsize(ctx, data.highlight.label, width * 0.5)
    ctx.fillText(label, left, baseline)
    const textLeft = left + ctx.measureText(label).width + s(20)
    const room = left + width - textLeft
    ctx.fillStyle = TEXT
    ctx.font = font(800, fitSize(ctx, data.highlight.text, 800, s(40), s(32), room))
    ctx.fillText(ellipsize(ctx, data.highlight.text, room), textLeft, baseline)
    y += s(CHIN_HIGHLIGHT)
  }

  // The totals, side by side under a hairline.
  y += s(16)
  ctx.fillStyle = HAIRLINE
  ctx.fillRect(left, y, width, 3)
  const stats = data.stats.slice(0, 3)
  const column = width / Math.max(1, stats.length)
  stats.forEach((stat, index) => {
    const x = left + index * column
    const room = column - s(28)
    ctx.fillStyle = TEXT
    ctx.font = font(800, fitSize(ctx, stat.value, 800, s(68), s(44), room))
    ctx.fillText(ellipsize(ctx, stat.value, room), x, y + s(86))
    ctx.fillStyle = MUTED
    ctx.font = font(600, s(32))
    ctx.fillText(ellipsize(ctx, stat.label, room), x, y + s(128))
  })
}

function stickerBands(ctx: Ctx, data: WorkoutCardData): Band[] {
  const width = CARD_WIDTH - STICKER_PADDING * 2
  return [...summaryBands(ctx, data, width, 92), gap(28), brandBand(ctx, data, width)]
}

function drawSticker(ctx: Ctx, data: WorkoutCardData, height: number) {
  ctx.clearRect(0, 0, CARD_WIDTH, height)
  // A panel of its own, so it reads on any photo it is placed over.
  roundedRect(ctx, 0, 0, CARD_WIDTH, height, 72)
  ctx.fillStyle = PANEL
  ctx.fill()
  drawBands(stickerBands(ctx, data), STICKER_PADDING, STICKER_PADDING - 8)
}

/** The pixel size of the image for a style: a full story or square, or a sticker as tall as its content. */
export function workoutCardSize(
  ctx: Ctx,
  data: WorkoutCardData,
  style: WorkoutCardStyle,
  format: WorkoutCardFormat = 'story',
): { width: number; height: number } {
  if (style !== 'sticker') {
    const { width, height } = workoutCardFrame(format)
    return { width, height }
  }
  return {
    width: CARD_WIDTH,
    height: Math.ceil(heightOf(stickerBands(ctx, data)) + STICKER_PADDING * 2 - 8),
  }
}

/** Draws the card onto a context whose canvas is already {@link workoutCardSize}. */
export function drawWorkoutCard(
  ctx: Ctx,
  data: WorkoutCardData,
  style: WorkoutCardStyle = 'card',
  photo?: CanvasImageSource & { width: number; height: number },
  format: WorkoutCardFormat = 'story',
): void {
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if (style === 'photo') drawPhotoCard(ctx, data, format, photo)
  else if (style === 'sticker') drawSticker(ctx, data, workoutCardSize(ctx, data, style).height)
  else drawCard(ctx, data, workoutCardFrame(format))
}

/** Sizes a canvas for the style and draws the card on it — the preview and the export share this. */
export function paintWorkoutCard(
  canvas: HTMLCanvasElement,
  data: WorkoutCardData,
  style: WorkoutCardStyle = 'card',
  photo?: CanvasImageSource & { width: number; height: number },
  format: WorkoutCardFormat = 'story',
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  const size = workoutCardSize(ctx, data, style, format)
  canvas.width = size.width
  canvas.height = size.height
  drawWorkoutCard(ctx, data, style, photo, format)
}

/**
 * Renders the card to image bytes. Browser only (needs a canvas). A card over
 * a photo is a JPEG, which keeps a photograph a sensible size; the others are
 * PNG, and the sticker needs it for its transparency.
 */
export async function renderWorkoutCard(
  data: WorkoutCardData,
  style: WorkoutCardStyle = 'card',
  photo?: CanvasImageSource & { width: number; height: number },
  format: WorkoutCardFormat = 'story',
): Promise<{ bytes: Uint8Array; mimeType: string; extension: string }> {
  const canvas = document.createElement('canvas')
  paintWorkoutCard(canvas, data, style, photo, format)
  const mimeType = style === 'photo' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.9))
  if (!blob) throw new Error('card could not be encoded')
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType,
    extension: style === 'photo' ? 'jpg' : 'png',
  }
}
