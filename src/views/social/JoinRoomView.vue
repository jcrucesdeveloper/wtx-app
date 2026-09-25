<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import QrScanner from 'qr-scanner'
import { ArrowLeft, ScanLine } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import { RoomError, useRoomStore } from '@/stores/room'
import {
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  normalizeRoomCode,
  readScannedRoomCode,
} from '@/lib/roomCode'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const room = useRoomStore()

const code = ref('')
const joining = ref(false)
const error = ref('')

const normalized = computed(() => normalizeRoomCode(code.value))
const canJoin = computed(() => isValidRoomCode(normalized.value) && !joining.value)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  code.value = normalizeRoomCode(input.value).slice(0, ROOM_CODE_LENGTH)
  input.value = code.value
  error.value = ''
}

async function join(value = normalized.value) {
  if (!isValidRoomCode(value) || joining.value) return
  joining.value = true
  error.value = ''
  try {
    const joined = await room.join(value)
    router.replace({ name: 'room-lobby', params: { id: joined.id } })
  } catch (e) {
    error.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    joining.value = false
  }
}

// --- QR scanning ------------------------------------------------------------

const video = ref<HTMLVideoElement | null>(null)
const scanning = ref(false)
let scanner: QrScanner | null = null

async function startScan() {
  error.value = ''
  scanning.value = true
  await nextTick()
  if (!video.value) return
  scanner = new QrScanner(
    video.value,
    (result) => {
      const found = readScannedRoomCode(result.data)
      if (!found) return
      stopScan()
      code.value = found
      void join(found)
    },
    { returnDetailedScanResult: true, highlightScanRegion: true, maxScansPerSecond: 5 },
  )
  try {
    await scanner.start()
  } catch {
    stopScan()
    error.value = t('room.cameraUnavailable')
  }
}

function stopScan() {
  scanner?.destroy()
  scanner = null
  scanning.value = false
}

onMounted(() => {
  const fromLink = typeof route.query.code === 'string' ? normalizeRoomCode(route.query.code) : ''
  if (isValidRoomCode(fromLink)) {
    code.value = fromLink
    void join(fromLink)
  }
})

onBeforeUnmount(stopScan)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage :title="t('room.joinTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <form class="form" @submit.prevent="join()">
      <p class="hint">{{ t('room.joinHint') }}</p>

      <label class="code">
        <span class="sr-only">{{ t('room.codeLabel') }}</span>
        <input
          :value="code"
          class="code__input"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          inputmode="text"
          :maxlength="ROOM_CODE_LENGTH + 2"
          placeholder="K7QM3X"
          @input="onInput"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="primary" :disabled="!canJoin">
        {{ joining ? t('room.joining') : t('room.join') }}
      </button>

      <button v-if="!scanning" type="button" class="secondary" @click="startScan">
        <ScanLine :size="16" :stroke-width="2.25" /> {{ t('room.scan') }}
      </button>
    </form>

    <div v-if="scanning" class="scanner">
      <video ref="video" class="scanner__video" playsinline muted />
      <button type="button" class="secondary" @click="stopScan">{{ t('room.scanStop') }}</button>
    </div>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  margin-left: -4px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  font-size: 14px;
  opacity: 0.75;
}

.code__input {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  text-transform: uppercase;
  padding: 16px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-heading);
}

.code__input::placeholder {
  opacity: 0.2;
}

.code__input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.error {
  font-size: 13px;
  color: #e11d48;
  text-align: center;
}

.primary,
.secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.primary {
  color: #fff;
  background: var(--color-accent);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary {
  color: var(--color-text);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border-hover);
}

.scanner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.scanner__video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-lg);
  background: #000;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
