<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Camera, Download, Images, Share2, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import {
  paintWorkoutCard,
  renderWorkoutCard,
  type WorkoutCardData,
  type WorkoutCardFormat,
  type WorkoutCardStyle,
} from '@/lib/workoutCard'
import {
  imageSaveRoute,
  saveFile,
  saveImage,
  shareImage,
  timestampedName,
} from '@/services/nativeShare'
import { canTakePhoto, pickPhoto, type PhotoSource } from '@/services/photoPicker'
import { track } from '@/services/analytics'
import { HapticsService } from '@/services/haptics'

/**
 * Sharing a finished workout as an image. What is on screen here is exactly
 * what leaves the phone: the preview is drawn by the same code as the file,
 * and nothing is shared or saved until a button is pressed.
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

const STYLES: WorkoutCardStyle[] = ['card', 'photo', 'sticker']
const FORMATS: WorkoutCardFormat[] = ['story', 'square']
const saveRoute = imageSaveRoute()
const offerCamera = canTakePhoto()

const canvas = ref<HTMLCanvasElement | null>(null)
const busy = ref<'share' | 'save' | null>(null)
/** One line under the buttons: what a save did, or why something failed. */
const notice = ref('')

async function paint() {
  await nextTick()
  if (!props.open || !props.data || !canvas.value) return
  paintWorkoutCard(canvas.value, props.data, style.value, photo.value ?? undefined, format.value)
}

watch(() => [props.open, props.data, style.value, format.value, photo.value], paint, {
  immediate: true,
})
watch(
  () => props.open,
  () => (notice.value = ''),
)

function pick(next: WorkoutCardStyle) {
  style.value = next
  notice.value = ''
  void HapticsService.selection()
}

function pickFormat(next: WorkoutCardFormat) {
  format.value = next
  void HapticsService.selection()
}

