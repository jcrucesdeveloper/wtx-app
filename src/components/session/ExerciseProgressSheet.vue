<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useExerciseName } from '@/composables/useExerciseName'
import { exerciseProgress, type ProgressPoint } from '@/lib/exerciseProgress'
import { formatDurationInput } from '@/lib/durationInput'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { formatSetValue } from '@/lib/sessionTime'
import type { ProgressChartHandle } from '@/lib/progressChart'
import type { WorkoutSession } from '@/lib/wtx'

/**
 * One exercise over its last dozen sessions: am I getting stronger at this?
 * The headline answers it (best estimate now, and the change since the
 * first bar); the chart shows the path; the list under it names the sets
 * the bars were built from. Chart.js is fetched only when this opens.
 */
const props = defineProps<{
  open: boolean
  /** The exercise as logged (English catalog name or custom); shown localized. */
  name: string | null
  sessions: WorkoutSession[]
}>()

const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const { exerciseName } = useExerciseName()

const progress = computed(() =>
  props.name ? exerciseProgress(props.sessions, props.name) : { metric: 'e1rm' as const, points: [] },
)
const timed = computed(() => progress.value.metric === 'seconds')
const points = computed(() => progress.value.points)
const latest = computed(() => points.value[points.value.length - 1])
/** A unit only when every bar shares it — kg and lb bars aren't comparable. */
const unit = computed(() => {
  const units = new Set(points.value.map((p) => p.unit))
  return units.size === 1 ? [...units][0] ?? '' : ''
})

function formatValue(value: number): string {
  if (timed.value) return formatDurationInput(value)
  // One decimal only where it says something: 116.7, but 80 not 80.0.
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function withUnit(value: number, pointUnit = unit.value): string {
  return timed.value ? formatValue(value) : `${formatValue(value)} ${pointUnit}`.trim()
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
}

function shortDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

const headline = computed(() => (latest.value ? withUnit(latest.value.value, latest.value.unit) : ''))

/** Change from the first bar to the last; only when there are two and they share a unit. */
const change = computed(() => {
  const first = points.value[0]
  const last = latest.value
  if (!first || !last || points.value.length < 2 || first.unit !== last.unit) return null
  const delta = Math.round((last.value - first.value) * 10) / 10
  return {
    delta,
    text: t(
      'exerciseProgress.sinceFirst',
      {
        change: `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${withUnit(Math.abs(delta), last.unit)}`,
        count: points.value.length,
      },
      points.value.length,
    ),
  }
})

function setText(point: ProgressPoint): string {
  return formatSetValue(point.topSet, point.unit, timed.value)
}

/** Newest first, as every other list in History reads. */
const rows = computed(() =>
  [...points.value].reverse().map((point) => ({
    key: point.date + point.value,
    when: shortDate(point.date),
    set: setText(point),
    value: withUnit(point.value, point.unit),
  })),
)

const metricLabel = computed(() =>
  timed.value ? t('exerciseProgress.metricSeconds') : t('exerciseProgress.metricE1rm'),
)

const chartAria = computed(() =>
  t('exerciseProgress.chartAria', {
    metric: metricLabel.value,
    values: points.value.map((p) => `${shortDate(p.date)}: ${withUnit(p.value, p.unit)}`).join(', '),
  }),
)

// ----- the chart, fetched and drawn on open -----
const canvas = ref<HTMLCanvasElement | null>(null)
const chartFailed = ref(false)
let chart: ProgressChartHandle | null = null
/** Bumped on every redraw, so a slow import for a closed sheet never draws. */
let drawSeq = 0

function destroyChart() {
  chart?.destroy()
  chart = null
}

/**
 * The accent at `alpha`. Canvas can't take `color-mix()`, and the accent is
 * always a `#rrggbb` (the theme store writes it), so fade it by hand.
 */
function fade(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const [r, g, b] = m.slice(1).map((part) => parseInt(part, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Theme colors from the CSS tokens, so the chart follows light/dark and the accent. */
function themeColors(el: HTMLElement) {
  const style = getComputedStyle(el)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  const accent = read('--color-accent', '#e0263a')
  return {
    accent,
    accentSoft: fade(accent, 0.38),
    text: read('--color-text', 'rgba(128, 128, 128, 0.8)'),
    grid: read('--color-border', 'rgba(128, 128, 128, 0.15)'),
  }
}

async function draw() {
  const seq = ++drawSeq
  destroyChart()
  if (!props.open || points.value.length < 2) return
  chartFailed.value = false
  try {
    const { renderProgressChart } = await import('@/lib/progressChart')
    await nextTick()
    if (seq !== drawSeq || !canvas.value) return
    chart = renderProgressChart(
      canvas.value,
      points.value.map((point) => ({
        label: shortDate(point.date),
        value: point.value,
        tooltip: [
          parseDate(point.date).toLocaleDateString(locale.value, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          setText(point),
          `${metricLabel.value}: ${withUnit(point.value, point.unit)}`,
        ],
      })),
      themeColors(canvas.value),
      { reducedMotion: prefersReducedMotion(), formatValue },
    )
  } catch (err) {
    // Offline before the chunk was ever fetched: the list below still answers.
    console.error('[progress] chart failed to load', err)
    if (seq === drawSeq) chartFailed.value = true
  }
}

watch(
  () => [props.open, props.name, points.value] as const,
  () => void draw(),
  { flush: 'post' },
)

onBeforeUnmount(() => {
  drawSeq++
  destroyChart()
})
</script>

<template>
  <BottomSheet :open="open" :title="name ? exerciseName(name) : ''" @close="emit('close')">
    <div class="progress" data-test="exercise-progress">
      <p v-if="!points.length" class="progress__empty">{{ t('exerciseProgress.empty') }}</p>

      <template v-else>
        <div class="progress__head">
          <span class="progress__label">{{ metricLabel }}</span>
          <span class="progress__headline">{{ headline }}</span>
          <span
            v-if="change"
            class="progress__change"
            :class="{ 'progress__change--up': change.delta > 0 }"
          >
            {{ change.text }}
          </span>
          <span v-else class="progress__change">{{ t('exerciseProgress.oneSession') }}</span>
        </div>

        <div v-if="points.length > 1 && !chartFailed" class="progress__chart">
          <canvas ref="canvas" role="img" :aria-label="chartAria" />
        </div>

        <ul class="progress__list">
          <li v-for="row in rows" :key="row.key" class="progress__row">
            <span class="progress__when">{{ row.when }}</span>
            <span class="progress__set">{{ row.set }}</span>
            <span class="progress__value">{{ row.value }}</span>
          </li>
        </ul>

        <p v-if="!timed" class="progress__note">{{ t('exerciseProgress.e1rmNote') }}</p>
      </template>
    </div>
  </BottomSheet>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

.progress__empty {
  padding: 24px 0;
  text-align: center;
}

.progress__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.progress__label {
  font-size: 13px;
}

.progress__headline {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-heading);
}

.progress__change {
  font-size: 13px;
  font-weight: 600;
}

.progress__change--up {
  color: var(--color-accent);
}

.progress__chart {
  position: relative;
  height: 180px;
}

.progress__list {
  list-style: none;
  padding: 0;
}

.progress__row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 12px;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.progress__set {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.progress__value {
  text-align: right;
}

.progress__note {
  font-size: 13px;
}
</style>
