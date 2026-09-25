<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useExerciseName } from '@/composables/useExerciseName'
import { parseTemplateText } from '@/lib/parseRoutine'
import { buildMemberSession, type PlannedExercise } from '@/lib/memberSession'
import { initials, memberColor } from '@/lib/memberColors'
import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/roomEvents'
import { HapticsService } from '@/services/haptics'

const props = defineProps<{
  /** The member to show; `null` keeps the sheet closed. */
  userId: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const room = useRoomStore()
const auth = useAuthStore()

const memberIndex = computed(() => room.members.findIndex((m) => m.userId === props.userId))
const member = computed(() => (memberIndex.value >= 0 ? room.progress[memberIndex.value] : undefined))
const isMe = computed(() => props.userId !== null && props.userId === auth.user?.id)
const unit = computed(() => room.room?.unit || 'kg')

/** The room's routine — everyone follows the same snapshot. */
const routine = computed<PlannedExercise[]>(() => {
  const wtt = room.room?.routine_wtt
  if (!wtt) return []
  const parsed = parseTemplateText(wtt)
  return parsed.ok ? parsed.template.exercises : []
})

/** Rebuilt from the room's live set logs, so it updates as they tick sets. */
const session = computed(() =>
  props.userId ? buildMemberSession(routine.value, props.userId, room.setLogs) : null,
)

const status = computed(() => {
  if (!member.value || !session.value) return ''
  if (member.value.finishedAt) return t('room.memberSession.finished')
  if (!session.value.currentExercise) return t('room.memberSession.notStarted')
  return t('room.memberSession.onExercise', { name: exerciseName(session.value.currentExercise) })
})

/** The emoji that just went out, for a quick pop on its button. */
const justSent = ref<ReactionEmoji | null>(null)
let popTimer: ReturnType<typeof setTimeout> | undefined

function cheer(emoji: ReactionEmoji) {
  if (!props.userId || !room.sendReaction(props.userId, emoji)) return
  void HapticsService.light()
  justSent.value = emoji
  clearTimeout(popTimer)
  popTimer = setTimeout(() => (justSent.value = null), 450)
}

/** Raw weight, like LoggedExerciseList — `formatNumber` would round 47.5 to 48. */
function formatSet(weight: number, reps: number, kind: 'reps' | 'time'): string {
  return `${weight} ${unit.value} × ${reps}${kind === 'time' ? 's' : ''}`
}
</script>

<template>
  <BottomSheet
    :open="!!userId && !!member"
    :title="member ? (isMe ? t('room.you') : member.displayName) : ''"
    @close="emit('close')"
  >
    <template v-if="member && session">
      <div class="summary">
        <span class="avatar" :style="{ background: memberColor(memberIndex) }">
          {{ initials(member.displayName) }}
          <span v-if="member.online" class="avatar__dot" aria-hidden="true" />
        </span>
        <span class="summary__body">
          <span class="summary__status">{{ status }}</span>
          <span class="summary__progress">
            {{ t('room.memberSession.setsProgress', { done: session.done, total: session.planned }) }}
          </span>
        </span>
      </div>

      <div v-if="!isMe && room.room?.status !== 'lobby'" class="cheer">
        <span class="cheer__label">{{ t('room.cheer.title', { name: member.displayName }) }}</span>
        <div class="cheer__row">
          <button
            v-for="emoji in REACTION_EMOJIS"
            :key="emoji"
            type="button"
            class="cheer__btn"
            :class="{ 'cheer__btn--pop': justSent === emoji }"
            :aria-label="t('room.cheer.sendAria', { emoji })"
            @click="cheer(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <ol class="exercises">
        <li
          v-for="(exercise, i) in session.exercises"
          :key="exercise.name"
          class="exercise"
          :class="{ 'exercise--current': exercise.current && !member.finishedAt }"
        >
          <div class="exercise__head">
            <span class="exercise__index">{{ i + 1 }}</span>
            <ExerciseThumb :name="exercise.name" />
            <div class="exercise__body">
              <span class="exercise__name">{{ exerciseName(exercise.name) }}</span>
              <span class="exercise__meta">
                <template v-if="exercise.planned !== null">
                  {{ t('room.memberSession.setsProgress', { done: exercise.done, total: exercise.planned }) }}
                </template>
                <template v-else>{{ t('room.setsDone', { count: exercise.done }) }} · {{ t('room.memberSession.added') }}</template>
              </span>
            </div>
            <span v-if="exercise.current && !member.finishedAt" class="exercise__badge">
              {{ t('room.memberSession.now') }}
            </span>
          </div>

          <ul v-if="exercise.sets.length" class="sets">
            <li v-for="set in exercise.sets" :key="set.id" class="set" :class="{ 'set--warmup': set.label === 'W' }">
              <span class="set__label">{{ set.label }}</span>
              <span class="set__value">{{ formatSet(set.weight, set.reps, exercise.kind) }}</span>
            </li>
          </ul>
        </li>
      </ol>
    </template>
  </BottomSheet>
</template>

<style scoped>
.summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -4px;
}

.avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.avatar__dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid var(--color-background);
}

.summary__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary__status {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary__progress {
  font-size: 12px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.cheer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cheer__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
}

.cheer__row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.cheer__btn {
  display: grid;
  place-items: center;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.cheer__btn:active {
  transform: scale(0.92);
}

.cheer__btn--pop {
  animation: pop 0.45s ease;
  border-color: var(--color-accent);
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cheer__btn--pop {
    animation: none;
  }
}

.exercises {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.exercise--current {
  border-left: 3px solid var(--color-accent);
}

.exercise__head {
  display: grid;
  grid-template-columns: 22px auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.exercise__index {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.exercise__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exercise__name {
  font-weight: 600;
  color: var(--color-heading);
}

.exercise__meta {
  font-size: 12px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.exercise__badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 3px 6px;
  border-radius: var(--radius-xs);
  background: var(--color-accent);
  color: #fff;
}

.sets {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 0 34px;
}

.set {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.set--warmup {
  opacity: 0.6;
}

.set__label {
  width: 18px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.6;
  text-align: center;
}

.set__value {
  color: var(--color-heading);
}
</style>
