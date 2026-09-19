<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

const sessions = useSessionsStore()
const activeSession = useActiveSessionStore()

const items = computed(() =>
  sessions.list.map((session) => ({ session, result: sessions.parsed(session.id) })),
)
</script>

<template>
  <AppPage title="Sessions">
    <RouterLink v-if="activeSession.isActive" to="/sessions/active" class="resume">
      <span class="resume__label">Continue workout</span>
      <span class="resume__name">{{ activeSession.session?.draft.name }}</span>
      <span class="resume__time">{{ formatClock(activeSession.elapsedSeconds) }}</span>
    </RouterLink>

    <div v-if="!items.length" class="empty">
      <p class="empty__title">No sessions yet</p>
      <p class="empty__hint">Start a routine to log your first workout.</p>
    </div>

    <ul v-else class="list">
      <li v-for="{ session, result } in items" :key="session.id">
        <RouterLink :to="`/sessions/${session.id}`" class="row">
          <span class="row__date">{{ result?.ok ? result.session.date : '—' }}</span>
          <span class="row__name">{{ result?.ok ? result.session.name : session.filename }}</span>
          <span
            class="row__status"
            :class="{ 'row__status--done': result?.ok && result.session.isComplete }"
          >
            {{ result?.ok ? (result.session.isComplete ? 'Done' : 'Partial') : 'Error' }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </AppPage>
</template>

<style scoped>
.resume {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  margin-bottom: 12px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  text-decoration: none;
}

.resume__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.85;
}

.resume__name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume__time {
  margin-left: auto;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
}

.row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  text-decoration: none;
  color: inherit;
}

.row__date {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.row__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__status {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 3px 6px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-xs);
  opacity: 0.7;
}

.row__status--done {
  color: var(--color-accent);
  border-color: var(--color-accent);
  opacity: 1;
}

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
