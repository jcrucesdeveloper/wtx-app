<script setup lang="ts">
import { computed } from 'vue'
import { colorForId, initials } from '@/lib/memberColors'

const props = withDefaults(
  defineProps<{
    /** Account id — picks the color, so a person looks the same everywhere. */
    id: string
    name: string
    size?: number
  }>(),
  { size: 40 },
)

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.36)}px`,
  background: colorForId(props.id),
}))
</script>

<template>
  <span class="avatar" :style="style" aria-hidden="true">{{ initials(name) || '?' }}</span>
</template>

<style scoped>
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  line-height: 1;
  user-select: none;
}
</style>
