<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PartyPopper, TrendingDown, TrendingUp, Users } from '@lucide/vue'
import PersonalRecordBanner from '@/components/session/PersonalRecordBanner.vue'
import type { FeedPost } from '@/stores/feed'
import { formatClock, formatNumber } from '@/lib/format'
import { initials, memberColor } from '@/lib/memberColors'

defineProps<{ post: FeedPost }>()

const { t } = useI18n()
</script>

<template>
  <div class="summary">
    <div v-if="post.snapshot?.trainedWith?.length" class="with">
      <Users :size="14" :stroke-width="2.25" class="with__icon" />
      <div class="with__avatars">
        <span
          v-for="(name, i) in post.snapshot.trainedWith"
          :key="name + i"
          class="with__avatar"
          :style="{ background: memberColor(i + 1) }"
          :title="name"
          >{{ initials(name) }}</span
        >
      </div>
      <span class="with__label">{{
        t('social.feed.trainedWith', { names: post.snapshot.trainedWith.join(', ') })
      }}</span>
    </div>
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
        <span class="stat__label">{{
          t('sessionComplete.volumeUnit', { unit: post.session.unit })
        }}</span>
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
            post.snapshot.comparison.isVolumeUp
              ? 'sessionComplete.moreVolume'
              : 'sessionComplete.lessVolume',
            {
              value: formatNumber(Math.abs(post.snapshot.comparison.volumeDelta)),
              unit: post.session.unit,
            },
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
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.with {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.with__icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.with__avatars {
  display: flex;
  flex-shrink: 0;
}

.with__avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--color-background-soft);
  font-size: 9px;
  font-weight: 700;
  color: #fff;
}

.with__avatar + .with__avatar {
  margin-left: -6px;
}

.with__label {
  font-size: 12px;
  font-weight: 600;
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
</style>
