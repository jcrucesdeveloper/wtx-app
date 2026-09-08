<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore, type StoredRoutine } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ShareRoutineSheet from '@/components/share/ShareRoutineSheet.vue'

const ui = useUiStore()
const { sharePickerOpen } = storeToRefs(ui)
const routines = useRoutinesStore()

const items = computed(() =>
  routines.list.map((routine) => ({ routine, result: parseTemplateText(routine.rawText) })),
)

const selected = ref<StoredRoutine | null>(null)
const shareOpen = ref(false)

const selectedName = computed(() => {
  if (!selected.value) return ''
  const result = parseTemplateText(selected.value.rawText)
  return result.ok ? result.template.name : selected.value.filename
})

function pick(routine: StoredRoutine) {
  selected.value = routine
  shareOpen.value = true
}

watch(sharePickerOpen, (open) => {
  if (!open) {
    selected.value = null
    shareOpen.value = false
  }
})
</script>

<template>
  <BottomSheet :open="sharePickerOpen" title="Share a routine" @close="ui.close()">
    <p v-if="!items.length" class="empty">No routines to share yet — load or create one first.</p>

    <ul v-else class="list">
      <li v-for="{ routine, result } in items" :key="routine.id">
        <button type="button" class="card" @click="pick(routine)">
          <template v-if="result.ok">
            <span class="card__name">{{ result.template.name }}</span>
            <RoutineSummary :template="result.template" />
          </template>
          <template v-else>
            <span class="card__name">{{ routine.filename }}</span>
            <span class="card__error">Could not parse — still shareable as text</span>
          </template>
        </button>
      </li>
    </ul>

    <ShareRoutineSheet
      v-if="selected"
      v-model:open="shareOpen"
      :raw-text="selected.rawText"
      :name="selectedName"
    />
  </BottomSheet>
</template>

<style scoped>
.empty {
  font-size: 14px;
  opacity: 0.7;
  padding: 12px 0;
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
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.card__name {
  font-weight: 600;
  color: var(--color-heading);
}

.card__error {
  font-size: 13px;
  color: #e11d48;
}
</style>
