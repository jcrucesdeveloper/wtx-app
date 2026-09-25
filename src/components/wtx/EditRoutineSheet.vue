<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoutinesStore } from '@/stores/routines'
import { useSettingsStore } from '@/stores/settings'
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

const { t } = useI18n()
const routines = useRoutinesStore()
const settings = useSettingsStore()

const draft = ref(emptyDraft(settings.defaultUnit))
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
    draft.value = parsed?.ok ? draftFromTemplate(parsed.template) : emptyDraft(settings.defaultUnit)
  },
)

function close() {
  persist()
  emit('update:open', false)
}
</script>

<template>
  <BottomSheet :open="open" :title="t('wtx.editRoutine.title')" full-height @close="close">
    <RoutineForm v-model="draft" />

    <p v-if="!result.ok" class="error">{{ result.error }}</p>
    <p v-if="saveError" class="error">{{ saveError }}</p>
  </BottomSheet>
</template>

<style scoped>
.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}
</style>
