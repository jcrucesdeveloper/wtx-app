<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Camera, Check, Images, RotateCcw, SwitchCamera, X } from '@lucide/vue'
import {
  paintPhotoFrame,
  paintWorkoutCard,
  workoutCardFrame,
  type WorkoutCardData,
  type WorkoutCardFormat,
} from '@/lib/workoutCard'
import {
  cameraFailure,
  fitFrame,
  isMirrored,
  otherFacing,
  photoAreaPercent,
  type CameraFacing,
} from '@/lib/cameraFrame'
import { cameraCount, captureFrame, closeCamera, openCamera } from '@/services/liveCamera'
import { pushBackHandler } from '@/lib/backStack'
import { HapticsService } from '@/services/haptics'

/**
 * Taking the share card's photo with the card's frame drawn live over the
 * camera: the photo slot shows the preview, the name and the numbers sit
 * where they will be, so the shot is framed for the card and not blind. The
 * frame is drawn by the same code as the shared image, and the preview fills
 * the slot with the same centred crop, so what is on screen is the card.
 *
 * When the camera can't be streamed it hands back to the system camera
 * (`unavailable`); when access is refused it says so here and offers the
 * gallery, since the system camera would be refused too.
 */
const props = defineProps<{
  open: boolean
  data: WorkoutCardData | null
}>()

const emit = defineEmits<{
  close: []
  photo: [image: HTMLImageElement]
  gallery: []
  unavailable: []
}>()

const format = defineModel<WorkoutCardFormat>('format', { default: 'story' })

const { t } = useI18n()

type State = 'starting' | 'live' | 'captured' | 'denied'
const state = ref<State>('starting')

const FACING_KEY = 'wtx.shareCamera.facing'
function savedFacing(): CameraFacing {
  try {
    return localStorage.getItem(FACING_KEY) === 'user' ? 'user' : 'environment'
  } catch {
    return 'environment'
  }
}
const facing = ref<CameraFacing>(savedFacing())
const mirrored = ref(false)
const canFlip = ref(false)

const video = ref<HTMLVideoElement | null>(null)
const frameCanvas = ref<HTMLCanvasElement | null>(null)
const room = ref<HTMLElement | null>(null)
const shutter = ref<HTMLButtonElement | null>(null)
const useButton = ref<HTMLButtonElement | null>(null)
const roomSize = ref({ width: 0, height: 0 })
const captured = ref<HTMLImageElement | null>(null)
const flashing = ref(false)

let stream: MediaStream | null = null
/** Bumped on every start and stop, so a camera that opens after the view moved on is closed. */
let attempt = 0

const stageSize = computed(() => {
  const frame = workoutCardFrame(format.value)
  return fitFrame(roomSize.value.width, roomSize.value.height, frame.width, frame.height)
})
const photoArea = computed(() => (props.data ? photoAreaPercent(props.data, format.value) : {}))

async function start() {
  const mine = ++attempt
  stop(false)
  state.value = 'starting'
  try {
    const opened = await openCamera(facing.value)
    if (mine !== attempt || !props.open) {
      closeCamera(opened)
      return
    }
    stream = opened
    const track = opened.getVideoTracks()[0]
    mirrored.value = isMirrored(facing.value, track?.getSettings().facingMode)
    await nextTick()
    if (video.value) {
      video.value.srcObject = opened
      await video.value.play().catch(() => {})
    }
    state.value = 'live'
    canFlip.value = (await cameraCount()) > 1
  } catch (err) {
    if (mine !== attempt) return
    console.warn('[camera] could not start', err)
    if (cameraFailure(err) === 'denied') state.value = 'denied'
    else emit('unavailable')
  }
}

function stop(bump = true) {
  if (bump) attempt++
  closeCamera(stream)
  stream = null
  if (video.value) video.value.srcObject = null
}

async function paintFrame() {
  await nextTick()
  if (!props.open || !props.data || !frameCanvas.value) return
  if (state.value === 'captured' && captured.value) {
    paintWorkoutCard(frameCanvas.value, props.data, 'photo', captured.value, format.value)
  } else {
    paintPhotoFrame(frameCanvas.value, props.data, format.value)
  }
}

watch(() => [props.open, props.data, format.value, state.value, captured.value], paintFrame)

