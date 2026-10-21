<script setup lang="ts">
import { nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Share2 } from '@lucide/vue'
import ShareWorkoutSheet from './ShareWorkoutSheet.vue'
import { HapticsService } from '@/services/haptics'
import {
  paintWorkoutCard,
  type WorkoutCardData,
  type WorkoutCardFormat,
  type WorkoutCardStyle,
} from '@/lib/workoutCard'

/**
 * Sharing, offered on the finish screen itself: a small copy of the card that
 * will be shared, and the whole thing is one tap into the share sheet, where
 * the image is previewed (and a photo added) before anything leaves the phone.
 * It owns what the sheet is set to, so a photo picked once is still there the
 * next time the sheet opens.
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

function open() {
  sheetOpen.value = true
}

function onTap() {
  void HapticsService.selection()
  open()
}

defineExpose({ open })
</script>

<template>
  <button v-if="data" type="button" class="prompt" @click="onTap">
    <!-- The card itself, small: what is shared is what is shown. -->
    <span class="prompt__thumb" aria-hidden="true"><canvas ref="thumb" /></span>
    <span class="prompt__body">
      <span class="prompt__title">{{ t('finishShare.promptTitle') }}</span>
      <span class="prompt__text">{{ t('finishShare.promptBody') }}</span>
    </span>
    <span class="prompt__go" aria-hidden="true">
      <Share2 :size="20" :stroke-width="2.25" />
    </span>
  </button>

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
/* One tappable card. Not accent-filled: "Done" is the screen's one primary action. */
.prompt {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  width: 100%;
  padding: var(--space-3);
  padding-right: var(--space-4);
  border: none;
  border-radius: var(--radius-xl);
  font: inherit;
  text-align: left;
  color: inherit;
  background: var(--color-background-soft);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--motion-quick) var(--ease-out),
    background-color var(--motion-quick) var(--ease-out);
}

.prompt:active {
  transform: scale(0.98);
  background: var(--color-background-mute);
}

.prompt:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.prompt__thumb {
  flex-shrink: 0;
  width: 56px;
  aspect-ratio: 9 / 16;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #0f1012;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.prompt__thumb canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.prompt__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.prompt__title {
  font-size: var(--text-body);
  font-weight: var(--weight-heavy);
  color: var(--color-heading);
}

.prompt__text {
  font-size: var(--text-small);
  line-height: 1.35;
}

.prompt__go {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-heading);
  background: var(--color-background);
}
</style>
