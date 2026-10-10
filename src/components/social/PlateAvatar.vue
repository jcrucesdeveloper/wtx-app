<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { PLATE_COLORS, type PlateStep } from '@/lib/plateLevel'

/**
 * An avatar wearing its plate: the plate is the ring, the person is the hub.
 * One ring per plate on the bar, so the stacked red plates read as more rings.
 * With no plate yet it is just the avatar.
 */
const props = withDefaults(
  defineProps<{
    id: string
    name: string
    size?: number
    step: PlateStep | null
  }>(),
  { size: 72 },
)

const ring = computed(() => {
  const step = props.step
  if (!step) return { pad: 0, shadow: 'none' }

  const color = PLATE_COLORS[step.kg].fill
  // More plates, thinner rings, so even five stay a frame and not a target.
  const width = step.count === 1 ? 5 : step.count === 2 ? 3.5 : 2.5
  const gap = 1.5
  const page = 'var(--color-background)'

  let spread = 3
  const layers = [`0 0 0 ${spread}px ${page}`]
  for (let i = 0; i < step.count; i++) {
    if (i > 0) {
      spread += gap
      layers.push(`0 0 0 ${spread}px ${page}`)
    }
    spread += width
    layers.push(`0 0 0 ${spread}px ${color}`)
  }
  // A hairline edge, so the white plate still shows on a light page.
  spread += 1
  layers.push(`0 0 0 ${spread}px var(--color-border-hover)`)

  return { pad: spread, shadow: layers.join(', ') }
})
</script>

<template>
  <span class="plate-avatar" :style="{ padding: `${ring.pad}px` }">
    <span class="plate-avatar__ring" :style="{ boxShadow: ring.shadow }">
      <UserAvatar :id="id" :name="name" :size="size" />
    </span>
  </span>
</template>

<style scoped>
.plate-avatar {
  display: inline-flex;
  flex-shrink: 0;
}

.plate-avatar__ring {
  display: inline-flex;
  border-radius: 50%;
}
</style>
