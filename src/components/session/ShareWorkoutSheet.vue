<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImagePlus, Share2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import {
  paintWorkoutCard,
  renderWorkoutCard,
  type WorkoutCardData,
  type WorkoutCardStyle,
} from '@/lib/workoutCard'
import { saveFile, shareImage } from '@/services/nativeShare'
import { track } from '@/services/analytics'
import { HapticsService } from '@/services/haptics'

/**
 * Sharing a finished workout as an image. What is on screen here is exactly
 * what leaves the phone: the preview is drawn by the same code as the file,
 * and nothing is shared until the button is pressed.
 */
const props = defineProps<{
  open: boolean
  data: WorkoutCardData | null
  /** Sent along with the image where the receiving app accepts text. */
  caption: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const STYLES: WorkoutCardStyle[] = ['card', 'photo', 'sticker']
const style = ref<WorkoutCardStyle>('card')

/** The user's own photo, held in memory for this sheet only: never stored, never uploaded. */
const photo = ref<HTMLImageElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const busy = ref(false)

async function paint() {
  await nextTick()
  if (!props.open || !props.data || !canvas.value) return
  paintWorkoutCard(canvas.value, props.data, style.value, photo.value ?? undefined)
}

watch(() => [props.open, props.data, style.value, photo.value], paint, { immediate: true })

function pick(next: WorkoutCardStyle) {
  style.value = next
  void HapticsService.selection()
}

function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Cleared, so choosing the same photo again still fires a change.
  input.value = ''
  if (!file) return
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    photo.value = image
  }
  image.onerror = () => URL.revokeObjectURL(url)
  image.src = url
}

async function share() {
  if (!props.data || busy.value) return
  busy.value = true
  try {
    const { bytes, mimeType, extension } = await renderWorkoutCard(
      props.data,
      style.value,
      photo.value ?? undefined,
    )
    const filename = `wtx-workout.${extension}`
    // Where the browser can't share a file, the image is saved instead.
    if (await shareImage(bytes, filename, mimeType, props.caption)) track('workout_card_shared')
    else await saveFile(bytes, filename, mimeType)
  } catch (err) {
    console.error('[share] workout card failed', err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="t('shareCard.title')" @close="emit('close')">
    <div class="preview" :class="`preview--${style}`">
      <canvas ref="canvas" class="preview__image" role="img" :aria-label="t('shareCard.previewAria')" />
    </div>

    <div class="styles" role="radiogroup" :aria-label="t('shareCard.styleAria')">
      <button
        v-for="option in STYLES"
        :key="option"
        type="button"
        class="styles__option"
        role="radio"
        :aria-checked="style === option"
        @click="pick(option)"
      >
        {{ t(`shareCard.style.${option}`) }}
      </button>
    </div>

    <p class="hint">{{ t(`shareCard.hint.${style}`) }}</p>

    <template v-if="style === 'photo'">
      <input
        ref="photoInput"
        class="file"
        type="file"
        accept="image/*"
        tabindex="-1"
        aria-hidden="true"
        @change="onPhotoPicked"
      />
      <AppButton block @click="photoInput?.click()">
        <ImagePlus :size="18" :stroke-width="2.25" />
        {{ photo ? t('shareCard.changePhoto') : t('shareCard.choosePhoto') }}
      </AppButton>
    </template>

    <AppButton
      variant="primary"
      size="lg"
      block
      :disabled="busy || !data || (style === 'photo' && !photo)"
      @click="share"
    >
      <Share2 :size="18" :stroke-width="2.25" />
      {{ t('finish.share') }}
    </AppButton>
  </BottomSheet>
</template>

<style scoped>
/* The image, as it will be shared, is the one thing on the sheet. */
.preview {
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

/* A sticker has no background: a checkerboard says so. */
.preview--sticker {
  min-height: min(44dvh, 420px);
  background:
    repeating-conic-gradient(var(--color-background-mute) 0% 25%, var(--color-background-soft) 0% 50%)
    50% / 24px 24px;
}

.preview--sticker .preview__image {
  width: 86%;
  height: auto;
  border-radius: 0;
}

.styles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
}

.styles__option {
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

.styles__option[aria-checked='true'] {
  color: var(--color-heading);
  background: var(--color-background);
}

.hint {
  font-size: var(--text-small);
  text-align: center;
}

.file {
  display: none;
}
</style>
