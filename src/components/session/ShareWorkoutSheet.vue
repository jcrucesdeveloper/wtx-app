<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Camera, Download, Images, LayoutList, Share2, Sticker, X } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import FramedCamera from '@/components/session/FramedCamera.vue'
import {
  paintWorkoutCard,
  renderWorkoutCard,
  TOP_LIFTS,
  type WorkoutCardData,
  type WorkoutCardFormat,
  type WorkoutCardStyle,
} from '@/lib/workoutCard'
import {
  shareDestinations,
  stickerStoryColors,
  type InstalledTargets,
  type ShareDestination,
} from '@/lib/shareDestinations'
import {
  canShareFiles,
  imageSaveRoute,
  saveFile,
  saveImage,
  shareImage,
  timestampedName,
} from '@/services/nativeShare'
import { installedTargets, sharePlatform, shareToTarget } from '@/services/shareTargets'
import { canTakePhoto, pickPhoto, type PhotoSource } from '@/services/photoPicker'
import { canStreamCamera, hasVideoInput } from '@/services/liveCamera'
import { photoAreaPercent } from '@/lib/cameraFrame'
import { publicRouteUrl } from '@/lib/publicUrl'
import { track } from '@/services/analytics'
import { HapticsService } from '@/services/haptics'

/**
 * Sharing a finished workout as an image, built for the fewest taps from
 * "finish" to a posted story: the image first, large; the three looks one tap
 * away; then a row of destinations — Instagram and WhatsApp straight into the
 * app where the phone has them, the gallery, and the system sheet for the
 * rest. What is on screen is exactly what leaves the phone: the preview is
 * drawn by the same code as the file, and nothing is shared or saved until a
 * destination is tapped.
 */
const props = defineProps<{
  open: boolean
  data: WorkoutCardData | null
  /** Sent along with the image where the receiving app accepts text. */
  caption: string
}>()

const emit = defineEmits<{ close: [] }>()

/** Owned by the parent, so a photo or a choice survives closing the sheet. */
const style = defineModel<WorkoutCardStyle>('style', { default: 'card' })
const format = defineModel<WorkoutCardFormat>('format', { default: 'story' })
/** The user's own photo, held in memory only: never stored, never uploaded. */
const photo = defineModel<HTMLImageElement | null>('photo', { default: null })

const { t } = useI18n()

const STYLES: { id: WorkoutCardStyle; icon: typeof LayoutList }[] = [
  { id: 'card', icon: LayoutList },
  { id: 'photo', icon: Camera },
  { id: 'sticker', icon: Sticker },
]
const FORMATS: WorkoutCardFormat[] = ['story', 'square']
const saveRoute = imageSaveRoute()
const offerCamera = ref(canTakePhoto())
// A computer with a webcam gets the framed camera too; a file input's
// `capture` does nothing there, so it is only offered when one is listed.
onMounted(async () => {
  if (!offerCamera.value && (await hasVideoInput())) offerCamera.value = true
})
/** The in-app camera with the card's frame over it. */
const cameraOpen = ref(false)
const platform = sharePlatform()

const installed = ref<InstalledTargets>({ instagram: false, whatsapp: false })
const destinations = computed(() =>
  shareDestinations({ platform, installed: installed.value, canShareFiles: canShareFiles() }),
)

const canvas = ref<HTMLCanvasElement | null>(null)
const busy = ref<ShareDestination | null>(null)
/** One line under the buttons: what a save did, what to do next, or why something failed. */
const notice = ref('')

const needsPhoto = computed(() => style.value === 'photo' && !photo.value)

/**
 * Where the photo sits on the preview, in percent of the image: the buttons to
 * add or change it are laid over exactly that space, so it is plain what they
 * act on.
 */
const photoArea = computed(() => (props.data ? photoAreaPercent(props.data, format.value) : {}))
const blocked = computed(() => !!busy.value || !props.data || needsPhoto.value)

