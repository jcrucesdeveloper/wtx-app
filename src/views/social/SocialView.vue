<script setup lang="ts">
import AppPage from '@/components/AppPage.vue'
</script>

<template>
  <AppPage title="Social">
    <div class="empty">
      <p class="empty__title">Coming soon</p>
      <p class="empty__hint">
        Training with friends, group sessions, and the rest of social are still in the works.
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
