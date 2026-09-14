<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import { draftFromTemplate, emptyDraft, serializeTemplate } from '@/lib/serializeRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineForm from '@/components/wtx/RoutineForm.vue'

const props = defineProps<{
  open: boolean
  routineId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const routines = useRoutinesStore()

const draft = ref(emptyDraft())
const submitError = ref('')

const rawText = computed(() => serializeTemplate(draft.value))
const result = computed(() => parseTemplateText(rawText.value))
const canSubmit = computed(() => draft.value.name.trim().length > 0 && result.value.ok)

watch(
  () => props.open,
  (open) => {
    submitError.value = ''
    if (!open) return
    const parsed = routines.parsed(props.routineId)
    draft.value = parsed?.ok ? draftFromTemplate(parsed.template) : emptyDraft()
  },
)

function close() {
  emit('update:open', false)
}

function onSubmit() {
  submitError.value = ''
  try {
    routines.update(props.routineId, rawText.value)
    close()
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  }
}

function onDelete() {
  if (!confirm('Remove this routine from your library?')) return
  routines.remove(props.routineId)
  close()
  router.replace('/')
}
</script>

<template>
  <BottomSheet :open="open" title="Edit routine" @close="close">
    <RoutineForm v-model="draft" />

    <p v-if="!result.ok" class="error">{{ result.error }}</p>
    <p v-if="submitError" class="error">{{ submitError }}</p>

    <button type="button" class="primary" :disabled="!canSubmit" @click="onSubmit">
      Save changes
    </button>

    <button type="button" class="delete" @click="onDelete">Delete routine</button>
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

.delete {
  align-self: center;
  border: none;
  background: transparent;
  color: #e11d48;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 4px 8px;
  cursor: pointer;
}
</style>