/** Every lift instead of the top few: only the Lifts look lists them. */
const allLifts = ref(false)
const offerAllLifts = computed(
  () => style.value === 'card' && (props.data?.lifts.length ?? 0) > TOP_LIFTS,
)
/** What is drawn and shared: the card as the parent built it, with the lift choice. */
const shown = computed(() => (props.data ? { ...props.data, allLifts: allLifts.value } : null))

function pickLifts(all: boolean) {
  allLifts.value = all
  void HapticsService.selection()
}

async function paint() {
  await nextTick()
  if (!props.open || !shown.value || !canvas.value) return
  paintWorkoutCard(canvas.value, shown.value, style.value, photo.value ?? undefined, format.value)
}

watch(() => [props.open, shown.value, style.value, format.value, photo.value], paint, {
  immediate: true,
})
watch(
  () => props.open,
  async (open) => {
    notice.value = ''
    if (!open) return
    track('share_sheet_opened')
    // Asked each time: an app may have been installed since.
    installed.value = await installedTargets()
  },
  { immediate: true },
)

function pick(next: WorkoutCardStyle) {
  notice.value = ''
  void HapticsService.selection()
  // The photo look without a photo shows where the photo goes, with the camera
  // and the gallery right there: opening one straight away hid the other.
  style.value = next
}

function pickFormat(next: WorkoutCardFormat) {
  format.value = next
  void HapticsService.selection()
}

// Not `busy`: a browser can leave a dismissed file picker unanswered, and that
// must not lock the sheet. The camera and the picker cover the app anyway.
async function choosePhoto(source: PhotoSource) {
  notice.value = ''
  // The camera is framed in the app where it can be: the system camera can't
  // show the card over its viewfinder, so it is the fallback.
  if (source === 'camera' && canStreamCamera()) {
    cameraOpen.value = true
    return
  }
  return systemPhoto(source)
}

async function systemPhoto(source: PhotoSource) {
  try {
    const image = await pickPhoto(source)
    if (image) {
      photo.value = image
      style.value = 'photo'
    }
  } catch (err) {
    console.error('[share] photo failed', err)
    notice.value = t(source === 'camera' ? 'finishShare.cameraFailed' : 'finishShare.photoFailed')
  }
}

function usePhoto(image: HTMLImageElement) {
  cameraOpen.value = false
  photo.value = image
  style.value = 'photo'
}

function cameraToGallery() {
  cameraOpen.value = false
  void systemPhoto('gallery')
}

/** The in-app camera couldn't start (no camera, busy, or no stream): the system camera instead. */
function cameraUnavailable() {
  cameraOpen.value = false
  void systemPhoto('camera')
}

function removePhoto() {
  photo.value = null
  style.value = 'card'
}

const render = () =>
  renderWorkoutCard(shown.value!, style.value, photo.value ?? undefined, format.value)

/** Runs one destination with the sheet locked, and a notice if the image can't be made. */
async function run(destination: ShareDestination, action: () => Promise<void>) {
  if (blocked.value) return
  busy.value = destination
  notice.value = ''
  try {
    await action()
  } catch (err) {
    console.error(`[share] ${destination} failed`, err)
    notice.value = t('finishShare.imageFailed')
  } finally {
    busy.value = null
  }
}

/** The system share sheet; where the browser can't share a file, a download. */
async function shareMore(image?: Awaited<ReturnType<typeof render>>) {
  const { bytes, mimeType, extension } = image ?? (await render())
  const filename = `wtx-workout.${extension}`
  const outcome = await shareImage(bytes, filename, mimeType, props.caption)
  if (outcome === 'shared') track('workout_card_shared')
  else if (outcome === 'unsupported') await saveFile(bytes, filename, mimeType)
}

