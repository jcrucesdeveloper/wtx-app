<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { CalendarDays, Dumbbell, Users } from '@lucide/vue'

/**
 * The bottom bar: three destinations,
 * each a place and none an action, with labels that say what is there.
 * Starting a workout lives on the Train screen; settings sits behind the gear
 * in its header; a workout in progress shows as the strip above this bar.
 */
const { t } = useI18n()
const route = useRoute()

const tabs = computed(() => [
  { to: '/sessions', label: t('nav.history'), icon: CalendarDays, match: ['/sessions'] },
  // In the middle: the most used tab, equally close to a left or a right thumb.
  // Settings and import are reached from Train, so they keep it lit.
  { to: '/', label: t('nav.train'), icon: Dumbbell, match: ['/', '/routines', '/settings', '/import'] },
  { to: '/social', label: t('nav.friends'), icon: Users, match: ['/social', '/rooms'] },
])

function isActive(match: string[]): boolean {
  return match.some((path) => route.path === path || route.path.startsWith(`${path}/`))
}
</script>

<template>
  <nav class="tab-bar" :aria-label="t('nav.mainNavAria')">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ 'tab--active': isActive(tab.match) }"
      :aria-current="isActive(tab.match) ? 'page' : undefined"
    >
      <span class="tab__icon"><component :is="tab.icon" :size="22" :stroke-width="2.25" /></span>
      <span class="tab__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

/* Each tab is a third of the screen wide and 56px tall: hard to miss at the
   bottom edge, where taps are least accurate. */
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 56px;
  color: var(--color-text);
}

.tab__icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 30px;
  border-radius: 999px;
}

.tab__label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

/* The current place is marked by shape and weight, not by the accent: that
   colour is kept for the one thing to do on each screen. */
.tab--active {
  color: var(--color-heading);
}

.tab--active .tab__icon {
  background: var(--color-background-mute);
}

.tab--active .tab__label {
  font-weight: 700;
}

.tab:active .tab__icon {
  transform: scale(0.92);
}

@media (prefers-reduced-motion: no-preference) {
  .tab__icon {
    transition: transform 0.12s ease-out;
  }

  .tab--active .tab__icon {
    animation: tab-select 0.28s var(--ease-spring, ease-out);
  }
}

@keyframes tab-select {
  from {
    transform: scaleX(0.6);
  }
  to {
    transform: scaleX(1);
  }
}
</style>
