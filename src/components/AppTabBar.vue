<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

interface Tab {
  to: string
  label: string
  icon: IconName
  /** Path prefixes that count as "on this tab". */
  match: string[]
}

const tabs: Tab[] = [
  { to: '/', label: 'Templates', icon: 'templates', match: ['/', '/templates'] },
  { to: '/sessions', label: 'Sessions', icon: 'sessions', match: ['/sessions'] },
  { to: '/friends', label: 'Friends', icon: 'friends', match: ['/friends'] },
  { to: '/settings', label: 'Config', icon: 'settings', match: ['/settings'] },
]

const leftTabs = tabs.slice(0, 2)
const rightTabs = tabs.slice(2)

const route = useRoute()

function isActive(tab: Tab): boolean {
  return tab.match.some((path) => route.path === path || route.path.startsWith(`${path}/`))
}

const emit = defineEmits<{
  menu: []
}>()
</script>

<template>
  <nav class="tab-bar" aria-label="Main navigation">
    <RouterLink
      v-for="tab in leftTabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ 'tab--active': isActive(tab) }"
    >
      <AppIcon :name="tab.icon" :size="22" class="tab__icon" />
      <span class="tab__label">{{ tab.label }}</span>
    </RouterLink>

    <button type="button" class="fab" aria-label="Open WTX actions" @click="emit('menu')">
      <span class="fab__label">WTX</span>
    </button>

    <RouterLink
      v-for="tab in rightTabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ 'tab--active': isActive(tab) }"
    >
      <AppIcon :name="tab.icon" :size="22" class="tab__icon" />
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
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  gap: 2px;
  padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
  background: var(--color-background);
  border-top: 1px solid var(--color-border-hover);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  opacity: 0.55;
  text-decoration: none;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}

.tab:hover {
  opacity: 0.8;
  background: transparent;
}

.tab--active {
  opacity: 1;
  color: var(--color-accent);
}

.tab__label {
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
}

.fab {
  justify-self: stretch;
  align-self: stretch;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
  transition: filter 0.12s ease;
}

.fab:hover {
  filter: brightness(1.08);
}

.fab:active {
  filter: brightness(0.95);
}

.fab__label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
</style>
