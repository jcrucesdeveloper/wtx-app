<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppPage from '@/components/AppPage.vue'

const { t } = useI18n()
</script>

<template>
  <AppPage :title="t('nav.social')">
    <div class="empty">
      <p class="empty__title">{{ t('social.comingSoonTitle') }}</p>
      <p class="empty__hint">
        {{ t('social.comingSoonHint') }}
      </p>
    </div>
  </AppPage>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 64px 24px;
  text-align: center;
}

.empty__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
}
</style>
