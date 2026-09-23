<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { routineDraftFromSession } from '@/lib/sessionToRoutine'
import { serializeTemplate } from '@/lib/serializeRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** A choice was made; finish the session, optionally linked to a new routine. */
  finish: [routineIdOverride: string | undefined]
}>()

const activeSession = useActiveSessionStore()
const routines = useRoutinesStore()

const template = computed(() => {
  const routineId = activeSession.session?.routineId
  if (!routineId) return undefined
  const result = routines.parsed(routineId)
  return result?.ok ? result.template : undefined
})

const routineName = computed(() => template.value?.name ?? 'this routine')

const mode = ref<'choose' | 'save-new'>('choose')
const newName = ref('')
const error = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    mode.value = 'choose'
    newName.value = `${routineName.value} (edited)`
    error.value = ''
  },
)

function close() {
  emit('update:open', false)
}

function onUpdate() {
  const session = activeSession.session
  if (!session || !template.value) return
  try {
    const draft = routineDraftFromSession(session.draft, template.value)
    routines.update(session.routineId, serializeTemplate(draft))
    emit('finish', undefined)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function onKeepAsIs() {
  emit('finish', undefined)
}

function onSaveNew() {
  const session = activeSession.session
  if (!session || !template.value) return
  try {
    const draft = routineDraftFromSession(session.draft, template.value, newName.value)
    const stored = routines.add(serializeTemplate(draft), '')
    emit('finish', stored.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <BottomSheet :open="open" title="Workout changed" @close="close">
    <template v-if="mode === 'choose'">
      <p class="hint">
        You added or removed exercises — this workout no longer matches
        "{{ routineName }}".
      </p>

      <div class="choices">
        <button type="button" class="choice" @click="mode = 'save-new'">
          <span class="choice__title">Save as a new routine</span>
          <span class="choice__desc">Keep "{{ routineName }}" as-is and create a separate one.</span>
        </button>
        <button type="button" class="choice" @click="onKeepAsIs">
          <span class="choice__title">Just finish this workout</span>
          <span class="choice__desc">Leave "{{ routineName }}" untouched.</span>
        </button>
        <button type="button" class="choice" @click="onUpdate">
          <span class="choice__title">Update "{{ routineName }}"</span>
          <span class="choice__desc">Match the routine to this workout going forward.</span>
        </button>
      </div>
    </template>

    <template v-else>
      <label class="field">
        <span class="field__label">New routine name</span>
        <input v-model="newName" type="text" maxlength="80" />
      </label>

      <div class="actions">
        <button type="button" class="secondary" @click="mode = 'choose'">Back</button>
        <button type="button" class="primary" :disabled="!newName.trim()" @click="onSaveNew">
          Save &amp; finish
        </button>
      </div>
    </template>

    <p v-if="error" class="error">{{ error }}</p>
  </BottomSheet>
</template>

<style scoped>
.hint {
  font-size: 13px;
  opacity: 0.75;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.choice:hover,
.choice:focus-visible {
  border-color: var(--color-border-hover);
}

.choice__title {
  font-weight: 600;
  color: var(--color-heading);
}

.choice__desc {
  font-size: 12px;
  opacity: 0.65;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
}

input {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.actions {
  display: flex;
  gap: 8px;
}

.secondary {
  flex: 1;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.primary {
  flex: 2;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px;
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

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}
</style>
