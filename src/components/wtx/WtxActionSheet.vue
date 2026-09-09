<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

const ui = useUiStore()
const { menuOpen } = storeToRefs(ui)

interface Action {
  key: 'load' | 'create'
  icon: IconName
  title: string
  hint: string
}

const actions: Action[] = [
  {
    key: 'load',
    icon: 'load',
    title: 'Load a routine',
    hint: 'Import a .wtt file or paste its text',
  },
  {
    key: 'create',
    icon: 'create',
    title: 'Create a routine',
    hint: 'Build a new template from scratch',
  },
]
</script>

<template>
  <BottomSheet :open="menuOpen" title="WTX" @close="ui.close()">
    <ul class="actions">
      <li v-for="action in actions" :key="action.key">
        <button type="button" class="action" @click="ui.open(action.key)">
          <span class="action__icon">
            <AppIcon :name="action.icon" :size="20" />
          </span>
          <span class="action__body">
            <span class="action__title">{{ action.title }}</span>
            <span class="action__hint">{{ action.hint }}</span>
          </span>
          <span class="action__chevron" aria-hidden="true">›</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.actions {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.action {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.action__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-accent);
}

.action__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action__title {
  font-weight: 600;
  color: var(--color-heading);
}

.action__hint {
  font-size: 12px;
  opacity: 0.7;
}

.action__chevron {
  font-size: 20px;
  opacity: 0.4;
}
</style>
