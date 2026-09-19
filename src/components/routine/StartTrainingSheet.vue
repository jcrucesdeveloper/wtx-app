<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { parseTemplateText } from '@/lib/parseRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'

const ui = useUiStore()
const { startSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()
const { startRoutine } = useStartRoutine()

const items = computed(() =>
  routines.list.map((routine) => ({
    routine,
    result: parseTemplateText(routine.rawText),
  })),
)

function pick(routineId: string) {
  ui.close()
  startRoutine(routineId)
}

function goLoad() {
  ui.open('load')
}
</script>

<template>
  <BottomSheet :open="startSheetOpen" title="Start training" @close="ui.close()">
    <div v-if="!items.length" class="empty">
      <p class="empty__title">No routines yet</p>
      <p class="empty__hint">Load a <code>.wtt</code> template to get started.</p>
      <button type="button" class="empty__btn" @click="goLoad">Load a routine</button>
    </div>

    <ul v-else class="list">
      <li v-for="{ routine, result } in items" :key="routine.id">
        <button v-if="result.ok" type="button" class="card" @click="pick(routine.id)">
          <span class="card__name">{{ result.template.name }}</span>
          <RoutineSummary :template="result.template" />
        </button>
        <span v-else class="card card--error">
          <span class="card__name">{{ routine.filename }}</span>
          <span class="card__error">Could not parse — edit it from the Routines tab</span>
        </span>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.card--error {
  cursor: default;
  border-left-color: var(--color-border);
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
  padding: 32px 24px;
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
