<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Trash2 } from '@lucide/vue'
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
const saveError = ref('')

const rawText = computed(() => serializeTemplate(draft.value))
const result = computed(() => parseTemplateText(rawText.value))

/** Saves the draft as soon as it parses, so there's no separate "Save" step. */
let saveTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  clearTimeout(saveTimer)
  if (!draft.value.name.trim() || !result.value.ok) return
  try {
    routines.update(props.routineId, rawText.value)
    saveError.value = ''
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : String(error)
  }
}

watch(rawText, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 400)
})

onBeforeUnmount(() => clearTimeout(saveTimer))

watch(
  () => props.open,
  (open) => {
    saveError.value = ''
    if (!open) return
    const parsed = routines.parsed(props.routineId)
    draft.value = parsed?.ok ? draftFromTemplate(parsed.template) : emptyDraft()
  },
)

function close() {
  persist()
  emit('update:open', false)
}

function onDelete() {
  if (!confirm('Remove this routine from your library?')) return
  clearTimeout(saveTimer)
  routines.remove(props.routineId)
  emit('update:open', false)
  router.replace('/')
}
</script>

<template>
  <BottomSheet :open="open" title="Edit routine" @close="close">
    <template #actions>
      <button
        type="button"
        class="icon-btn icon-btn--danger"
        aria-label="Delete routine"
        @click="onDelete"
      >
        <Trash2 :size="18" :stroke-width="2.25" />
      </button>
    </template>

    <RoutineForm v-model="draft" />

    <p v-if="!result.ok" class="error">{{ result.error }}</p>
    <p v-if="saveError" class="error">{{ saveError }}</p>
  </BottomSheet>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  padding: 6px;
  cursor: pointer;
  opacity: 0.6;
}

.icon-btn--danger {
  color: #e11d48;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}
</style>
