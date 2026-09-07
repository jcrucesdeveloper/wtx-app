<script setup lang="ts">
import AppPage from '@/components/AppPage.vue'

const sessions = [
  { date: 'Today', name: 'Push Day', done: false },
  { date: 'Mon', name: 'Leg Day', done: true },
  { date: 'Sat', name: 'Full Body', done: true },
  { date: 'Thu', name: 'Pull Day', done: true },
]
</script>

<template>
  <AppPage title="Sessions">
    <ul class="list">
      <li v-for="s in sessions" :key="s.date + s.name" class="row">
        <span class="row__date">{{ s.date }}</span>
        <span class="row__name">{{ s.name }}</span>
        <span class="row__status" :class="{ 'row__status--done': s.done }">
          {{ s.done ? 'Done' : 'Planned' }}
        </span>
      </li>
    </ul>
  </AppPage>
</template>

<style scoped>
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.row__date {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.6;
}

.row__name {
  font-weight: 600;
  color: var(--color-heading);
}

.row__status {
  font-size: 12px;
  opacity: 0.7;
}

.row__status--done {
  color: var(--color-accent);
  opacity: 1;
}
</style>
