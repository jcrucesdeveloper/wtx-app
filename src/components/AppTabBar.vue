<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

interface Tab {
  to: string
  label: string
  icon: IconName
}

const tabs: Tab[] = [
  { to: '/templates', label: 'Templates', icon: 'templates' },
  { to: '/sessions', label: 'Sessions', icon: 'sessions' },
  { to: '/friends', label: 'Friends', icon: 'friends' },
  { to: '/settings', label: 'Config', icon: 'settings' },
]

const leftTabs = tabs.slice(0, 2)
const rightTabs = tabs.slice(2)

const emit = defineEmits<{
  load: []
}>()
</script>

<template>
  <nav class="tab-bar" aria-label="Main navigation">
    <RouterLink
      v-for="tab in leftTabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      active-class="tab--active"
    >
      <AppIcon :name="tab.icon" :size="22" class="tab__icon" />
      <span class="tab__label">{{ tab.label }}</span>
    </RouterLink>

    <button type="button" class="fab" aria-label="Load a routine" @click="emit('load')">
      <span class="fab__label">WTX</span>
    </button>

    <RouterLink
      v-for="tab in rightTabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      active-class="tab--active"
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
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0;
  border-radius: 12px;
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
  font-size: 11px;
  line-height: 1;
  font-weight: 500;
}

.fab {
  justify-self: center;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin-top: -28px;
  border: 4px solid var(--color-background);
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
}

.fab:active {
  transform: translateY(0);
}

.fab__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
</style>
