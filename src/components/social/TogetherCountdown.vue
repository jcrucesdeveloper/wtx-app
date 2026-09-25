<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { initials, memberColor } from '@/lib/memberColors'
import { HapticsService } from '@/services/haptics'

/**
 * A shared 3·2·1 at the start of a group workout. Every phone counts down to
 * the same moment (the room's started_at + 3s), so the group starts in sync —
 * moving together is part of what makes group exercise bond people.
 */
const props = defineProps<{
  /** Epoch millis when everyone goes. */
  goAt: number
  names: string[]
}>()

const emit = defineEmits<{ done: [] }>()

const { t } = useI18n()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
let finished = false
let lastSecond = -1

const secondsLeft = computed(() => Math.ceil((props.goAt - now.value) / 1000))

function tick() {
  now.value = Date.now()
  const s = secondsLeft.value
  if (s !== lastSecond && s > 0) {
    lastSecond = s
    void HapticsService.light()
  }
  // Hold "Go!" for a beat before handing over to the workout.
  if (now.value >= props.goAt + 600) finish()
}

function finish() {
  if (finished) return
  finished = true
  clearInterval(timer)
  void HapticsService.success()
  emit('done')
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 100)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Teleport to="body">
    <div class="countdown" role="timer" aria-live="assertive" @click="finish">
      <p class="countdown__title">{{ t('room.team.startingTogether') }}</p>
      <div class="countdown__avatars">
        <span v-for="(name, i) in names" :key="i" class="avatar" :style="{ background: memberColor(i) }">
          {{ initials(name) }}
        </span>
      </div>
      <p :key="secondsLeft > 0 ? secondsLeft : 'go'" class="countdown__number">
        {{ secondsLeft > 0 ? secondsLeft : t('room.team.go') }}
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.countdown {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--color-background);
}

.countdown__title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-accent);
}

.countdown__avatars {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 320px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.countdown__number {
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  animation: beat 0.9s ease;
}

@keyframes beat {
  0% {
    opacity: 0;
    transform: scale(1.4);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .countdown__number {
    animation: none;
  }
}
</style>