async function shareInstagram() {
  const image = await render()
  // A story can't carry text, so the link is copied for Instagram's link
  // sticker — the one tap-through a story has.
  const link = publicRouteUrl('/?src=share-ig')
  const route = await shareToTarget('instagram', image, {
    clipboard: link,
    sticker: style.value === 'sticker',
    colors: props.data ? stickerStoryColors(props.data.accent) : undefined,
  })
  if (!route) return shareMore(image)
  track('workout_card_shared_instagram')
  notice.value = t('shareCard.linkCopied')
}

async function shareWhatsApp() {
  const image = await render()
  const route = await shareToTarget('whatsapp', image, { text: props.caption })
  if (!route) return shareMore(image)
  track('workout_card_shared_whatsapp')
}

async function save() {
  const { bytes, mimeType, extension } = await render()
  const where = await saveImage(bytes, timestampedName('wtx-workout', extension), mimeType)
  track('workout_card_saved')
  if (where !== 'share-sheet') {
    notice.value = t(`finishShare.saved.${where}`)
    void HapticsService.success()
  }
}

function go(destination: ShareDestination) {
  void HapticsService.selection()
  const action = {
    instagram: shareInstagram,
    whatsapp: shareWhatsApp,
    save,
    more: () => shareMore(),
  }[destination]
  void run(destination, action)
}

/** The label under each destination; "save" and "more" read differently per platform. */
function label(destination: ShareDestination): string {
  if (destination === 'save') return t(`shareCard.destination.save.${saveRoute}`)
  if (destination === 'more') return t(`shareCard.destination.more.${platform}`)
  return t(`shareCard.destination.${destination}`)
}
</script>

