<script setup lang="ts">
import { computed } from 'vue'
import { colorForId, initials } from '@/lib/memberColors'

const props = withDefaults(
  defineProps<{
    id: string
    name: string
    size?: number
  }>(),
  { size: 40 },
)

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.38)}px`,
  background: colorForId(props.id),
}))
</script>

<template>
  <span class="avatar" :style="style" role="img" :aria-label="name">{{ initials(name) }}</span>
</template>

<style scoped>
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  user-select: none;
}
</style>
