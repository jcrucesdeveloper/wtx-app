<script setup lang="ts">
import AppPage from '@/components/AppPage.vue'

const friends = [
  { name: 'Ana', streak: 12 },
  { name: 'Marco', streak: 5 },
  { name: 'Sofia', streak: 21 },
  { name: 'Leo', streak: 0 },
]

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <AppPage title="Friends">
    <ul class="list">
      <li v-for="f in friends" :key="f.name" class="row">
        <span class="avatar">{{ initials(f.name) }}</span>
        <span class="row__name">{{ f.name }}</span>
        <span class="row__streak">{{ f.streak }} day streak</span>
      </li>
    </ul>
  </AppPage>
</template>

<style scoped>
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.row__name {
  font-weight: 600;
  color: var(--color-heading);
}

.row__streak {
  font-size: 12px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
</style>
