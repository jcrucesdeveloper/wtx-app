<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import HistoryOverview from '@/components/session/HistoryOverview.vue'
import { useSessionsStore } from '@/stores/sessions'

const { t } = useI18n()
const router = useRouter()
const sessions = useSessionsStore()
</script>

<template>
  <AppPage :title="t('nav.history')">
    <HistoryOverview v-if="sessions.list.length" />

    <div v-else class="empty">
      <p class="empty__title">{{ t('sessions.noSessionsTitle') }}</p>
      <p class="empty__hint">{{ t('sessions.noSessionsHint') }}</p>
      <AppButton variant="primary" size="lg" block class="empty__action" @click="router.push('/')">
        {{ t('history.goTrain') }}
      </AppButton>
    </div>
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

.empty__action {
  margin-top: var(--space-5);
}
</style>
