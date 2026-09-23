<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { CheckCircle2 } from '@lucide/vue'
import { HapticsService } from '@/services/haptics'

const emit = defineEmits<{ done: [] }>()

const DURATION_MS = 900

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  HapticsService.success()
  timer = setTimeout(() => emit('done'), DURATION_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Teleport to="body">
    <div class="outro" role="presentation" @click="emit('done')">
      <CheckCircle2 :size="56" :stroke-width="2" class="outro__check" />
      <h2 class="outro__label">Workout logged</h2>
    </div>
  </Teleport>
</template>

<style scoped>
.outro {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--color-background);
}

.outro__check {
  color: var(--color-accent);
  opacity: 0;
  transform: scale(0.6);
  animation: outro-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.outro__label {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-heading);
  opacity: 0;
  animation: outro-rise 0.35s ease 0.2s forwards;
}

@keyframes outro-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes outro-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .outro__check,
  .outro__label {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