<template>
  <BottomSheet :open="open" :title="t('shareCard.title')" @close="emit('close')">
    <div class="preview" :class="[`preview--${style}`, `preview--${format}`]">
      <div class="stage">
        <canvas
          ref="canvas"
          class="preview__image"
          role="img"
          :aria-label="t('shareCard.previewAria')"
        />

        <!-- No photo yet: the space it will fill asks for one, camera first. -->
        <div v-if="needsPhoto" class="photo-slot photo-slot--empty" :style="photoArea">
          <span class="photo-slot__icon" aria-hidden="true">
            <Camera :size="26" :stroke-width="2" />
          </span>
          <p class="photo-slot__ask">{{ t('shareCard.addPhoto.title') }}</p>
          <p class="photo-slot__why">{{ t('shareCard.addPhoto.body') }}</p>
          <div class="photo-slot__actions">
            <button
              v-if="offerCamera"
              type="button"
              class="pick-btn pick-btn--primary"
              @click="choosePhoto('camera')"
            >
              <Camera :size="18" :stroke-width="2.25" />
              {{ t('shareCard.addPhoto.camera') }}
            </button>
            <button
              type="button"
              class="pick-btn"
              :class="{ 'pick-btn--primary': !offerCamera }"
              @click="choosePhoto('gallery')"
            >
              <Images :size="18" :stroke-width="2.25" />
              {{ t('shareCard.addPhoto.gallery') }}
            </button>
          </div>
        </div>

        <!-- With a photo in: change it, retake it, or take it off, on the photo itself. -->
        <div v-else-if="style === 'photo' && photo" class="photo-slot" :style="photoArea">
          <div class="photo-tools">
            <button
              type="button"
              class="tool tool--label"
              :disabled="!!busy"
              @click="choosePhoto('gallery')"
            >
              <Images :size="16" :stroke-width="2.25" />
              {{ t('shareCard.changePhoto') }}
            </button>
            <button
              v-if="offerCamera"
              type="button"
              class="tool"
              :aria-label="t('shareCard.retakePhoto')"
              :disabled="!!busy"
              @click="choosePhoto('camera')"
            >
              <Camera :size="18" :stroke-width="2.25" />
            </button>
            <button
              type="button"
              class="tool"
              :aria-label="t('finishShare.removePhoto')"
              :disabled="!!busy"
              @click="removePhoto"
            >
              <X :size="18" :stroke-width="2.25" />
            </button>
          </div>
        </div>
      </div>

      <!-- The shape, on the image it changes. A sticker is sized to what is on it. -->
      <div
        v-if="style !== 'sticker'"
        class="shape"
        role="radiogroup"
        :aria-label="t('finishShare.formatAria')"
      >
        <button
          v-for="option in FORMATS"
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

      <!-- How many lifts, on the image it changes: a summary by default. -->
      <div
        v-if="offerAllLifts"
        class="shape shape--lifts"
        role="radiogroup"
        :aria-label="t('shareCard.lifts.aria')"
      >
        <button
          type="button"
          class="shape__option"
          role="radio"
          :aria-checked="!allLifts"
          @click="pickLifts(false)"
        >
          {{ t('shareCard.lifts.top') }}
        </button>
        <button
          type="button"
          class="shape__option"
          role="radio"
          :aria-checked="allLifts"
          @click="pickLifts(true)"
        >
          {{ t('shareCard.lifts.all', { count: data?.lifts.length ?? 0 }) }}
        </button>
      </div>
    </div>

    <div class="looks" role="radiogroup" :aria-label="t('shareCard.styleAria')">
      <button
        v-for="option in STYLES"
        :key="option.id"
        type="button"
        class="look"
        role="radio"
        :aria-checked="style === option.id"
        @click="pick(option.id)"
      >
        <component :is="option.icon" :size="18" :stroke-width="2.25" />
        {{ t(`shareCard.style.${option.id}`) }}
      </button>
    </div>

    <p class="hint">{{ t(`shareCard.hint.${style}`) }}</p>

    <div
      class="targets"
      :style="{ '--count': destinations.length }"
      role="group"
      :aria-label="t('shareCard.destinationsAria')"
    >
      <button
        v-for="destination in destinations"
        :key="destination"
        type="button"
        class="target"
        :class="[`target--${destination}`, { 'target--busy': busy === destination }]"
        :disabled="blocked"
        @click="go(destination)"
      >
        <span class="target__icon" aria-hidden="true">
          <svg
            v-if="destination === 'instagram'"
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="5.5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
          </svg>
          <svg
            v-else-if="destination === 'whatsapp'"
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          >
            <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
            <path
              d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-.6.3-1.5.4-2.6 0a8 8 0 0 1-4.5-4.5c-.4-1.1-.3-2 0-2.6z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
          <Download v-else-if="destination === 'save'" :size="24" :stroke-width="2.25" />
          <Share2 v-else :size="24" :stroke-width="2.25" />
        </span>
        <span class="target__label">{{ label(destination) }}</span>
      </button>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-else-if="saveRoute === 'share-sheet'" class="notice">{{ t('finishShare.saveHint') }}</p>
  </BottomSheet>

  <FramedCamera
    v-model:format="format"
    :open="open && cameraOpen"
    :data="shown"
    @close="cameraOpen = false"
    @photo="usePhoto"
    @gallery="cameraToGallery"
    @unavailable="cameraUnavailable"
  />
</template>

