<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import { useRoutinesStore } from '@/stores/routines'
import { useUiStore } from '@/stores/ui'
import { parseTemplateText } from '@/lib/parseRoutine'

const routines = useRoutinesStore()
const ui = useUiStore()

const items = computed(() =>
  routines.list.map((routine) => ({
    routine,
    result: parseTemplateText(routine.rawText),
  })),
)
</script>

<template>
  <AppPage title="Templates">
    <template #actions>
      <button v-if="routines.list.length" type="button" class="add" @click="ui.openLoadSheet()">
        + Load
      </button>
    </template>

    <div v-if="!routines.list.length" class="empty">
      <p class="empty__title">No routines yet</p>
      <p class="empty__hint">Load a <code>.wtt</code> template to get started.</p>
      <button type="button" class="empty__btn" @click="ui.openLoadSheet()">Load a routine</button>
    </div>

    <ul v-else class="list">
      <li v-for="{ routine, result } in items" :key="routine.id">
        <RouterLink :to="`/templates/${routine.id}`" class="card">
          <template v-if="result.ok">
            <span class="card__name">{{ result.template.name }}</span>
            <RoutineSummary :template="result.template" />
          </template>
          <template v-else>
            <span class="card__name">{{ routine.filename }}</span>
            <span class="card__error">Could not parse — tap to review</span>
          </template>
        </RouterLink>
      </li>
    </ul>
  </AppPage>
</template>

<style scoped>
.add {
  border: none;
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  text-decoration: none;
  color: inherit;
}

.card__name {
  font-weight: 600;
  color: var(--color-heading);
}

.card__error {
  font-size: 13px;
  color: #e11d48;
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

.empty__btn {
  margin-top: 14px;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
