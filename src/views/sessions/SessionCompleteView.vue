<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Flame } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import { useSessionsStore } from '@/stores/sessions'
import { computeWeekStreak, routineVolumeDelta } from '@/lib/sessionStats'
import { formatClock, formatNumber } from '@/lib/format'
import { AdService } from '@/services/ads'

const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : null))

const elapsedSeconds = computed(() => Number(route.query.elapsed) || 0)

const sessionDates = computed(() => {
  const dates: string[] = []
  for (const s of sessions.list) {
    const parsed = sessions.parsed(s.id)
    if (parsed?.ok) dates.push(parsed.session.date)
  }
  return dates
})

const weekStreak = computed(() => computeWeekStreak(sessionDates.value))

const volumeDelta = computed(() =>
  stored.value ? routineVolumeDelta(sessions.list, stored.value) : undefined,
)

/** Eight evenly-spaced burst directions behind the checkmark badge. */
const confettiPieces = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45,
  far: i % 2 === 0,
}))

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

const animatedExercises = ref(0)
const animatedSets = ref(0)
const animatedVolume = ref(0)
const animatedDelta = ref(0)
const animatedStreak = ref(0)

/** Eases a value from 0 up to `target`, calling `apply` on every frame. */
function animateCount(target: number, apply: (n: number) => void, duration = 650) {
  if (reduceMotion || target === 0) {
    apply(target)
    return
  }
  const start = performance.now()
  function step(now: number) {
    const progress = Math.min(1, (now - start) / duration)
    apply(target * (1 - Math.pow(1 - progress, 3)))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  // Let the full reveal sequence play out first so the interstitial reads as
  // a break after the celebration, not something cutting it off.
  setTimeout(() => AdService.showInterstitial(), 1700)

  if (!result.value?.ok) return
  const session = result.value.session

  const statsDelay = reduceMotion ? 0 : 550
  setTimeout(() => {
    animateCount(session.exerciseCount, (n) => (animatedExercises.value = n), 450)
    animateCount(session.totalWorkingSets, (n) => (animatedSets.value = n), 450)
    animateCount(session.totalVolume, (n) => (animatedVolume.value = n), 700)
  }, statsDelay)

  if (volumeDelta.value !== undefined) {
    const delta = volumeDelta.value
    setTimeout(() => animateCount(Math.abs(delta), (n) => (animatedDelta.value = n), 600), 800)
  }

  if (weekStreak.value > 0) {
    setTimeout(() => animateCount(weekStreak.value, (n) => (animatedStreak.value = n), 450), 1000)
  }
})

function onContinue() {
  if (!stored.value) {
    router.replace('/sessions')
    return
  }
  router.replace({ name: 'session-detail', params: { id: stored.value.id } })
}
</script>

<template>
  <AppPage title="Workout Complete">
    <template v-if="!stored">
      <p class="msg">This session is no longer in your history.</p>
    </template>

    <template v-else-if="result?.ok">
      <div class="hero">
        <div class="hero__badge-wrap">
          <div class="hero__ring" />
          <span
            v-for="(piece, i) in confettiPieces"
            :key="i"
            class="confetti"
            :class="{ 'confetti--alt': i % 2 === 1, 'confetti--far': piece.far }"
            :style="{ '--angle': piece.angle + 'deg' }"
          />
          <div class="hero__badge">
            <Check :size="36" :stroke-width="3" />
          </div>
        </div>
        <h2 class="hero__title reveal reveal--title">{{ result.session.name }}</h2>
        <p class="hero__time reveal reveal--title">{{ formatClock(elapsedSeconds) }} elapsed</p>
      </div>

      <div class="stats reveal reveal--stats">
        <div class="stat">
          <span class="stat__value">{{ Math.round(animatedExercises) }}</span>
          <span class="stat__label">Exercises</span>
        </div>
        <div class="stat">
          <span class="stat__value">{{ Math.round(animatedSets) }}</span>
          <span class="stat__label">Sets</span>
        </div>
        <div v-if="result.session.totalVolume > 0" class="stat">
          <span class="stat__value">{{ formatNumber(animatedVolume) }}</span>
          <span class="stat__label">{{ result.session.unit }} volume</span>
        </div>
      </div>

      <div
        v-if="volumeDelta !== undefined"
        class="callout reveal reveal--callout"
        :class="volumeDelta > 0 ? 'callout--up' : 'callout--down'"
      >
        {{ volumeDelta > 0 ? '▲' : '▼' }} {{ formatNumber(animatedDelta) }}
        {{ result.session.unit }} vs last time
      </div>

      <div v-if="weekStreak > 0" class="streak reveal reveal--streak">
        <Flame :size="22" :stroke-width="2.25" class="streak__flame" />
        <span class="streak__value">{{ Math.round(animatedStreak) }}</span>
        <span class="streak__label">week{{ weekStreak === 1 ? '' : 's' }} in a row</span>
      </div>

      <button type="button" class="continue-btn reveal reveal--cta" @click="onContinue">
        View summary
      </button>
    </template>

    <template v-else-if="result">
      <p class="msg error">{{ result.error }}</p>
      <button type="button" class="continue-btn" @click="onContinue">View summary</button>
    </template>
  </AppPage>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 0 18px;
  text-align: center;
}

.hero__badge-wrap {
  position: relative;
  width: 72px;
  height: 72px;
}

.hero__badge {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  animation: pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  opacity: 0;
  animation: ring-burst 0.7s ease-out 0.05s;
}

.confetti {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  margin: -3px;
  border-radius: 1px;
  background: var(--color-accent);
  opacity: 0;
  transform: rotate(var(--angle)) translateY(0);
  animation: confetti-burst 0.6s ease-out 0.12s forwards;
}

.confetti--alt {
  background: var(--color-heading);
}

.confetti--far {
  animation-duration: 0.75s;
}

.hero__title {
  font-size: 19px;
  font-weight: 700;
  color: var(--color-heading);
}

.hero__time {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.stats {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.stat__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.stat__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
  text-align: center;
}

.callout {
  display: block;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  border: 1px solid;
}

.callout--up {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.callout--down {
  color: #e11d48;
  border-color: #e11d48;
  background: color-mix(in srgb, #e11d48 10%, transparent);
}

.streak {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.streak__flame {
  color: var(--color-accent);
  flex-shrink: 0;
  animation: flame-breathe 1.8s ease-in-out 1.3s infinite;
}

.streak__value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.streak__label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

.continue-btn {
  display: block;
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.continue-btn:active {
  opacity: 0.85;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.error {
  color: #e11d48;
}

/* Staged reveal: each section fades/slides in a little after the last,
   so the screen builds up instead of slamming into place at once. */
.reveal {
  opacity: 0;
  animation: fade-slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.reveal--title {
  animation-delay: 0.3s;
}

.reveal--stats {
  animation-delay: 0.5s;
}

.reveal--callout {
  animation-delay: 0.75s;
}

.reveal--streak {
  animation-delay: 0.95s;
}

.reveal--cta {
  animation-delay: 1.15s;
}

@keyframes fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pop-in {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  70% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

@keyframes ring-burst {
  0% {
    opacity: 0.6;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
}

@keyframes confetti-burst {
  0% {
    opacity: 1;
    transform: rotate(var(--angle)) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(-46px) scale(0.4);
  }
}

@keyframes flame-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__badge,
  .hero__ring,
  .confetti,
  .streak__flame {
    animation: none;
  }

  .reveal {
    opacity: 1;
    animation: none;
    transform: none;
  }
}
</style>
