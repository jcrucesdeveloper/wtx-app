<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { monthCalendar, sessionsThisWeek, type CalendarDay } from '@/lib/sessionStats'

const props = defineProps<{
  /** `YYYY-MM-DD` of every logged session — one entry per session, repeats included. */
  dates: string[]
  /** The day whose sessions the list below is filtered to, if any. */
  selected: string | null
}>()

const emit = defineEmits<{
  select: [date: string | null]
}>()

/** Swipes shorter than this are taps or scroll jitter, not month changes. */
const SWIPE_MIN_PX = 50

const { t, locale } = useI18n()

const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth())
/** Which way the last month change went, for the slide direction. */
const direction = ref<'next' | 'prev'>('next')

/** Months index as `year * 12 + month` so bounds are a plain comparison. */
const viewIndex = computed(() => viewYear.value * 12 + viewMonth.value)
const currentIndex = now.getFullYear() * 12 + now.getMonth()
const earliestIndex = computed(() => {
  const oldest = props.dates.reduce<string | undefined>((min, d) => (!min || d < min ? d : min), undefined)
  if (!oldest) return currentIndex
  const [y, m] = oldest.split('-').map(Number)
  return Math.min((y ?? 0) * 12 + ((m ?? 1) - 1), currentIndex)
})

const isCurrentMonth = computed(() => viewIndex.value === currentIndex)
const canGoPrev = computed(() => viewIndex.value > earliestIndex.value)
const canGoNext = computed(() => viewIndex.value < currentIndex)

function shiftMonth(delta: number) {
  if ((delta < 0 && !canGoPrev.value) || (delta > 0 && !canGoNext.value)) return
  direction.value = delta > 0 ? 'next' : 'prev'
  const index = viewIndex.value + delta
  viewYear.value = Math.floor(index / 12)
  viewMonth.value = index % 12
  emit('select', null)
}

const weeks = computed(() => monthCalendar(props.dates, viewYear.value, viewMonth.value, now))

const monthPrefix = computed(
  () => `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-`,
)
const monthCount = computed(() => props.dates.filter((d) => d.startsWith(monthPrefix.value)).length)
const weekCount = computed(() => sessionsThisWeek(props.dates, now))

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase(locale.value) + text.slice(1)
}

const monthLabel = computed(() =>
  capitalize(
    new Date(viewYear.value, viewMonth.value, 1)
      .toLocaleDateString(locale.value, { month: 'short', year: 'numeric' })
      .replace('.', '')
      .replace(' de ', ' '),
  ),
)

const monthName = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString(locale.value, { month: 'long' }),
)

/** Monday-first single-letter headers — 2024-01-01 was a Monday. */
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    capitalize(new Date(2024, 0, 1 + i).toLocaleDateString(locale.value, { weekday: 'narrow' })),
  ),
)

function dayAria(day: CalendarDay) {
  const [y, m, d] = day.date.split('-').map(Number)
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return `${date}, ${t('sessions.calendar.workoutsOnDay', { count: day.count }, day.count)}`
}

function onDay(day: CalendarDay) {
  emit('select', props.selected === day.date ? null : day.date)
}

let swipeStartX: number | null = null
let swipeStartY = 0
function onPointerDown(e: PointerEvent) {
  swipeStartX = e.clientX
  swipeStartY = e.clientY
}
function onPointerUp(e: PointerEvent) {
  if (swipeStartX === null) return
  const dx = e.clientX - swipeStartX
  const dy = e.clientY - swipeStartY
  swipeStartX = null
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return
  shiftMonth(dx < 0 ? 1 : -1)
}
</script>

