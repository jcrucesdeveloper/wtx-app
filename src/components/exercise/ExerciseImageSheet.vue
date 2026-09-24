<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImageOff } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { findCatalogEntryByName } from '@/lib/exercises/exerciseCatalog'
import { getCachedImageObjectUrl } from '@/lib/exercises/imageCache'

/**
 * Shows an exercise's start/finish images, cache-first (see imageCache.ts).
 * If the exercise is already part of a routine/session, both frames are
 * typically already warmed on-device, so this opens instantly and works
 * offline; otherwise it fetches (and opportunistically caches) them live.
 */
const props = defineProps<{
  open: boolean
  name: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const frame = ref<0 | 1>(0)
const urls = ref<[string | undefined, string | undefined]>([undefined, undefined])
const loading = ref(false)
const hasImage = ref(true)

function revoke() {
  for (const url of urls.value) {
    if (url) URL.revokeObjectURL(url)
  }
  urls.value = [undefined, undefined]
}

watch(
  () => [props.open, props.name] as const,
  async ([open, name], _prev, onCleanup) => {
    if (!open) {
      revoke()
      frame.value = 0
      return
    }

    const entry = findCatalogEntryByName(name)
    if (!entry) {
      hasImage.value = false
      loading.value = false
      return
    }

    loading.value = true
    hasImage.value = true
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    const [start, finish] = await Promise.all([
      getCachedImageObjectUrl(entry.id, 0),
      getCachedImageObjectUrl(entry.id, 1),
    ])

    if (cancelled) {
      if (start) URL.revokeObjectURL(start)
      if (finish) URL.revokeObjectURL(finish)
      return
    }

    urls.value = [start, finish]
    hasImage.value = Boolean(start)
    loading.value = false
  },
  { immediate: true },
)

onBeforeUnmount(revoke)
</script>

<template>
  <BottomSheet :open="open" :title="name" @close="emit('close')">
    <div class="body">
      <div v-if="loading" class="state">…</div>
      <template v-else-if="hasImage">
        <img :src="urls[frame]" class="image" :alt="name" />
        <div v-if="urls[1]" class="toggle" role="group">
          <button type="button" class="toggle__btn" :class="{ 'toggle__btn--active': frame === 0 }" @click="frame = 0">
            {{ t('exerciseImage.start') }}
          </button>
          <button type="button" class="toggle__btn" :class="{ 'toggle__btn--active': frame === 1 }" @click="frame = 1">
            {{ t('exerciseImage.finish') }}
          </button>
        </div>
      </template>
      <div v-else class="placeholder">
        <ImageOff :size="28" :stroke-width="1.5" />
        <span>{{ t('exerciseImage.noImage') }}</span>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.state {
  padding: 32px 0;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 14px;
}

.placeholder {
  width: 100%;
  aspect-ratio: 3 / 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.5;
  font-size: 13px;
}

.image {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
}

.toggle {
  display: flex;
  gap: 6px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.toggle__btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: calc(var(--radius-md) - 3px);
  border: none;
  background: transparent;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.toggle__btn--active {
  opacity: 1;
  background: var(--color-background);
  color: var(--color-heading);
}
</style>
