<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toDateStr } from '@/lib/sessionStats'

/**
 * TEMPORARY — redesign Phase 1. This week, Monday to Sunday, with the days
 * trained filled in. The same strip is used on the home and finish screens so
 * "how is my week going" always looks the same.
 */
const props = defineProps<{
  /** Local `YYYY-MM-DD` dates of every logged session. */
  dateStrs: string[]
  /** A status line's worth of height, for where the week is context and not the subject. */
  small?: boolean
}>()

const { locale } = useI18n()

const days = computed(() => {
  const trained = new Set(props.dateStrs)
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const letter = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  const todayStr = toDateStr(today)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateStr = toDateStr(date)
    return {
      letter: letter.format(date),
      trained: trained.has(dateStr),
      today: dateStr === todayStr,
      future: dateStr > todayStr,
    }
  })
})
</script>

<template>
  <div class="strip" :class="{ 'strip--small': small }" aria-hidden="true">
    <div
      v-for="(day, i) in days"
      :key="i"
      class="strip__day"
      :class="{
        'strip__day--trained': day.trained,
        'strip__day--today': day.today,
        'strip__day--future': day.future,
      }"
    >
      <span class="strip__letter">{{ day.letter }}</span>
      <span class="strip__dot" />
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.strip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.strip__letter {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.55;
}

.strip__day--today .strip__letter {
  opacity: 1;
  color: var(--color-heading);
}

.strip__dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-background-mute);
}

/* Compact: the weekday letter sits inside its dot, so the week is one clear row. */
.strip--small .strip__day {
  position: relative;
  gap: 0;
}

.strip--small .strip__dot {
  width: 34px;
  height: 34px;
}

.strip--small .strip__letter {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  opacity: 0.7;
}

.strip--small .strip__day--future .strip__letter {
  opacity: 0.4;
}

.strip--small .strip__day--trained .strip__letter {
  opacity: 1;
  color: var(--p-on-accent);
}

.strip__day--future .strip__dot {
  opacity: 0.45;
}

.strip__day--today .strip__dot {
  box-shadow: inset 0 0 0 2px var(--color-border-hover);
}

.strip__day--trained .strip__dot {
  background: var(--color-accent);
  box-shadow: none;
  opacity: 1;
}

/* Today's dot lands as the workout is logged. */
@media (prefers-reduced-motion: no-preference) {
  .strip__day--today.strip__day--trained .strip__dot {
    animation: week-land 0.4s var(--p-spring, ease-out) 0.5s both;
  }
}

@keyframes week-land {
  from {
    transform: scale(0.4);
  }
  to {
    transform: scale(1);
  }
}
</style>
