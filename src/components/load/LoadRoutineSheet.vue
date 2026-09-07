<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'

const router = useRouter()
const ui = useUiStore()
const { loadSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()

type Mode = 'file' | 'paste'
const mode = ref<Mode>('file')
const text = ref('')
const filename = ref('')
const fileError = ref('')
const submitError = ref('')

const result = computed(() => (text.value.trim() ? parseTemplateText(text.value) : null))

function reset() {
  mode.value = 'file'
  text.value = ''
  filename.value = ''
  fileError.value = ''
  submitError.value = ''
}

watch(loadSheetOpen, (open) => {
  if (!open) reset()
})

async function onFile(event: Event) {
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!/\.wtt$/i.test(file.name)) {
    fileError.value = 'Pick a .wtt template file.'
    return
  }
  try {
    text.value = await file.text()
    filename.value = file.name
  } catch {
    fileError.value = 'Could not read that file.'
  }
}

function onSubmit() {
  submitError.value = ''
  try {
    const routine = routines.add(text.value, filename.value)
    ui.closeLoadSheet()
    router.push(`/templates/${routine.id}`)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="loadSheetOpen"
        class="scrim"
        role="dialog"
        aria-modal="true"
        aria-label="Load a routine"
        @click.self="ui.closeLoadSheet()"
        @keydown.esc="ui.closeLoadSheet()"
      >
        <div class="sheet">
          <div class="sheet__grabber" />
          <header class="sheet__head">
            <h2>Load a routine</h2>
            <button type="button" class="icon-btn" aria-label="Close" @click="ui.closeLoadSheet()">
              ✕
            </button>
          </header>

          <div class="segmented">
            <button type="button" :class="{ active: mode === 'file' }" @click="mode = 'file'">
              File
            </button>
            <button type="button" :class="{ active: mode === 'paste' }" @click="mode = 'paste'">
              Paste
            </button>
          </div>

          <div v-if="mode === 'file'" class="field">
            <label class="file-drop">
              <input type="file" accept=".wtt,text/plain" @change="onFile" />
              <span>{{ filename || 'Choose a .wtt file' }}</span>
            </label>
            <p v-if="fileError" class="error">{{ fileError }}</p>
          </div>

          <div v-else class="field">
            <textarea
              v-model="text"
              rows="7"
              spellcheck="false"
              placeholder="# Push Day&#10;unit: kg&#10;&#10;Bench Press | reps 4x8 | 60 | rest 1m30s"
            />
            <input
              v-model="filename"
              class="filename-input"
              type="text"
              placeholder="file name (optional)"
            />
          </div>

          <div v-if="result" class="preview">
            <template v-if="result.ok">
              <h3 class="preview__name">{{ result.template.name }}</h3>
              <p v-if="result.template.notes" class="preview__notes">
                {{ result.template.notes }}
              </p>
              <RoutineSummary :template="result.template" />
              <ExerciseList
                class="preview__list"
                :exercises="result.template.exercises"
                :unit="result.template.unit"
              />
            </template>
            <p v-else class="error">{{ result.error }}</p>
          </div>

          <p v-if="submitError" class="error">{{ submitError }}</p>

          <button type="button" class="primary" :disabled="!result?.ok" @click="onSubmit">
            Add to library
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.sheet {
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
  background: var(--color-background);
  border-radius: 20px 20px 0 0;
}

.sheet__grabber {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-hover);
  margin: 4px 0;
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet__head h2 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 15px;
  padding: 6px;
  cursor: pointer;
  opacity: 0.6;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--color-background-mute);
}

.segmented button {
  border: none;
  background: transparent;
  padding: 8px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.segmented button.active {
  background: var(--color-background);
  opacity: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 12px;
  border: 1px dashed var(--color-border-hover);
  border-radius: 12px;
  font-size: 13px;
  opacity: 0.85;
  cursor: pointer;
  text-align: center;
  word-break: break-all;
}

.file-drop input {
  display: none;
}

textarea,
.filename-input {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  resize: vertical;
}

.filename-input {
  font-family: inherit;
  font-size: 13px;
}

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

.preview__notes {
  font-size: 13px;
  opacity: 0.7;
  margin-top: -4px;
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

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
