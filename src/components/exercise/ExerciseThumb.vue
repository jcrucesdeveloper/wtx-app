<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dumbbell } from '@lucide/vue'
import { exerciseImageUrl } from '@/config/exerciseImages'
import { findCatalogEntryByName } from '@/lib/exercises/exerciseCatalog'

/**
 * A small, ephemeral exercise thumbnail for browsing (search results). Loads
 * straight from the CDN via a plain lazy `<img>` — deliberately NOT run
 * through the persistent on-device cache (see imageCache.ts), so idle
 * browsing never writes to storage. Renders nothing for exercises with no
 * catalog match or no upstream image.
 */
const props = defineProps<{ name: string }>()

const src = computed(() => {
  const entry = findCatalogEntryByName(props.name)
  return entry ? exerciseImageUrl(entry.id, 0) : undefined
})

const failed = ref(false)
watch(src, () => {
  failed.value = false
})
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    loading="lazy"
    decoding="async"
    alt=""
    class="thumb"
    @error="failed = true"
  />
  <div v-else class="thumb thumb--empty" aria-hidden="true">
    <Dumbbell :size="16" :stroke-width="1.75" />
  </div>
</template>

<style scoped>
.thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  object-fit: cover;
  background: var(--color-background-mute);
  flex-shrink: 0;
}

.thumb--empty {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-background-mute));
  color: var(--color-accent);
  opacity: 0.75;
}
</style>
