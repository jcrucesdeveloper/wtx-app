<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { useSettingsStore } from '@/stores/settings'
import { parseTemplateText } from '@/lib/parseRoutine'
import { emptyDraft, serializeTemplate } from '@/lib/serializeRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineForm from '@/components/wtx/RoutineForm.vue'

const router = useRouter()
const ui = useUiStore()
const { createSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()
const settings = useSettingsStore()

const draft = ref(emptyDraft(settings.defaultUnit))
const submitError = ref('')

const rawText = computed(() => serializeTemplate(draft.value))
const result = computed(() => parseTemplateText(rawText.value))
const canSubmit = computed(() => draft.value.name.trim().length > 0 && result.value.ok)

watch(createSheetOpen, (open) => {
  if (!open) {
    draft.value = emptyDraft(settings.defaultUnit)
    submitError.value = ''
  }
})

function onSubmit() {
  submitError.value = ''
  try {
    const routine = routines.add(rawText.value, '')
    ui.close()
    router.push(`/routines/${routine.id}`)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <BottomSheet :open="createSheetOpen" title="Create a routine" @close="ui.close()">
    <RoutineForm v-model="draft" />

    <p v-if="!result.ok" class="error">{{ result.error }}</p>
    <p v-if="submitError" class="error">{{ submitError }}</p>

    <button type="button" class="primary" :disabled="!canSubmit" @click="onSubmit">
      Create routine
    </button>
  </BottomSheet>
</template>

<style scoped>
.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}

.primary {
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
