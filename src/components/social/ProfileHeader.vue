<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UserAvatar from '@/components/social/UserAvatar.vue'
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
      <UserAvatar :id="profile.id" :name="profile.displayName" :size="72" />
      <div class="identity__body">
        <h2 class="identity__name">{{ profile.displayName }}</h2>
        <span v-if="!isMe && profile.followsMe" class="tag">{{
          t('social.profile.followsYou')
        }}</span>
        <span class="identity__since">{{
          t('social.profile.trainingSince', { date: since })
        }}</span>
      </div>
    </div>

    <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>

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
  </section>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  font-size: 20px;
  font-weight: 800;
  color: var(--color-heading);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.identity__since {
  font-size: 12px;
  opacity: 0.6;
}

.tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
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
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  color: inherit;
  font: inherit;
}

.stat--link {
  border-color: var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
}

.stat--link:active {
  background: var(--color-background-mute);
}

.stat__value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.stat__label {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
}
</style>
