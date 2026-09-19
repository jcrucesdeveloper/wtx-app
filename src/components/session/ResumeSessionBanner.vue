<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

const activeSession = useActiveSessionStore()
const route = useRoute()

const visible = computed(() => activeSession.isActive && route.name !== 'active-session')
</script>

<template>
  <RouterLink v-if="visible" to="/sessions/active" class="banner">
    <span class="banner__dot" />
    <span class="banner__name">{{ activeSession.session?.draft.name }}</span>
    <span class="banner__time">{{ formatClock(activeSession.elapsedSeconds) }}</span>
    <span class="banner__cta">Resume</span>
  </RouterLink>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-accent);
  color: #fff;
  text-decoration: none;
}

.banner__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.6s ease-in-out infinite;
  flex-shrink: 0;
}

.banner__name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner__time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}

.banner__cta {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  flex-shrink: 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
