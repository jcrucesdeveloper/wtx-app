<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import PlateAvatar from '@/components/social/PlateAvatar.vue'
import PlateLadderSheet from '@/components/social/PlateLadderSheet.vue'
import { usePlateLabels } from '@/composables/usePlateLabels'
import { PLATE_COLORS, countWorkoutDays, plateLevel } from '@/lib/plateLevel'
import { formatCompactCount } from '@/lib/format'
import type { Profile } from '@/stores/profile'

const props = defineProps<{
  profile: Profile
  isMe: boolean
}>()

const emit = defineEmits<{
  openConnections: [tab: 'followers' | 'following']
}>()

const { t, locale } = useI18n()
const { plateTitle, nextLine } = usePlateLabels()

/**
 * The plate needs the workout dates, which only you and your followers can
 * read — so on a profile you don't follow there is simply no plate shown.
 */
const showLevel = computed(() => props.isMe || props.profile.workoutDates.length > 0)
const level = computed(() => plateLevel(countWorkoutDays(props.profile.workoutDates)))
const chipColor = computed(() => (level.value.current ? PLATE_COLORS[level.value.current.kg].fill : ''))
const ladderOpen = ref(false)

const since = computed(() =>
  new Date(props.profile.createdAt).toLocaleDateString(locale.value, {
    month: 'short',
    year: 'numeric',
  }),
)

const stats = computed(() => [
  { key: 'workouts', value: props.profile.workoutCount, tab: null },
  { key: 'followers', value: props.profile.followerCount, tab: 'followers' as const },
  { key: 'following', value: props.profile.followingCount, tab: 'following' as const },
])
</script>

<template>
  <section class="header">
    <div class="identity">
      <!-- The plate is worn by the avatar and named under it: one mark, not a second badge. -->
      <PlateAvatar
        :id="profile.id"
        :name="profile.displayName"
        :size="72"
        :step="showLevel ? level.current : null"
      />
      <div class="identity__body">
        <h2 class="identity__name">{{ profile.displayName }}</h2>
        <button v-if="showLevel" type="button" class="plate-chip" @click="ladderOpen = true">
          <i
            class="plate-chip__dot"
            :class="{ 'plate-chip__dot--none': !level.current }"
            :style="{ background: chipColor }"
          />
          {{ plateTitle(level.current) }}
          <ChevronRight :size="14" :stroke-width="2.5" class="plate-chip__chevron" />
        </button>
        <span v-if="!isMe && profile.followsMe" class="tag">{{
          t('social.profile.followsYou')
        }}</span>
        <span class="identity__since">{{
          t('social.profile.trainingSince', { date: since })
        }}</span>
      </div>
    </div>

    <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>

    <!-- Yours only: how far the next plate is. -->
    <button v-if="isMe && level.next" type="button" class="next-plate" @click="ladderOpen = true">
      <span class="next-plate__text">{{ nextLine(level) }}</span>
      <span class="next-plate__track"><i :style="{ transform: `scaleX(${level.progress})` }" /></span>
    </button>

    <!-- Only tappable when it leads somewhere: lists are yours alone. -->
    <div class="stats">
      <template v-for="stat in stats" :key="stat.key">
        <button
          v-if="isMe && stat.tab"
          type="button"
          class="stat stat--link"
          @click="emit('openConnections', stat.tab)"
        >
          <span class="stat__value">{{ formatCompactCount(stat.value, locale) }}</span>
          <span class="stat__label">{{ t(`social.profile.stats.${stat.key}`, stat.value) }}</span>
        </button>
        <div v-else class="stat">
          <span class="stat__value">{{ formatCompactCount(stat.value, locale) }}</span>
          <span class="stat__label">{{ t(`social.profile.stats.${stat.key}`, stat.value) }}</span>
        </div>
      </template>
    </div>

    <PlateLadderSheet :open="ladderOpen" :level="level" :is-me="isMe" @close="ladderOpen = false" />
  </section>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.identity__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.identity__name {
  font-size: var(--text-title);
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1.15;
  overflow-wrap: anywhere;
  letter-spacing: -0.02em;
}

.identity__since {
  font-size: var(--text-small);
}

.plate-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 8px 0 10px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.plate-chip__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--color-border-hover);
}

.plate-chip__dot--none {
  background: transparent;
}

.plate-chip__chevron {
  opacity: 0.5;
}

.next-plate {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.next-plate__text {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.next-plate__track {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.next-plate__track i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--color-heading);
  transform-origin: left;
}

.tag {
  font-size: 12px;
  font-weight: var(--weight-medium);
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  color: var(--color-text);
}

.bio {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--color-heading);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding: 14px 0 14px 16px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
}

.stat--link {
  background: none;
  cursor: pointer;
}

.stat--link:active {
  background: var(--color-background-mute);
}

.stat__value {
  font-size: var(--text-title);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.stat__label {
  font-size: var(--text-small);
  font-weight: var(--weight-regular);
}
.stat:first-child {
  padding-left: 0;
}

.stat + .stat {
  border-left: 1px solid var(--color-border);
}
</style>
