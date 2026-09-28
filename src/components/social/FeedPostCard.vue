<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, PartyPopper, TrendingDown, TrendingUp } from '@lucide/vue'
import PersonalRecordBanner from '@/components/session/PersonalRecordBanner.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import { useFeedStore, type FeedPost } from '@/stores/feed'
import { formatClock, formatNumber } from '@/lib/format'

const props = defineProps<{ post: FeedPost }>()

const { t, locale } = useI18n()
const feed = useFeedStore()

const expanded = ref(false)

const postedAt = new Date(props.post.createdAt).toLocaleDateString(locale.value, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function toggleKudos() {
  void feed.toggleKudos(props.post.sessionId)
}
</script>

<template>
  <article class="card">
    <header class="head">
      <div class="head__body">
        <span class="head__name">{{ post.posterName }}</span>
        <span class="head__meta">{{ post.session.name }} · {{ postedAt }}</span>
      </div>
    </header>

    <div class="stats">
      <div v-if="post.snapshot" class="stat">
        <span class="stat__value">{{ formatClock(post.snapshot.elapsedSeconds) }}</span>
        <span class="stat__label">{{ t('sessionComplete.time') }}</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ post.session.exerciseCount }}</span>
        <span class="stat__label">{{ t('sessionComplete.exercises') }}</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ post.session.totalWorkingSets }}</span>
        <span class="stat__label">{{ t('sessionComplete.sets') }}</span>
      </div>
      <div v-if="post.session.totalVolume > 0" class="stat">
        <span class="stat__value">{{ formatNumber(post.session.totalVolume) }}</span>
        <span class="stat__label">{{ t('sessionComplete.volumeUnit', { unit: post.session.unit }) }}</span>
      </div>
    </div>

    <div v-if="post.snapshot?.personalRecords.length" class="stack">
      <PersonalRecordBanner
        v-for="pr in post.snapshot.personalRecords"
        :key="pr.exerciseName"
        :record="pr"
        :unit="post.session.unit"
      />
    </div>

    <div v-if="post.snapshot?.comparison" class="compare">
      <component
        :is="post.snapshot.comparison.isVolumeUp ? TrendingUp : TrendingDown"
        :size="16"
        :stroke-width="2.25"
        :class="post.snapshot.comparison.isVolumeUp ? 'compare__icon--up' : 'compare__icon--down'"
      />
      <span class="compare__text">
        {{
          t(
            post.snapshot.comparison.isVolumeUp ? 'sessionComplete.moreVolume' : 'sessionComplete.lessVolume',
            { value: formatNumber(Math.abs(post.snapshot.comparison.volumeDelta)), unit: post.session.unit },
          )
        }}
      </span>
    </div>

    <div v-if="post.snapshot?.milestone" class="milestone">
      <PartyPopper :size="16" :stroke-width="2.25" class="milestone__icon" />
      <span class="milestone__label">{{
        t(
          post.snapshot.milestone.kind === 'total-sessions'
            ? 'sessionComplete.milestoneSessions'
            : 'sessionComplete.milestoneStreak',
          { count: post.snapshot.milestone.count },
        )
      }}</span>
    </div>

    <button type="button" class="expand" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? t('social.feed.hideExercises') : t('social.feed.showExercises') }}
      <ChevronDown :size="14" :stroke-width="2.5" :class="{ 'expand__icon--open': expanded }" />
    </button>
    <LoggedExerciseList v-if="expanded" :exercises="post.session.exercises" :unit="post.session.unit" />

    <button
      type="button"
      class="kudos"
      :class="{ 'kudos--on': post.kudosByMe }"
      :aria-pressed="post.kudosByMe"
      :aria-label="t('social.feed.kudosAria')"
      @click="toggleKudos"
    >
      💪 <span v-if="post.kudosCount > 0">{{ post.kudosCount }}</span>
    </button>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.head__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-heading);
}

.head__meta {
  font-size: 12px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat__value {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.stat__label {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.compare__icon--up {
  color: #16a34a;
}

.compare__icon--down {
  color: #e11d48;
}

.milestone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-background-soft));
  border: 1px solid var(--color-accent);
}

.milestone__icon {
  color: var(--color-accent);
}

.milestone__label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-heading);
}

.expand {
  display: flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
}

.expand__icon--open {
  transform: rotate(180deg);
}

.kudos {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  font-size: 14px;
  background: var(--color-background-mute);
  cursor: pointer;
}

.kudos--on {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-background-mute));
}
</style>
