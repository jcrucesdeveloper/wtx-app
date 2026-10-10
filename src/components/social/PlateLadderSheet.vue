<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { usePlateLabels } from '@/composables/usePlateLabels'
import { PLATE_COLORS, PLATE_STEPS, type PlateLevel } from '@/lib/plateLevel'

/**
 * Every plate there is, which ones this person has, and — on your own profile
 * — what the next one takes. Opened from the plate chip under a profile name,
 * so the header itself only has to carry the plate.
 */
const props = defineProps<{
  open: boolean
  level: PlateLevel
  isMe: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { plateTitle, nextLine } = usePlateLabels()

const steps = computed(() =>
  PLATE_STEPS.map((step) => ({
    step,
    title: plateTitle(step),
    from: t('social.profile.level.from', { count: step.at }, step.at),
    earned: props.level.workoutDays >= step.at,
    isNext: props.level.next === step,
    color: PLATE_COLORS[step.kg],
  })),
)
</script>

<template>
  <BottomSheet :open="open" :title="t('social.profile.level.title')" @close="emit('close')">
    <div class="ladder">
      <p class="ladder__summary">
        <b>{{ plateTitle(level.current) }}</b> ·
        {{ t('social.profile.level.days', { count: level.workoutDays }, level.workoutDays) }}
      </p>

      <template v-if="isMe && level.next">
        <p class="ladder__next">{{ nextLine(level) }}</p>
        <span class="ladder__track"><i :style="{ transform: `scaleX(${level.progress})` }" /></span>
      </template>

      <ul class="ladder__list">
        <li
          v-for="row in steps"
          :key="row.step.at"
          class="rung"
          :class="{ 'rung--locked': !row.earned }"
        >
          <span class="rung__plates" aria-hidden="true">
            <span
              v-for="n in row.step.count"
              :key="n"
              class="rung__plate"
              :style="{ background: row.color.fill, color: row.color.ink }"
            >
              <template v-if="n === row.step.count">{{ row.step.kg }}</template>
            </span>
          </span>
          <span class="rung__body">
            <span class="rung__title">{{ row.title }}</span>
            <span class="rung__from">{{ row.from }}</span>
          </span>
          <Check v-if="row.earned" :size="18" :stroke-width="3" class="rung__check" />
        </li>
      </ul>

      <p class="ladder__about">{{ t('social.profile.level.about') }}</p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.ladder {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

.ladder__summary {
  font-size: 16px;
}

.ladder__summary b {
  font-weight: 700;
  color: var(--color-heading);
}

.ladder__next {
  margin-top: 4px;
  font-size: 13px;
}

.ladder__track {
  display: block;
  height: 4px;
  margin-top: 10px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.ladder__track i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--color-heading);
  transform-origin: left;
}

.ladder__list {
  list-style: none;
  margin-top: 14px;
  padding: 0;
}

.rung {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  border-top: 1px solid var(--color-border);
}

/* Not earned yet: still shown in full colour, just stepped back. */
.rung--locked {
  opacity: 0.45;
}

.rung__plates {
  flex-shrink: 0;
  display: flex;
  width: 76px;
}

/* A plate face-on, with its weight printed on it. */
.rung__plate {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  box-shadow:
    inset 0 0 0 1.5px rgba(0, 0, 0, 0.22),
    inset 0 0 0 7px rgba(255, 255, 255, 0.16);
}

.rung__plate + .rung__plate {
  margin-left: -26px;
}

.rung__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rung__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.rung__from {
  font-size: 13px;
}

.rung__check {
  flex-shrink: 0;
  color: var(--color-heading);
}

.ladder__about {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.45;
}
</style>
