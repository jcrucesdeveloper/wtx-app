<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { GripVertical } from '@lucide/vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import { useRoutinesStore } from '@/stores/routines'
import { useUiStore } from '@/stores/ui'
import { parseRoutineText } from '@/lib/parseRoutine'
import type { StoredRoutine } from '@/stores/routines'

const routines = useRoutinesStore()
const ui = useUiStore()

const [listEl, ordered] = useDragAndDrop<StoredRoutine>([...routines.list], {
  dragHandle: '.grip',
  draggingClass: 'card-row--dragging',
})

// Pull in adds/removes that happen elsewhere (load sheet, detail screen).
watch(
  () =>
    routines.list
      .map((r) => r.id)
      .slice()
      .sort()
      .join(','),
  () => {
    ordered.value = [...routines.list]
  },
)

// Persist a drag as soon as it lands.
watch(ordered, (next) => {
  routines.reorder(next.map((r) => r.id))
})

const items = computed(() =>
  ordered.value.map((routine) => ({ routine, result: parseRoutineText(routine.rawText) })),
)
</script>

<template>
  <AppPage title="Routines">
    <template #actions>
      <button v-if="routines.list.length" type="button" class="add" @click="ui.openLoadSheet()">
        + Load
      </button>
    </template>

    <div v-if="!routines.list.length" class="empty">
      <p class="empty__title">No routines yet</p>
      <p class="empty__hint">Load a <code>.wtt</code> routine to get started.</p>
      <button type="button" class="empty__btn" @click="ui.openLoadSheet()">Load a routine</button>
    </div>

    <ul v-else ref="listEl" class="list">
      <li v-for="{ routine, result } in items" :key="routine.id" class="card-row">
        <span class="grip" aria-hidden="true">
          <GripVertical :size="18" :stroke-width="2" />
        </span>
        <RouterLink :to="`/routines/${routine.id}`" class="card">
          <template v-if="result.ok">
            <span class="card__name">{{ result.routine.name }}</span>
            <RoutineSummary :routine="result.routine" />
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
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.card-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.card-row--dragging {
  opacity: 0.4;
}

.grip {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
}

.grip:active {
  cursor: grabbing;
  opacity: 1;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
