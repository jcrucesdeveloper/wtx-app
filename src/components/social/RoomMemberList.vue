<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronRight } from '@lucide/vue'
import { initials, memberColor } from '@/lib/memberColors'
import { useExerciseName } from '@/composables/useExerciseName'

export interface MemberRow {
  userId: string
  displayName: string
  finishedAt: string | null
  online: boolean
  sets: number
  currentExercise: string | null
}

defineProps<{
  members: MemberRow[]
  hostId: string | null
  myId: string | null
  /** Show live sets / current exercise (once the workout has started). */
  showProgress?: boolean
  /** Rows are buttons that emit `select` (e.g. to watch that member's workout). */
  selectable?: boolean
}>()

const emit = defineEmits<{
  select: [userId: string]
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
</script>

<template>
  <ul class="members">
    <li v-for="(m, i) in members" :key="m.userId">
      <component
        :is="selectable ? 'button' : 'div'"
        :type="selectable ? 'button' : undefined"
        class="member"
        :class="{ 'member--selectable': selectable }"
        @click="selectable && emit('select', m.userId)"
      >
        <span class="avatar" :style="{ background: memberColor(i) }">
          {{ initials(m.displayName) }}
          <span v-if="m.online" class="avatar__dot" aria-hidden="true" />
        </span>
        <span class="member__body">
          <span class="member__name">
            {{ m.displayName }}
            <span v-if="m.userId === myId" class="tag">{{ t('room.you') }}</span>
            <span v-if="m.userId === hostId" class="tag">{{ t('room.host') }}</span>
          </span>
          <span v-if="showProgress && m.currentExercise" class="member__sub">{{ exerciseName(m.currentExercise) }}</span>
        </span>
        <span v-if="m.finishedAt" class="badge badge--done">{{ t('room.done') }}</span>
        <span v-else-if="showProgress" class="badge">{{ t('room.setsDone', { count: m.sets }) }}</span>
        <ChevronRight v-if="selectable" :size="16" class="member__chevron" aria-hidden="true" />
      </component>
    </li>
  </ul>
</template>

<style scoped>
.members {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.member {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: inherit;
  font: inherit;
  text-align: left;
}

.member--selectable {
  cursor: pointer;
}

.member__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}

.avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.avatar__dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid var(--color-background-soft);
}

.member__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__sub {
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 2px 5px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  opacity: 0.8;
}

.badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  font-variant-numeric: tabular-nums;
}

.badge--done {
  background: #22c55e;
  color: #fff;
}
</style>