<template>
  <section class="cal" :aria-label="t('sessions.calendar.aria')">
    <header class="cal__head">
      <div class="cal__summary" aria-live="polite">
        <template v-if="monthCount > 0 || !isCurrentMonth">
          <span class="cal__count">{{ monthCount }}</span>
          <div class="cal__summary-text">
            <span class="cal__count-label">
              {{
                isCurrentMonth
                  ? t('sessions.calendar.thisMonth', { count: monthCount }, monthCount)
                  : t('sessions.calendar.inMonth', { count: monthCount, month: monthName }, monthCount)
              }}
            </span>
            <span v-if="isCurrentMonth" class="cal__sub">
              {{ t('sessions.calendar.thisWeek', { count: weekCount }, weekCount) }} ·
              {{ t('sessions.calendar.allTime', { count: dates.length }, dates.length) }}
            </span>
          </div>
        </template>
        <div v-else class="cal__summary-text">
          <span class="cal__fresh">{{ t('sessions.calendar.freshStart') }}</span>
          <span class="cal__sub">
            {{ t('sessions.calendar.allTime', { count: dates.length }, dates.length) }}
          </span>
        </div>
      </div>

      <div class="cal__nav">
        <button
          type="button"
          class="cal__nav-btn"
          :disabled="!canGoPrev"
          :aria-label="t('sessions.calendar.prevMonth')"
          @click="shiftMonth(-1)"
        >
          <ChevronLeft :size="16" :stroke-width="2.5" />
        </button>
        <span class="cal__month">{{ monthLabel }}</span>
        <button
          type="button"
          class="cal__nav-btn"
          :disabled="!canGoNext"
          :aria-label="t('sessions.calendar.nextMonth')"
          @click="shiftMonth(1)"
        >
          <ChevronRight :size="16" :stroke-width="2.5" />
        </button>
      </div>
    </header>

    <div
      class="cal__body"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="swipeStartX = null"
    >
      <div class="cal__weekdays" aria-hidden="true">
        <span v-for="(w, i) in weekdays" :key="i">{{ w }}</span>
      </div>

      <Transition :name="`cal-${direction}`" mode="out-in">
        <div :key="monthPrefix" class="cal__grid">
          <template v-for="week in weeks" :key="week[0]!.date">
            <template v-for="day in week" :key="day.date">
              <span v-if="!day.inMonth" class="cal__pad" aria-hidden="true" />
              <button
                v-else-if="day.count > 0"
                type="button"
                class="cal__day cal__day--trained"
                :class="{
                  'cal__day--today': day.isToday,
                  'cal__day--selected': selected === day.date,
                }"
                :aria-label="dayAria(day)"
                :aria-pressed="selected === day.date"
                @click="onDay(day)"
              >
                <span class="cal__num">{{ day.day }}</span>
                <span v-if="day.count > 1" class="cal__dots" aria-hidden="true">
                  <span v-for="n in Math.min(day.count, 3)" :key="n" class="cal__dot" />
                </span>
              </button>
              <span
                v-else
                class="cal__day"
                :class="{ 'cal__day--today': day.isToday, 'cal__day--future': day.isFuture }"
                :aria-current="day.isToday ? 'date' : undefined"
              >
                <span class="cal__num">{{ day.day }}</span>
              </span>
            </template>
          </template>
        </div>
      </Transition>
    </div>

  </section>
</template>

<style scoped>
.cal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 12px 14px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cal__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cal__summary-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.cal__count {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.cal__count-label,
.cal__fresh {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-heading);
}

.cal__sub {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cal__nav {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.cal__month {
  min-width: 64px;
  text-align: center;
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
  white-space: nowrap;
}

.cal__nav-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.cal__nav-btn:active:not(:disabled) {
  background: var(--color-background-mute);
}

.cal__nav-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.cal__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  touch-action: pan-y;
  overflow: hidden;
}

.cal__weekdays,
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cal__weekdays span {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  opacity: 0.45;
}

.cal__day,
.cal__pad {
  height: 28px;
}

.cal__day {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text);
  font-family: inherit;
}

.cal__num {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
}

.cal__day--future {
  background: transparent;
}

.cal__day--future .cal__num {
  opacity: 0.3;
}

.cal__day--today {
  box-shadow: inset 0 0 0 1.5px var(--color-heading);
}

.cal__day--today .cal__num {
  opacity: 1;
  font-weight: 700;
  color: var(--color-heading);
}

.cal__day--trained {
  background: var(--color-accent);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.cal__day--trained .cal__num {
  opacity: 1;
  font-weight: 700;
  color: #fff;
}

.cal__day--trained:active {
  transform: scale(0.92);
}

.cal__day--trained.cal__day--today {
  box-shadow:
    0 0 0 2px var(--color-background-soft),
    0 0 0 3.5px var(--color-accent);
}

.cal__day--selected,
.cal__day--trained.cal__day--selected {
  box-shadow:
    0 0 0 2px var(--color-background-soft),
    0 0 0 3.5px var(--color-heading);
}

.cal__day--trained:focus-visible {
  outline: 2px solid var(--color-heading);
  outline-offset: 2px;
}

.cal__dots {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cal__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.9;
}

.cal-next-enter-active,
.cal-next-leave-active,
.cal-prev-enter-active,
.cal-prev-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.cal-next-enter-from,
.cal-prev-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.cal-next-leave-to,
.cal-prev-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

@media (prefers-reduced-motion: reduce) {
  .cal-next-enter-active,
  .cal-next-leave-active,
  .cal-prev-enter-active,
  .cal-prev-leave-active {
    transition: none;
  }

  .cal__day--trained {
    transition: none;
  }
}
</style>