// Not `busy`: a browser can leave a dismissed file picker unanswered, and that
// must not lock the sheet. The camera and the picker cover the app anyway.
async function choosePhoto(source: PhotoSource) {
  notice.value = ''
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

function removePhoto() {
  photo.value = null
}

const render = () =>
  renderWorkoutCard(props.data!, style.value, photo.value ?? undefined, format.value)

async function share() {
  if (!props.data || busy.value) return
  busy.value = 'share'
  notice.value = ''
  try {
    const { bytes, mimeType, extension } = await render()
    const filename = `wtx-workout.${extension}`
    // Where the browser can't share a file, the image is saved instead.
    if (await shareImage(bytes, filename, mimeType, props.caption)) track('workout_card_shared')
    else await saveFile(bytes, filename, mimeType)
  } catch (err) {
    console.error('[share] workout card failed', err)
    notice.value = t('finishShare.imageFailed')
  } finally {
    busy.value = null
  }
}

async function save() {
  if (!props.data || busy.value) return
  busy.value = 'save'
  notice.value = ''
  try {
    const { bytes, mimeType, extension } = await render()
    const where = await saveImage(bytes, timestampedName('wtx-workout', extension), mimeType)
    if (where !== 'share-sheet') {
      notice.value = t(`finishShare.saved.${where}`)
      void HapticsService.success()
    }
  } catch (err) {
    console.error('[share] saving workout card failed', err)
    notice.value = t('finishShare.imageFailed')
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="t('shareCard.title')" @close="emit('close')">
    <div class="preview" :class="[`preview--${style}`, `preview--${format}`]">
      <canvas
        ref="canvas"
        class="preview__image"
        role="img"
        :aria-label="t('shareCard.previewAria')"
      />
      <!-- No photo yet: the choice sits on the empty part of the card itself. -->
      <div v-if="style === 'photo' && !photo" class="preview__pick">
        <p class="preview__ask">{{ t('finishShare.photoNeeded') }}</p>
        <button
          v-if="offerCamera"
          type="button"
          class="pick-btn"
          :disabled="!!busy"
          @click="choosePhoto('camera')"
        >
          <Camera :size="20" :stroke-width="2.25" />
          {{ t('finishShare.camera') }}
        </button>
        <button type="button" class="pick-btn" :disabled="!!busy" @click="choosePhoto('gallery')">
          <Images :size="20" :stroke-width="2.25" />
          {{ t('finishShare.gallery') }}
        </button>
      </div>
    </div>

    <div class="segmented" role="radiogroup" :aria-label="t('shareCard.styleAria')">
      <button
        v-for="option in STYLES"
        :key="option"
        type="button"
        class="segmented__option"
        role="radio"
        :aria-checked="style === option"
        @click="pick(option)"
      >
        {{ t(`shareCard.style.${option}`) }}
      </button>
    </div>

    <div
      v-if="style !== 'sticker'"
      class="segmented segmented--small"
      role="radiogroup"
      :aria-label="t('finishShare.formatAria')"
    >
      <button
        v-for="option in FORMATS"
        :key="option"
        type="button"
        class="segmented__option"
        role="radio"
        :aria-checked="format === option"
        @click="pickFormat(option)"
      >
        {{ t(`finishShare.format.${option}`) }}
      </button>
    </div>

    <p class="hint">{{ t(`shareCard.hint.${style}`) }}</p>

    <!-- With a photo in: change it from either source, or take it off. -->
    <div v-if="style === 'photo' && photo" class="photo-row">
      <AppButton v-if="offerCamera" size="sm" :disabled="!!busy" @click="choosePhoto('camera')">
        <Camera :size="16" :stroke-width="2.25" />
        {{ t('finishShare.camera') }}
      </AppButton>
      <AppButton size="sm" :disabled="!!busy" @click="choosePhoto('gallery')">
        <Images :size="16" :stroke-width="2.25" />
        {{ t('finishShare.gallery') }}
      </AppButton>
      <AppButton size="sm" variant="quiet" :disabled="!!busy" @click="removePhoto">
        <X :size="16" :stroke-width="2.25" />
        {{ t('finishShare.removePhoto') }}
      </AppButton>
    </div>

    <div class="actions">
      <AppButton
        size="lg"
        :disabled="!!busy || !data || (style === 'photo' && !photo)"
        @click="save"
      >
        <Download :size="18" :stroke-width="2.25" />
        {{ t(`finishShare.save.${saveRoute}`) }}
      </AppButton>
      <AppButton
        variant="primary"
        size="lg"
        :disabled="!!busy || !data || (style === 'photo' && !photo)"
        @click="share"
      >
        <Share2 :size="18" :stroke-width="2.25" />
        {{ t('finish.share') }}
      </AppButton>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-else-if="saveRoute === 'share-sheet'" class="notice">{{ t('finishShare.saveHint') }}</p>
  </BottomSheet>
</template>

<style scoped>
/* The image, as it will be shared, is the one thing on the sheet. */
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
  height: min(44dvh, 420px);
  border-radius: var(--radius-md);
}

/* A square is as wide as a story is tall would be too big: it keeps to the same area. */
.preview--square .preview__image {
  height: min(36dvh, 320px);
}

/* A sticker has no background: a checkerboard says so. */
.preview--sticker {
  min-height: min(44dvh, 420px);
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
}

/* Over the top of the card, where the photo will be: the card's own text stays visible below. */
.preview__pick {
  position: absolute;
  top: 18%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  width: min(70%, 220px);
  transform: translateX(-50%);
}

.preview--square .preview__pick {
  top: 12%;
}

.preview__ask {
  margin: 0 0 var(--space-1);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  text-align: center;
  /* Always over the dark card, in either theme. */
  color: #f4f4f5;
}

.pick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--size-touch);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.pick-btn:active {
  transform: scale(0.97);
}

.pick-btn:disabled {
  opacity: 0.5;
}

.segmented {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
}

.segmented__option {
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

.segmented--small .segmented__option {
  min-height: 36px;
  font-weight: var(--weight-medium);
}

.segmented__option[aria-checked='true'] {
  color: var(--color-heading);
  background: var(--color-background);
}

.hint {
  font-size: var(--text-small);
  text-align: center;
}

.photo-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
}

/* Save beside share, share the larger: sending it on is the usual next step. */
.actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--space-2);
}

.notice {
  font-size: var(--text-small);
  text-align: center;
  color: var(--color-text);
}
</style>
