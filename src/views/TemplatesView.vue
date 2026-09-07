<script setup lang="ts">
import AppPage from '@/components/AppPage.vue'

const templates = [
  { name: 'Full Body', detail: '6 exercises · 45 min' },
  { name: 'Push Day', detail: '5 exercises · 40 min' },
  { name: 'Pull Day', detail: '5 exercises · 40 min' },
  { name: 'Leg Day', detail: '4 exercises · 50 min' },
  { name: 'Mobility', detail: '8 exercises · 20 min' },
]
</script>

<template>
  <AppPage title="Templates">
    <ul class="list">
      <li v-for="t in templates" :key="t.name" class="card">
        <span class="card__name">{{ t.name }}</span>
        <span class="card__detail">{{ t.detail }}</span>
      </li>
    </ul>
  </AppPage>
</template>

<style scoped>
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
}

.card__name {
  font-weight: 600;
  color: var(--color-heading);
}

.card__detail {
  font-size: 13px;
  opacity: 0.7;
}
</style>
