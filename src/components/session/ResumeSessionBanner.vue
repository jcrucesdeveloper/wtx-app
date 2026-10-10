<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

const { t } = useI18n()
const activeSession = useActiveSessionStore()
const route = useRoute()

/**
 * A workout in progress, seen from elsewhere in the app. Not on Train, whose
 * hero already says so, and not on the workout itself.
 */
const visible = computed(
  () => activeSession.isActive && route.name !== 'active-session' && route.name !== 'home',
)
</script>

<template>
  <!-- Rides above the bottom bar the way a now-playing strip does: one tap from resuming. -->
  <RouterLink v-if="visible" to="/sessions/active" class="banner">
    <span class="banner__dot" />
    <span class="banner__name">{{ activeSession.session?.draft.name }}</span>
    <span class="banner__time">{{ formatClock(activeSession.elapsedSeconds) }}</span>
    <span class="banner__cta">{{ t('session.resumeBanner.resume') }}</span>
  </RouterLink>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 var(--space-3) var(--space-2);
  padding: 10px 10px 10px var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--color-heading);
  background: var(--color-background-mute);
  text-decoration: none;
}

.banner__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  flex-shrink: 0;
}

.banner__name {
  font-weight: var(--weight-medium);
  font-size: var(--text-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner__time {
  font-size: var(--text-small);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.banner__cta {
  margin-left: auto;
  padding: 9px 14px;
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-on-accent);
  background: var(--color-accent);
  flex-shrink: 0;
}

/* The dot breathes while the clock runs. */
@media (prefers-reduced-motion: no-preference) {
  .banner__dot {
    animation: banner-pulse 1.6s ease-in-out infinite;
  }
}

@keyframes banner-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
