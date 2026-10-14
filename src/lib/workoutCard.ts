/**
 * The image shared from the finish screen, in three styles:
 *
 * - `card`    a 9:16 story card: the workout's name and numbers, then the
 *             lifts themselves — a strength workout has no route to show, so
 *             what was lifted is the picture.
 * - `photo`   the same numbers, kept small, over the user's own photo.
 * - `sticker` just the numbers on a transparent background, to place over a
 *             photo or video in another app.
 *
 * Every style carries the app's name and address inside the block of numbers,
 * small: a share says where it came from, and cropping that out means
 * cropping the numbers.
 */
import type { WorkoutSession } from '@/lib/wtx'
import type { PersonalRecord } from '@/lib/sessionRecords'
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
  /** The one thing worth bragging about: a personal record, or the streak. */
  highlight?: { label: string; text: string }
  /** Every exercise with a logged set, in the order it was done. */
  lifts: WorkoutCardLift[]
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
  recordMark: string
  streakLabel: string
  streak: (weeks: number) => string
  more: (count: number) => string
}

/**
 * What goes on the card for a finished workout. Only what the finish screen
 * itself shows: the name, the totals, the best set of each exercise, and the
 * top record or the streak.
 */
export function workoutCardContent(input: {
  session: WorkoutSession
  /** Absent when the finish screen was opened without its recap. */
  recap?: { elapsedSeconds: number; weekStreak: number; personalRecords: PersonalRecord[] } | null
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

  const topPr = recap?.personalRecords[0]
  let highlight: WorkoutCardData['highlight']
  if (topPr) {
    highlight = {
      label: labels.record,
      text: `${displayName(topPr.exerciseName)} · ${topPr.weight} ${unit}`.trim() + ` × ${topPr.reps}`,
    }
  } else if (recap && recap.weekStreak >= 2) {
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
const BRAND_BASELINE = CARD_HEIGHT - SAFE_BOTTOM - 44
const LIFT_ROW = 88
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

/** The barbell mark from the app icon, drawn in a `size`-pixel box. */
function drawMark(ctx: Ctx, x: number, y: number, size: number) {
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

/** The record or the streak: the only place the accent appears. */
function highlightBand(ctx: Ctx, data: WorkoutCardData, width: number): Band {
  const highlight = data.highlight!
  return {
    height: 128,
    draw: (x, y) => {
      roundedRect(ctx, x, y, width, 128, 36)
      ctx.fillStyle = TINT
      ctx.fill()
      ctx.fillStyle = data.accent
      ctx.beginPath()
      ctx.arc(x + 50, y + 64, 13, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = font(700, 38)
      const label = ellipsize(ctx, highlight.label, width * 0.4)
      const labelWidth = ctx.measureText(label).width
      ctx.fillStyle = MUTED
      ctx.fillText(label, x + 84, y + 78)
      ctx.fillStyle = TEXT
      const room = width - 84 - labelWidth - 24 - 36
      ctx.font = font(700, fitSize(ctx, highlight.text, 700, 40, 32, room))
      ctx.fillText(ellipsize(ctx, highlight.text, room), x + 84 + labelWidth + 24, y + 78)
    },
  }
}

/** The lifts, one per row: the name on the left, its best set on the right. */
function liftsBand(ctx: Ctx, data: WorkoutCardData, width: number, maxRows: number): Band {
  const { rows, more } = fitLifts(data.lifts, maxRows)
  const count = rows.length + (more > 0 ? 1 : 0)
  return {
    height: count * LIFT_ROW,
    draw: (x, y) => {
      rows.forEach((lift, index) => {
        const top = y + index * LIFT_ROW
        const baseline = top + 58
        if (index > 0) {
          ctx.fillStyle = HAIRLINE
          ctx.fillRect(x, top, width, 2)
        }
        ctx.font = font(700, 42)
        const detail = ellipsize(ctx, lift.detail, width * 0.5)
        const detailWidth = ctx.measureText(detail).width
        ctx.fillStyle = TEXT
        ctx.fillText(detail, x + width - detailWidth, baseline)

        let right = x + width - detailWidth - 28
        if (lift.record) {
          ctx.font = font(800, 30)
          const markWidth = ctx.measureText(data.recordLabel).width
          ctx.fillStyle = data.accent
          ctx.fillText(data.recordLabel, right - markWidth, baseline - 3)
          right -= markWidth + 24
        }
        ctx.fillStyle = TEXT
        ctx.font = font(600, 42)
        ctx.fillText(ellipsize(ctx, lift.name, right - x), x, baseline)
      })
      if (more > 0) {
        const top = y + rows.length * LIFT_ROW
        if (rows.length > 0) {
          ctx.fillStyle = HAIRLINE
          ctx.fillRect(x, top, width, 2)
        }
        ctx.fillStyle = MUTED
        ctx.font = font(600, 38)
        ctx.fillText(ellipsize(ctx, data.moreLabel(more), width), x, top + 58)
      }
    },
  }
}

/** The app's mark and name, and where to find it. Small, and part of the block. */
function drawBrand(ctx: Ctx, data: WorkoutCardData, x: number, baseline: number, width: number) {
  drawMark(ctx, x - 10, baseline - 62, 88)
  ctx.fillStyle = TEXT
  ctx.font = font(800, 44)
  ctx.fillText('WTX', x + 88, baseline)
  const nameWidth = ctx.measureText('WTX').width
  ctx.fillStyle = MUTED
  ctx.font = font(600, 36)
  const host = ellipsize(ctx, data.host, width - 88 - nameWidth - 40)
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

/** The name, the numbers and the highlight: the part every style shares. */
function summaryBands(ctx: Ctx, data: WorkoutCardData, width: number, titleMax: number): Band[] {
  return [
    titleBand(ctx, data, width, titleMax, 72),
    gap(44),
    statsBand(ctx, data, width),
    ...(data.highlight ? [gap(20), highlightBand(ctx, data, width)] : []),
  ]
}

function drawCard(ctx: Ctx, data: WorkoutCardData) {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  const top = SAFE_TOP + 30
  const bottom = BRAND_BASELINE - 130
  const fixed = [eyebrowBand(ctx, data, CONTENT_WIDTH), ...summaryBands(ctx, data, CONTENT_WIDTH, 120)]
  // The lifts get whatever height the name and the numbers leave.
  const maxRows = Math.floor((bottom - top - heightOf(fixed) - 40) / LIFT_ROW)
  const bands =
    data.lifts.length && maxRows > 0
      ? [...fixed, gap(40), liftsBand(ctx, data, CONTENT_WIDTH, maxRows)]
      : fixed
  // A short workout sits a little above the middle rather than leaving the card bottom-heavy.
  drawBands(bands, MARGIN_X, top + Math.max(0, bottom - top - heightOf(bands)) * 0.36)

  ctx.fillStyle = HAIRLINE
  ctx.fillRect(MARGIN_X, BRAND_BASELINE - 96, CONTENT_WIDTH, 3)
  drawBrand(ctx, data, MARGIN_X, BRAND_BASELINE, CONTENT_WIDTH)
}

function drawPhotoCard(ctx: Ctx, data: WorkoutCardData, photo?: CanvasImageSource & { width: number; height: number }) {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  if (photo) {
    const crop = coverCrop(photo.width, photo.height, CARD_WIDTH, CARD_HEIGHT)
    ctx.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, CARD_WIDTH, CARD_HEIGHT)
  }

  // The numbers stay small and low, so the photo is still the photo.
  const bands = [...summaryBands(ctx, data, CONTENT_WIDTH, 92), gap(28), brandBand(ctx, data, CONTENT_WIDTH)]
  const blockTop = CARD_HEIGHT - SAFE_BOTTOM - 20 - heightOf(bands)

  // A scrim only where the text is, deep enough to read white type on a bright photo.
  const scrim = ctx.createLinearGradient(0, blockTop - 260, 0, CARD_HEIGHT)
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)')
  scrim.addColorStop(0.3, 'rgba(0, 0, 0, 0.62)')
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0.86)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, blockTop - 260, CARD_WIDTH, CARD_HEIGHT - blockTop + 260)

  drawBands(bands, MARGIN_X, blockTop)
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

/** The pixel size of the image for a style: a full story, or a sticker as tall as its content. */
export function workoutCardSize(
  ctx: Ctx,
  data: WorkoutCardData,
  style: WorkoutCardStyle,
): { width: number; height: number } {
  if (style !== 'sticker') return { width: CARD_WIDTH, height: CARD_HEIGHT }
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
): void {
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if (style === 'photo') drawPhotoCard(ctx, data, photo)
  else if (style === 'sticker') drawSticker(ctx, data, workoutCardSize(ctx, data, style).height)
  else drawCard(ctx, data)
}

/** Sizes a canvas for the style and draws the card on it — the preview and the export share this. */
export function paintWorkoutCard(
  canvas: HTMLCanvasElement,
  data: WorkoutCardData,
  style: WorkoutCardStyle = 'card',
  photo?: CanvasImageSource & { width: number; height: number },
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  const size = workoutCardSize(ctx, data, style)
  canvas.width = size.width
  canvas.height = size.height
  drawWorkoutCard(ctx, data, style, photo)
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
): Promise<{ bytes: Uint8Array; mimeType: string; extension: string }> {
  const canvas = document.createElement('canvas')
  paintWorkoutCard(canvas, data, style, photo)
  const mimeType = style === 'photo' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.9))
  if (!blob) throw new Error('card could not be encoded')
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType,
    extension: style === 'photo' ? 'jpg' : 'png',
  }
}