async function shoot() {
  if (state.value !== 'live' || !video.value) return
  void HapticsService.light()
  flashing.value = true
  setTimeout(() => (flashing.value = false), 220)
  try {
    captured.value = await captureFrame(video.value, mirrored.value)
    state.value = 'captured'
    await nextTick()
    useButton.value?.focus()
  } catch (err) {
    console.warn('[camera] capture failed', err)
  }
}

function retake() {
  captured.value = null
  state.value = stream ? 'live' : 'starting'
  if (!stream) void start()
  void nextTick(() => shutter.value?.focus())
}

function usePhoto() {
  if (!captured.value) return
  void HapticsService.selection()
  emit('photo', captured.value)
}

function flip() {
  facing.value = otherFacing(facing.value)
  try {
    localStorage.setItem(FACING_KEY, facing.value)
  } catch {
    // Remembering the side is a convenience only.
  }
  void HapticsService.selection()
  void start()
}

function pickFormat(next: WorkoutCardFormat) {
  format.value = next
  void HapticsService.selection()
}

function back() {
  if (state.value === 'captured') retake()
  else emit('close')
}

// The camera light goes off while the app is in the background.
function onVisibility() {
  if (!props.open) return
  if (document.hidden) stop()
  else if (state.value !== 'captured' && state.value !== 'denied') void start()
}

let popBack: (() => void) | null = null
let observer: ResizeObserver | null = null

watch(
  () => props.open,
  async (open) => {
    popBack?.()
    popBack = null
    if (!open) {
      stop()
      observer?.disconnect()
      captured.value = null
      return
    }
    popBack = pushBackHandler(back)
    captured.value = null
    void start()
    await nextTick()
    if (room.value && observer) observer.observe(room.value)
    shutter.value?.focus()
  },
)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    roomSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
})

onBeforeUnmount(() => {
  stop()
  popBack?.()
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="camera">
      <div
        v-if="open"
        class="camera"
        role="dialog"
        aria-modal="true"
        :aria-label="t('framedCamera.title')"
        @keydown.esc="back"
      >
        <header class="camera__top">
          <button
            type="button"
            class="round"
            :aria-label="t('framedCamera.close')"
            @click="emit('close')"
          >
            <X :size="22" :stroke-width="2.25" />
          </button>
          <div class="shape" role="radiogroup" :aria-label="t('finishShare.formatAria')">
            <button
              v-for="option in ['story', 'square'] as const"
              :key="option"
              type="button"
              class="shape__option"
              role="radio"
              :aria-checked="format === option"
              :aria-label="t(`finishShare.format.${option}`)"
              @click="pickFormat(option)"
            >
              {{ t(`shareCard.shape.${option}`) }}
            </button>
          </div>
        </header>

        <div ref="room" class="camera__room">
          <div
            class="stage"
            :style="{ width: `${stageSize.width}px`, height: `${stageSize.height}px` }"
          >
            <video
              v-show="state === 'live' || state === 'starting'"
              ref="video"
              class="stage__video"
              :class="{ 'stage__video--mirrored': mirrored }"
              :style="photoArea"
              muted
              playsinline
              autoplay
              aria-hidden="true"
            />
            <canvas
              ref="frameCanvas"
              class="stage__frame"
              role="img"
              :aria-label="t('framedCamera.frameAria')"
            />

            <div v-if="state === 'starting'" class="status" :style="photoArea" role="status">
              <span class="status__spinner" aria-hidden="true" />
              {{ t('framedCamera.starting') }}
            </div>
            <div v-else-if="state === 'denied'" class="status" :style="photoArea" role="alert">
              <span class="status__icon" aria-hidden="true">
                <Camera :size="26" :stroke-width="2" />
              </span>
              <p class="status__title">{{ t('framedCamera.deniedTitle') }}</p>
              <p class="status__body">{{ t('framedCamera.deniedBody') }}</p>
              <button type="button" class="pill pill--primary" @click="emit('gallery')">
                <Images :size="18" :stroke-width="2.25" />
                {{ t('shareCard.addPhoto.gallery') }}
              </button>
              <button type="button" class="pill" @click="start">
                {{ t('framedCamera.tryAgain') }}
              </button>
            </div>

            <div v-if="flashing" class="flash" :style="photoArea" aria-hidden="true" />
          </div>
        </div>

        <p class="camera__hint">
          {{ t(state === 'captured' ? 'framedCamera.reviewHint' : 'framedCamera.hint') }}
        </p>

        <footer class="camera__bar">
          <template v-if="state === 'captured'">
            <button type="button" class="pill pill--wide" @click="retake">
              <RotateCcw :size="18" :stroke-width="2.25" />
              {{ t('framedCamera.retake') }}
            </button>
            <button
              type="button"
              ref="useButton"
              class="pill pill--wide pill--primary"
              @click="usePhoto"
            >
              <Check :size="18" :stroke-width="2.5" />
              {{ t('framedCamera.use') }}
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              class="round round--big"
              :aria-label="t('framedCamera.gallery')"
              @click="emit('gallery')"
            >
              <Images :size="24" :stroke-width="2" />
            </button>
            <button
              ref="shutter"
              type="button"
              class="shutter"
              :aria-label="t('framedCamera.shutter')"
              :disabled="state !== 'live'"
              @click="shoot"
            >
              <span class="shutter__core" />
            </button>
            <button
              v-if="canFlip"
              type="button"
              class="round round--big"
              :aria-label="t('framedCamera.flip')"
              :disabled="state !== 'live'"
              @click="flip"
            >
              <SwitchCamera :size="24" :stroke-width="2" />
            </button>
            <span v-else class="round round--big round--ghost" aria-hidden="true" />
          </template>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Always dark, whatever the app's theme: a camera reads on black, and so does the card. */
.camera {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  color: #f4f4f5;
  background: #000;
}

.camera__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
}

/* Takes what is left between the bars; the card is fitted into it whole. */
.camera__room {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  margin: 0 var(--space-4);
}

.stage {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.stage__video {
  position: absolute;
  object-fit: cover;
  background: #18191c;
}

.stage__video--mirrored {
  transform: scaleX(-1);
}

.stage__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.status {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  text-align: center;
  font-size: var(--text-small);
  color: rgba(244, 244, 245, 0.8);
}

.status__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.status__title {
  margin: 0;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: #f4f4f5;
}

.status__body {
  margin: 0 0 var(--space-2);
  max-width: 260px;
  line-height: 1.35;
}

.status__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #f4f4f5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* The shutter's flash, on the photo only. */
.flash {
  position: absolute;
  background: #fff;
  pointer-events: none;
  animation: flash 0.22s ease-out forwards;
}

@keyframes flash {
  from {
    opacity: 0.85;
  }
  to {
    opacity: 0;
  }
}

.camera__hint {
  margin: var(--space-2) var(--space-4) 0;
  font-size: var(--text-small);
  line-height: 1.3;
  text-align: center;
  color: rgba(244, 244, 245, 0.66);
}

/* Thumb height: gallery, shutter in the middle, flip. */
.camera__bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-6);
}

