<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import { emptyDraft, serializeTemplate } from '@/lib/serializeRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineForm from '@/components/wtx/RoutineForm.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'

const router = useRouter()
const ui = useUiStore()
const { createSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()

const draft = ref(emptyDraft())
const submitError = ref('')

const rawText = computed(() => serializeTemplate(draft.value))
const result = computed(() => parseTemplateText(rawText.value))
const canSubmit = computed(() => draft.value.name.trim().length > 0 && result.value.ok)

watch(createSheetOpen, (open) => {
  if (!open) {
    draft.value = emptyDraft()
    submitError.value = ''
  }
})

function onSubmit() {
  submitError.value = ''
  try {
    const routine = routines.add(rawText.value, '')
    ui.close()
    router.push(`/templates/${routine.id}`)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <BottomSheet :open="createSheetOpen" title="Create a routine" @close="ui.close()">
    <RoutineForm v-model="draft" />

    <div v-if="result.ok" class="preview">
      <h3 class="preview__name">{{ result.template.name }}</h3>
      <RoutineSummary :template="result.template" />
      <ExerciseList
        class="preview__list"
        :exercises="result.template.exercises"
        :unit="result.template.unit"
      />
    </div>
    <p v-else class="error">{{ result.error }}</p>

    <p v-if="submitError" class="error">{{ submitError }}</p>

    <button type="button" class="primary" :disabled="!canSubmit" @click="onSubmit">
      Create routine
    </button>
  </BottomSheet>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.preview__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.preview__list {
  margin-top: 2px;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}

.primary {
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
