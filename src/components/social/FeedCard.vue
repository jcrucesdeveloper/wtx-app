<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Flame, MessageCircle, Users } from '@lucide/vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import { useAuthStore } from '@/stores/auth'
import { useSocialStore, type FeedPost } from '@/stores/social'
import { useExerciseName } from '@/composables/useExerciseName'
import { summarizeWorkout } from '@/lib/feedPost'
import { formatRelativeTime } from '@/lib/relativeTime'
import { formatNumber } from '@/lib/format'
import { HapticsService } from '@/services/haptics'

const props = withDefaults(
  defineProps<{
    post: FeedPost
    /** On the workout's own page: no link to itself, and no exercise preview (the full log follows). */
    detailed?: boolean
  }>(),
  { detailed: false },
)

const { t, locale } = useI18n()
const { exerciseName } = useExerciseName()
const auth = useAuthStore()
const social = useSocialStore()

const isMine = computed(() => props.post.userId === auth.user?.id)
const summary = computed(() => (props.post.session ? summarizeWorkout(props.post.session) : null))
const unit = computed(() => props.post.session?.unit || 'kg')
const when = computed(() => formatRelativeTime(props.post.createdAt, locale.value))
const postLink = computed(() => ({ name: 'social-post', params: { id: props.post.id } }))
const profileLink = computed(() => ({ name: 'social-profile', params: { id: props.post.userId } }))

/** Bodyweight-only workouts have no volume — show reps instead of a big zero (or nothing, if all timed). */
const loadStat = computed(() => {
  const s = summary.value
  if (!s) return null
  if (s.volume > 0) return { value: `${formatNumber(s.volume)} ${unit.value}`, label: t('social.card.volume') }
  if (s.totalReps > 0) return { value: formatNumber(s.totalReps), label: t('social.card.reps') }
  return null
})

const popping = ref(false)

async function kudos() {
  if (isMine.value) return
  if (!props.post.gaveKudos) {
    void HapticsService.light()
    popping.value = true
    setTimeout(() => (popping.value = false), 450)
  }
  try {
    await social.toggleKudos(props.post)
  } catch {
    /* rolled back in the store */
  }
}

function formatBest(weight: number, reps: number, isTime: boolean): string {
  const amount = isTime ? `${reps}s` : `${reps}`
  return weight > 0 ? `${weight} ${unit.value} × ${amount}` : `${amount}${isTime ? '' : ` ${t('social.card.repsShort')}`}`
}
</script>

<template>
  <article class="card">
    <header class="card__head">
      <RouterLink :to="profileLink" class="card__who">
        <UserAvatar :id="post.userId" :name="post.displayName" :size="40" />
        <span class="card__who-body">
          <span class="card__name">{{ isMine ? t('social.you') : post.displayName }}</span>
          <span class="card__meta">
            {{ when }}
            <template v-if="post.roomId">
              ·
              <span class="card__group"><Users :size="12" :stroke-width="2.5" /> {{ t('social.card.groupWorkout') }}</span>
            </template>
          </span>
        </span>
      </RouterLink>
    </header>

    <component :is="detailed ? 'div' : RouterLink" :to="detailed ? undefined : postLink" class="card__body">
      <h3 class="card__title">{{ post.session?.name || t('social.card.untitled') }}</h3>
      <p v-if="post.session?.notes" class="card__notes" :class="{ 'card__notes--clamp': !detailed }">
        {{ post.session.notes }}
      </p>

      <dl v-if="summary" class="stats">
        <div class="stat">
          <dt>{{ t('social.card.exercises') }}</dt>
          <dd>{{ summary.exerciseCount }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t('social.card.sets') }}</dt>
          <dd>{{ summary.workingSets }}</dd>
        </div>
        <div v-if="loadStat" class="stat">
          <dt>{{ loadStat.label }}</dt>
          <dd>{{ loadStat.value }}</dd>
        </div>
      </dl>

      <ul v-if="summary && !detailed && summary.highlights.length" class="highlights">
        <li v-for="h in summary.highlights" :key="h.name" class="highlight">
          <ExerciseThumb :name="h.name" />
          <span class="highlight__name">{{ exerciseName(h.name) }}</span>
          <span class="highlight__best">
            {{ t('social.card.setsCount', { count: h.workingSets }, h.workingSets) }} ·
            {{ formatBest(h.weight, h.reps, h.isTime) }}
          </span>
        </li>
        <li v-if="summary.moreCount" class="highlights__more">
          {{ t('social.card.moreExercises', { count: summary.moreCount }, summary.moreCount) }}
        </li>
      </ul>
    </component>

    <footer class="card__actions">
      <button
        type="button"
        class="action"
        :class="{ 'action--on': post.gaveKudos, 'action--pop': popping, 'action--static': isMine }"
        :aria-pressed="isMine ? undefined : post.gaveKudos"
        :aria-label="isMine ? t('social.card.kudosCountAria', { count: post.kudosCount }) : t('social.card.kudosAria')"
        @click="kudos"
      >
        <Flame :size="18" :stroke-width="2.25" />
        <span>{{ post.kudosCount || (isMine ? '0' : t('social.card.kudos')) }}</span>
      </button>
      <RouterLink
        :to="{ ...postLink, hash: '#comments' }"
        class="action"
        :aria-label="t('social.card.commentsAria', { count: post.commentCount })"
      >
        <MessageCircle :size="18" :stroke-width="2.25" />
        <span>{{ post.commentCount || t('social.card.comment') }}</span>
      </RouterLink>
    </footer>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.card__head {
  display: flex;
  align-items: center;
}

.card__who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.card__who:hover,
.card__body:hover,
.action:hover {
  background: transparent;
}

.card__who-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.card__name {
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__meta {
  font-size: 12px;
  opacity: 0.65;
}

.card__group {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-accent);
  font-weight: 600;
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.card__title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--color-heading);
}

.card__notes {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-line;
}

.card__notes--clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat dt {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.stat dd {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.highlights {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 0;
  border-top: 1px solid var(--color-border);
}

.highlight {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.highlight :deep(.thumb) {
  width: 32px;
  height: 32px;
}

.highlight__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlight__best {
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.highlights__more {
  font-size: 12px;
  opacity: 0.6;
  padding-left: 42px;
}

.card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-decoration: none;
  cursor: pointer;
}

.action--on {
  color: var(--color-accent);
}

.action--on svg {
  fill: currentColor;
}

.action--static {
  cursor: default;
}

.action--pop svg {
  animation: pop 0.45s ease;
}

@keyframes pop {
  40% {
    transform: scale(1.45) rotate(-8deg);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action--pop svg {
    animation: none;
  }
}
</style>