<style scoped>
/* The image, as it will be shared, is the biggest thing on the sheet. */
.preview {
  position: relative;
  display: grid;
  place-items: center;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.preview__image {
  display: block;
  width: auto;
  max-width: 100%;
  height: min(46dvh, 440px);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
}

/* A square keeps to about the same area as the story. */
.preview--square .preview__image {
  height: min(36dvh, 330px);
}

/* A sticker has no background: a checkerboard says so. */
.preview--sticker {
  min-height: min(46dvh, 440px);
  background: repeating-conic-gradient(
      var(--color-background-mute) 0% 25%,
      var(--color-background-soft) 0% 50%
    )
    50% / 24px 24px;
}

.preview--sticker .preview__image {
  width: 86%;
  height: auto;
  border-radius: 0;
  box-shadow: none;
}

/* The shape toggle: small, in the corner of the image it reshapes. */
.shape {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: rgba(15, 16, 18, 0.72);
  backdrop-filter: blur(6px);
}

.shape--lifts {
  right: auto;
  left: var(--space-3);
}

.shape__option {
  min-width: 44px;
  min-height: 32px;
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

.stage {
  position: relative;
  display: flex;
  justify-content: center;
  max-width: 100%;
}

.preview--sticker .stage {
  width: 100%;
}

/* Laid over exactly where the photo is (or will be) on the image. */
.photo-slot {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: var(--space-2);
  border-radius: 6px;
}

.photo-slot--empty {
  justify-content: center;
  gap: 4px;
  text-align: center;
  /* Always over the dark frame, in either theme. */
  color: #f4f4f5;
  border: 2px dashed rgba(255, 255, 255, 0.34);
}

.photo-slot__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 2px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.photo-slot__ask {
  margin: 0;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  line-height: 1.2;
}

.photo-slot__why {
  margin: 0 0 var(--space-1);
  font-size: var(--text-small);
  line-height: 1.3;
  color: rgba(244, 244, 245, 0.72);
}

/* A square leaves a short slot: the buttons say enough on their own. */
.preview--square .photo-slot__why {
  display: none;
}

.photo-slot__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  width: min(100%, 200px);
}

.preview--square .photo-slot__actions {
  flex-direction: row;
  width: auto;
}

.pick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: var(--size-touch);
  padding: 0 var(--space-3);
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

.pick-btn--primary {
  border-color: transparent;
  color: #0f1012;
  background: #f4f4f5;
}

.pick-btn:active,
.tool:active,
.target:active:not(:disabled) .target__icon {
  transform: scale(0.95);
}

/* At the foot of the photo: the shape toggle has the top corner. */
.photo-tools {
  display: flex;
  gap: var(--space-1);
}

.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  white-space: nowrap;
  color: #f4f4f5;
  background: rgba(15, 16, 18, 0.72);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.tool--label {
  width: auto;
  padding: 0 var(--space-3);
  color: #0f1012;
  background: rgba(244, 244, 245, 0.92);
}

.tool:disabled {
  opacity: 0.5;
}

.looks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
}

.look {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: var(--size-touch);
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.look[aria-checked='true'] {
  color: var(--color-heading);
  background: var(--color-background);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.hint {
  margin: 0;
  font-size: var(--text-small);
  line-height: 1.35;
  text-align: center;
}

/* One tap each: the apps first, then the gallery and everything else. */
.targets {
  display: grid;
  grid-template-columns: repeat(var(--count), minmax(0, 76px));
  justify-content: center;
  gap: var(--space-3);
}

.target {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0;
  border: none;
  font: inherit;
  color: var(--color-heading);
  background: none;
  cursor: pointer;
}

.target:disabled {
  cursor: default;
  opacity: 0.45;
}

.target--busy:disabled {
  opacity: 1;
}

.target--busy .target__icon {
  animation: pulse 0.9s ease-in-out infinite alternate;
}

@keyframes pulse {
  to {
    opacity: 0.55;
  }
}

.target__icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  color: var(--color-heading);
  background: var(--color-background-mute);
  transition: transform 0.12s ease;
}

/* The apps in their own colours: a familiar logo is found without reading. */
.target--instagram .target__icon {
  color: #fff;
  background: radial-gradient(
    circle at 30% 107%,
    #fdf497 0%,
    #fd5949 45%,
    #d6249f 60%,
    #285aeb 90%
  );
}

.target--whatsapp .target__icon {
  color: #fff;
  background: #25d366;
}

.target__label {
  max-width: 100%;
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  line-height: 1.2;
  text-align: center;
}

.notice {
  margin: 0;
  font-size: var(--text-small);
  text-align: center;
  color: var(--color-text);
}

@media (prefers-reduced-motion: reduce) {
  .target--busy .target__icon {
    animation: none;
  }
}
</style>
