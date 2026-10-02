/**
 * The image shared from the finish screen: a 9:16 card (the size Instagram,
 * TikTok and WhatsApp stories use) with the workout's numbers and the app's
 * name and address, so a share shows where it came from even when the
 * caption is dropped.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

export interface WorkoutCardStat {
  value: string
  label: string
}

export interface WorkoutCardData {
  /** Small label above the title, e.g. "Workout complete". */
  eyebrow: string
  /** The workout's name. */
  title: string
  /** Up to four headline numbers. */
  stats: WorkoutCardStat[]
  /** The one thing worth bragging about: a personal record, or the streak. */
  highlight?: { label: string; text: string }
  /** e.g. "Logged with WTX". */
  footer: string
  /** The app's public host, e.g. `wtxworkout.com`. */
  host: string
  /** The user's accent colour. */
  accent: string
}

const BACKGROUND = '#181818'
const SURFACE = '#232323'
const TEXT = '#fff6ef'
const MUTED = 'rgba(255, 246, 239, 0.6)'
const FONT = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Stories cover the top and bottom with their own UI; everything stays inside this box. */
const MARGIN_X = 96
const TOP = 270
const CONTENT_WIDTH = CARD_WIDTH - MARGIN_X * 2

function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT}`
}

/** The largest size from `max` down to `min` at which `text` fits `width`. */
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  max: number,
  min: number,
  width: number,
) {
  for (let size = max; size > min; size -= 4) {
    ctx.font = font(weight, size)
    if (ctx.measureText(text).width <= width) return size
  }
  return min
}

/** `text` cut with an ellipsis so it fits `width` in the current font. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/** Greedy word wrap into at most `maxLines` lines; the last one is ellipsized. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
): string[] {
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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** The barbell mark from the app icon, drawn in a `size`-pixel box. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
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

/** Draws the card onto a `CARD_WIDTH`×`CARD_HEIGHT` canvas context. */
export function drawWorkoutCard(ctx: CanvasRenderingContext2D, data: WorkoutCardData): void {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // Brand row.
  let y = TOP
  drawMark(ctx, MARGIN_X - 12, y - 82, 120)
  ctx.fillStyle = TEXT
  ctx.font = font(800, 64)
  ctx.fillText('WTX', MARGIN_X + 122, y)

  // Eyebrow and title.
  y += 190
  ctx.fillStyle = data.accent
  ctx.font = font(700, 38)
  ctx.fillText(data.eyebrow.toUpperCase(), MARGIN_X, y)

  ctx.fillStyle = TEXT
  const titleSize = fitSize(ctx, data.title, 800, 124, 88, CONTENT_WIDTH)
  ctx.font = font(800, titleSize)
  for (const line of wrap(ctx, data.title, CONTENT_WIDTH, 2)) {
    y += titleSize * 1.08
    ctx.fillText(line, MARGIN_X, y)
  }

  // Stats, two per row.
  y += 110
  const columnWidth = CONTENT_WIDTH / 2
  data.stats.slice(0, 4).forEach((stat, index) => {
    const x = MARGIN_X + (index % 2) * columnWidth
    const rowY = y + Math.floor(index / 2) * 230
    ctx.fillStyle = TEXT
    ctx.font = font(800, fitSize(ctx, stat.value, 800, 124, 72, columnWidth - 40))
    ctx.fillText(stat.value, x, rowY + 110)
    ctx.fillStyle = MUTED
    ctx.font = font(600, 38)
    ctx.fillText(ellipsize(ctx, stat.label, columnWidth - 40), x, rowY + 168)
  })
  y += Math.ceil(Math.min(data.stats.length, 4) / 2) * 230

  // Highlight.
  if (data.highlight) {
    y += 40
    const height = 220
    roundedRect(ctx, MARGIN_X, y, CONTENT_WIDTH, height, 28)
    ctx.fillStyle = SURFACE
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = data.accent
    ctx.stroke()

    ctx.fillStyle = data.accent
    ctx.font = font(700, 36)
    ctx.fillText(data.highlight.label.toUpperCase(), MARGIN_X + 44, y + 84)
    ctx.fillStyle = TEXT
    const size = fitSize(ctx, data.highlight.text, 700, 60, 44, CONTENT_WIDTH - 88)
    ctx.font = font(700, size)
    ctx.fillText(ellipsize(ctx, data.highlight.text, CONTENT_WIDTH - 88), MARGIN_X + 44, y + 162)
  }

  // Footer, above the area a story's reply bar covers.
  const footerY = CARD_HEIGHT - 400
  ctx.fillStyle = data.accent
  ctx.fillRect(MARGIN_X, footerY - 86, 96, 8)
  ctx.fillStyle = MUTED
  ctx.font = font(600, 40)
  ctx.fillText(data.footer, MARGIN_X, footerY)
  ctx.fillStyle = TEXT
  ctx.font = font(800, 52)
  ctx.fillText(data.host, MARGIN_X, footerY + 76)
}

/** Renders the card to PNG bytes. Browser only (needs a canvas). */
export async function renderWorkoutCard(data: WorkoutCardData): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  drawWorkoutCard(ctx, data)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('card could not be encoded')
  return new Uint8Array(await blob.arrayBuffer())
}
