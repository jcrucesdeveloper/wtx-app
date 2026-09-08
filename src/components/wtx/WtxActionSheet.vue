<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const ui = useUiStore()
const { menuOpen } = storeToRefs(ui)
const routines = useRoutinesStore()

interface Action {
  key: 'load' | 'create' | 'sharePicker'
  title: string
  hint: string
  icon: string
  disabled?: boolean
}

const actions: Action[] = [
  {
    key: 'load',
    title: 'Load a routine',
    hint: 'Import a .wtt file or paste its text',
    icon: '📥',
  },
  {
    key: 'create',
    title: 'Create a routine',
    hint: 'Build a new template from scratch',
    icon: '✏️',
  },
  {
    key: 'sharePicker',
    title: 'Share a routine',
    hint: 'Pick one from your library to share',
    icon: '🔗',
  },
]
</script>

<template>
  <BottomSheet :open="menuOpen" title="WTX" @close="ui.close()">
    <ul class="actions">
      <li v-for="action in actions" :key="action.key">
        <button
          type="button"
          class="action"
          :disabled="action.key === 'sharePicker' && !routines.list.length"
          @click="ui.open(action.key)"
        >
          <span class="action__icon" aria-hidden="true">{{ action.icon }}</span>
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
  border-radius: 14px;
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-background-mute);
  font-size: 18px;
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
