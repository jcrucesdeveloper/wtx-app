<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import HeaderLink from '@/components/ui/HeaderLink.vue'
import TrainHome from '@/components/routine/TrainHome.vue'
import { useRoutinesStore } from '@/stores/routines'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const routines = useRoutinesStore()
const ui = useUiStore()
</script>

<template>
  <AppPage :title="t('nav.train')">
    <template #actions>
      <HeaderLink kind="settings" />
    </template>

    <div v-if="!routines.list.length" class="empty">
      <p class="empty__title">{{ t('routines.emptyTitle') }}</p>
      <p class="empty__hint">{{ t('routines.emptyHint', { ext: '.wtt' }) }}</p>
      <div class="empty__actions">
        <AppButton variant="primary" size="lg" block @click="ui.open('create')">
          {{ t('wtx.actions.create.title') }}
        </AppButton>
        <AppButton block @click="ui.open('load')">{{ t('wtx.actions.load.title') }}</AppButton>
      </div>
    </div>

    <TrainHome v-else />
  </AppPage>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-8);
}

.empty__title {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.empty__hint {
  font-size: var(--text-body);
}

.empty__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: var(--space-5);
}
</style>
