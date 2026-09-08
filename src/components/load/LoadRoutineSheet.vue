<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import QrScanner from 'qr-scanner'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { parseTemplateText } from '@/lib/parseRoutine'
import { readScannedRoutine } from '@/lib/share'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'

const router = useRouter()
const ui = useUiStore()
const { loadSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()

type Mode = 'paste' | 'qr' | 'file'
const mode = ref<Mode>('paste')
const text = ref('')
const filename = ref('')
const fileError = ref('')
const submitError = ref('')

/** `idle` before the camera is asked for; `error` covers permission + missing-camera. */
type QrState = 'idle' | 'starting' | 'scanning' | 'error'
const qrState = ref<QrState>('idle')
const qrMessage = ref('')

const video = useTemplateRef<HTMLVideoElement>('video')
let scanner: QrScanner | null = null

const result = computed(() => (text.value.trim() ? parseTemplateText(text.value) : null))

function reset() {
  stopScanner()
  mode.value = 'paste'
  text.value = ''
  filename.value = ''
  fileError.value = ''
  submitError.value = ''
  qrState.value = 'idle'
  qrMessage.value = ''
}

watch(loadSheetOpen, (open) => {
  if (!open) reset()
})

watch(
  [loadSheetOpen, mode],
  ([open, current]) => {
    if (open && current === 'qr') startScanner()
    else stopScanner()
  },
  { flush: 'post' },
)

function onScan(scanned: string) {
  const routineText = readScannedRoutine(scanned)
  if (!routineText) {
    qrMessage.value = "That QR code isn't a wtx routine."
    return
  }
  text.value = routineText
  filename.value = ''
  stopScanner()
  mode.value = 'paste'
}

async function startScanner() {
  if (scanner || !video.value) return
  qrState.value = 'starting'
  qrMessage.value = ''
  scanner = new QrScanner(video.value, (detected) => onScan(detected.data), {
    returnDetailedScanResult: true,
    highlightScanRegion: true,
    maxScansPerSecond: 5,
  })
  try {
    await scanner.start()
    qrState.value = 'scanning'
  } catch {
    qrState.value = 'error'
    qrMessage.value = 'Camera unavailable. Scan a QR image instead.'
    stopScanner()
  }
}

function stopScanner() {
  scanner?.destroy()
  scanner = null
  if (qrState.value !== 'error') qrState.value = 'idle'
}

async function onQrImage(event: Event) {
  qrMessage.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const detected = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
    onScan(detected.data)
  } catch {
    qrMessage.value = 'No QR code found in that image.'
  }
}

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
    ui.close()
    router.push(`/templates/${routine.id}`)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  }
}

onBeforeUnmount(stopScanner)
</script>

<template>
  <BottomSheet :open="loadSheetOpen" title="Load a routine" @close="ui.close()">
    <div class="segmented">
      <button type="button" :class="{ active: mode === 'paste' }" @click="mode = 'paste'">
        Paste
      </button>
      <button type="button" :class="{ active: mode === 'qr' }" @click="mode = 'qr'">QR</button>
      <button type="button" :class="{ active: mode === 'file' }" @click="mode = 'file'">
        File
      </button>
    </div>

    <div v-if="mode === 'paste'" class="field">
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

    <div v-else-if="mode === 'qr'" class="field">
      <div class="qr-frame">
        <video ref="video" class="qr-video" muted playsinline />
        <p v-if="qrState === 'starting'" class="qr-hint">Starting camera…</p>
        <p v-else-if="qrState === 'scanning'" class="qr-hint">Point at a routine QR code</p>
      </div>
      <label class="qr-image-btn">
        <input type="file" accept="image/*" @change="onQrImage" />
        <span>Scan a QR image instead</span>
      </label>
      <p v-if="qrMessage" class="error">{{ qrMessage }}</p>
    </div>

    <div v-else class="field">
      <label class="file-drop">
        <input type="file" accept=".wtt,text/plain" @change="onFile" />
        <span>{{ filename || 'Choose a .wtt file' }}</span>
      </label>
      <p v-if="fileError" class="error">{{ fileError }}</p>
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
  </BottomSheet>
</template>

<style scoped>
.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.qr-frame {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
}

.qr-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.qr-image-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 1px dashed var(--color-border-hover);
  border-radius: 12px;
  font-size: 13px;
  opacity: 0.85;
  cursor: pointer;
}

.qr-image-btn input {
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
</style>