.camera__bar:has(.pill--wide) {
  grid-template-columns: 1fr 1fr;
}

.round {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  padding: 0;
  border: none;
  border-radius: 50%;
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.14);
  cursor: pointer;
}

.round--big {
  width: 52px;
  height: 52px;
}

.round--ghost {
  background: none;
}

.round:disabled {
  opacity: 0.4;
}

.shutter {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  padding: 0;
  border: 4px solid #f4f4f5;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.shutter__core {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: #f4f4f5;
  transition: transform var(--motion-instant) ease;
}

.shutter:active .shutter__core {
  transform: scale(0.88);
}

.shutter:disabled {
  opacity: 0.4;
  cursor: default;
}

.shutter:focus-visible,
.round:focus-visible,
.pill:focus-visible,
.shape__option:focus-visible {
  outline: 2px solid #f4f4f5;
  outline-offset: 3px;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: var(--size-touch);
  padding: 0 var(--space-4);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  white-space: nowrap;
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.pill--wide {
  width: 100%;
  min-height: var(--size-control);
  font-size: var(--text-body);
}

.pill--primary {
  border-color: transparent;
  color: #0f1012;
  background: #f4f4f5;
}

.shape {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.12);
}

.shape__option {
  min-width: 48px;
  min-height: 36px;
  padding: 0 var(--space-2);
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: rgba(244, 244, 245, 0.72);
  background: transparent;
  cursor: pointer;
}

.shape__option[aria-checked='true'] {
  color: #0f1012;
  background: #f4f4f5;
}

.camera-enter-active,
.camera-leave-active {
  transition: opacity var(--motion-quick) ease;
}

.camera-enter-from,
.camera-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .flash {
    display: none;
  }

  .status__spinner {
    animation-duration: 2.4s;
  }

  .shutter__core {
    transition: none;
  }
}
</style>
