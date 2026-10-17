<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExerciseName } from '@/composables/useExerciseName'

/**
 * The team against the plan: one bar, each member's part in their color and
 * in join order, never sorted. Optional pips underneath mark the routine's
 * exercises, filled once everyone has cleared one. With `grow`, the bar
 * fills from empty when it appears (the recap's reveal).
 */
const props = withDefaults(
  defineProps<{
    segments: { userId: string; done: number; color: string }[]
    total: number
    /** The routine's exercises in the room's order, and whether the whole team cleared each. */
    exercises?: { name: string; cleared: boolean }[]
    grow?: boolean
    label?: string
  }>(),
  { exercises: () => [], grow: false, label: undefined },
)

const { t } = useI18n()
const { exerciseName } = useExerciseName()

const done = computed(() => props.segments.reduce((sum, s) => sum + s.done, 0))
const grown = ref(!props.grow)

onMounted(() => {
  if (grown.value) return
  // Two frames: the empty bar has to be painted before the width can transition from it.
  requestAnimationFrame(() => requestAnimationFrame(() => (grown.value = true)))
})

const widths = computed(() =>
  // Members with nothing done yet get no segment, so the gaps only sit between real parts.
  props.segments
    .filter((s) => s.done > 0)
    .map((s) => ({
      ...s,
      width: grown.value && props.total > 0 ? (s.done / props.total) * 100 : 0,
    })),
)

const clearedCount = computed(() => props.exercises.filter((e) => e.cleared).length)
</script>

<template>
  <div class="team-bar">
    <div
      class="team-bar__track"
      role="progressbar"
      :aria-valuenow="done"
      :aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="label ?? t('room.team.title')"
    >
      <span
        v-for="s in widths"
        :key="s.userId"
        class="team-bar__segment"
        :class="{ 'team-bar__segment--grow': grow }"
        :style="{ width: `${s.width}%`, background: s.color }"
      />
    </div>
    <ol
      v-if="exercises.length"
      class="team-bar__pips"
      :aria-label="t('room.summary.clearedAria', { count: clearedCount, total: exercises.length })"
    >
      <li
        v-for="(exercise, i) in exercises"
        :key="`${i}-${exercise.name}`"
        class="team-bar__pip"
        :class="{ 'team-bar__pip--cleared': exercise.cleared }"
        :title="exerciseName(exercise.name)"
      />
    </ol>
  </div>
</template>

<style scoped>
.team-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.team-bar__track {
  display: flex;
  gap: 2px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  overflow: hidden;
}

.team-bar__segment {
  height: 100%;
  transition: width var(--motion-base) var(--ease-out);
}

.team-bar__segment--grow {
  transition-duration: calc(var(--motion-slow) * 2);
}

.team-bar__pips {
  display: flex;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.team-bar__pip {
  flex: 1;
  max-width: 28px;
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  transition: background-color var(--motion-base) var(--ease-out);
}

.team-bar__pip--cleared {
  background: var(--color-heading);
}
</style>
