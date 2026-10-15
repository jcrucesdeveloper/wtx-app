<script setup lang="ts">
import { nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImagePlus, Share2 } from '@lucide/vue'
import ShareWorkoutSheet from './ShareWorkoutSheet.vue'
import {
  paintWorkoutCard,
  type WorkoutCardData,
  type WorkoutCardFormat,
  type WorkoutCardStyle,
} from '@/lib/workoutCard'

/**
 * Sharing, offered on the finish screen itself: a small copy of the card that
 * will be shared, and the two ways in — add a photo, or share it as it is.
 * Both open the share sheet, where the image is previewed before anything
 * leaves the phone. It owns what the sheet is set to, so a photo picked once
 * is still there the next time the sheet opens.
 */
const props = defineProps<{
  data: WorkoutCardData | null
  caption: string
}>()

const { t } = useI18n()

const sheetOpen = ref(false)
const style = ref<WorkoutCardStyle>('card')
const format = ref<WorkoutCardFormat>('story')
// Not deep-reactive: it's an image element, only ever swapped whole.
const photo = shallowRef<HTMLImageElement | null>(null)

const thumb = ref<HTMLCanvasElement | null>(null)

/** The thumbnail is the story card, or the photo card once there is a photo. */
async function paintThumb() {
  await nextTick()
  if (!props.data || !thumb.value) return
  const withPhoto = !!photo.value
  paintWorkoutCard(thumb.value, props.data, withPhoto ? 'photo' : 'card', photo.value ?? undefined)
}

watch(() => [props.data, photo.value], paintThumb, { immediate: true })

/** Opens the sheet; with `'photo'`, straight to choosing a photo. */
function open(start?: WorkoutCardStyle) {
  if (start) style.value = start
  sheetOpen.value = true
}

defineExpose({ open })
</script>

<template>
  <section v-if="data" class="prompt">
    <button
      type="button"
      class="prompt__thumb"
      :aria-label="t('finishShare.previewAria')"
      @click="open()"
    >
      <canvas ref="thumb" />
    </button>
    <div class="prompt__body">
      <h2 class="prompt__title">{{ t('finishShare.promptTitle') }}</h2>
      <p class="prompt__text">{{ t('finishShare.promptBody') }}</p>
      <div class="prompt__actions">
        <button type="button" class="prompt__btn" @click="open('photo')">
          <ImagePlus :size="16" :stroke-width="2.25" />
          {{ t('finishShare.addPhoto') }}
        </button>
        <!-- Not accent-filled: "Done" below is the screen's one primary action. -->
        <button type="button" class="prompt__btn" @click="open()">
          <Share2 :size="16" :stroke-width="2.25" />
          {{ t('finishShare.share') }}
        </button>
      </div>
    </div>
  </section>

  <ShareWorkoutSheet
    v-model:style="style"
    v-model:format="format"
    v-model:photo="photo"
    :open="sheetOpen"
    :data="data"
    :caption="caption"
    @close="sheetOpen = false"
  />
</template>

<style scoped>
.prompt {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3);
  border-radius: var(--radius-xl);
  background: var(--color-background-soft);
}

/* The card itself, small: what is shared is what is shown. */
.prompt__thumb {
  flex-shrink: 0;
  width: 72px;
  aspect-ratio: 9 / 16;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #0f1012;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}

.prompt__thumb canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.prompt__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.prompt__title {
  margin: 0;
  font-size: var(--text-body);
  font-weight: var(--weight-heavy);
  color: var(--color-heading);
}

.prompt__text {
  margin: 0;
  font-size: var(--text-small);
  line-height: 1.35;
}

.prompt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.prompt__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background);
  cursor: pointer;
}

.prompt__btn:active,
.prompt__thumb:active {
  transform: scale(0.97);
}
</style>
