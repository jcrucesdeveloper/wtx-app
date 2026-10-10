<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCircle2 } from '@lucide/vue'
import { HapticsService } from '@/services/haptics'

const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const DURATION_MS = 900

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  HapticsService.medium()
  timer = setTimeout(() => emit('done'), DURATION_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Teleport to="body">
    <div class="outro" role="presentation" @click="emit('done')">
      <CheckCircle2 :size="56" :stroke-width="2" class="outro__check" />
      <h2 class="outro__label">{{ t('session.postSessionTransition.workoutLogged') }}</h2>
    </div>
  </Teleport>
</template>

<style scoped>
/* A beat between the workout and its summary: done, then what it added up to. */
.outro {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  background: var(--color-background);
}

.outro__check {
  color: var(--color-accent);
  animation: outro-land var(--motion-slow) var(--ease-spring) both;
}

.outro__label {
  font-size: var(--text-title);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  color: var(--color-heading);
  animation: outro-rise var(--motion-base) var(--ease-out) var(--motion-quick) both;
}

@keyframes outro-land {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
}

@keyframes outro-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
</style>
