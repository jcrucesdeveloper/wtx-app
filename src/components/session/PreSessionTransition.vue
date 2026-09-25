<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{ routineName: string }>()
const { t } = useI18n()
const emit = defineEmits<{ done: [] }>()

const DURATION_MS = 750

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  timer = setTimeout(() => emit('done'), DURATION_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Teleport to="body">
    <div class="intro" role="presentation" @click="emit('done')">
      <p class="intro__eyebrow">{{ t('session.preSessionTransition.letsGo') }}</p>
      <h2 class="intro__name">{{ routineName }}</h2>
    </div>
  </Teleport>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--color-background);
  animation: intro-fade 0.75s ease forwards;
}

.intro__eyebrow {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-accent);
  opacity: 0;
  animation: intro-rise 0.35s ease 0.05s forwards;
}

.intro__name {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-heading);
  opacity: 0;
  animation: intro-rise 0.35s ease 0.15s forwards;
}

@keyframes intro-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes intro-fade {
  0%,
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro,
  .intro__eyebrow,
  .intro__name {
    animation: none;
    opacity: 1;
  }
}
</style>
