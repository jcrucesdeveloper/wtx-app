<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useUiStore, type Sheet } from '@/stores/ui'
import { useActiveSessionStore } from '@/stores/activeSession'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

const { t } = useI18n()
const ui = useUiStore()
const { menuOpen } = storeToRefs(ui)
const router = useRouter()
const activeSession = useActiveSessionStore()

interface Action {
  key: 'start' | 'group' | 'load' | 'create'
  icon: IconName
  title: string
  hint: string
  badge?: string
}

const actions = computed<Action[]>(() => [
  {
    key: 'start',
    icon: 'start',
    title: t('wtx.actions.start.title'),
    hint: t('wtx.actions.start.hint'),
  },
  {
    key: 'group',
    icon: 'group',
    title: t('wtx.actions.group.title'),
    hint: t('wtx.actions.group.hint'),
    badge: t('wtx.actions.group.badge'),
  },
  {
    key: 'load',
    icon: 'load',
    title: t('wtx.actions.load.title'),
    hint: t('wtx.actions.load.hint'),
  },
  {
    key: 'create',
    icon: 'create',
    title: t('wtx.actions.create.title'),
    hint: t('wtx.actions.create.hint'),
  },
])

function onSelect(action: Action) {
  if (action.key === 'start') {
    ui.close()
    if (activeSession.isActive) {
      router.push({ name: 'active-session' })
    } else {
      ui.open('start')
    }
    return
  }

  if (action.key === 'group') {
    ui.close()
    router.push({ name: 'social' })
    return
  }

  ui.open(action.key as Sheet)
}
</script>

<template>
  <BottomSheet :open="menuOpen" :title="t('wtx.actionSheetTitle')" @close="ui.close()">
    <ul class="actions">
      <li v-for="action in actions" :key="action.key">
        <button
          type="button"
          class="action"
          :class="{ 'action--primary': action.key === 'start' }"
          @click="onSelect(action)"
        >
          <span class="action__icon">
            <AppIcon :name="action.icon" :size="20" />
          </span>
          <span class="action__body">
            <span class="action__title">
              {{ action.title }}
              <span v-if="action.badge" class="action__badge">{{ action.badge }}</span>
            </span>
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

.action--primary {
  border-left-width: 3px;
  background: var(--color-background-mute);
}

.action--primary .action__icon {
  background: var(--color-accent);
  color: #fff;
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--color-heading);
}

.action__badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.7;
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
