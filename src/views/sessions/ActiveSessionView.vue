<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, EllipsisVertical, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import ActiveExerciseCard from '@/components/session/ActiveExerciseCard.vue'
import RestTimerBar from '@/components/session/RestTimerBar.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'
import { AdService } from '@/services/ads'

const router = useRouter()
const activeSession = useActiveSessionStore()

const draft = computed(() => activeSession.session?.draft)

const stats = computed(() => {
  const exercises = draft.value?.exercises ?? []
  let totalSets = 0
  let completedSets = 0
  let completedExercises = 0
  for (const exercise of exercises) {
    const workingSets = exercise.loggedSets.filter((s) => !s.isWarmup)
    const doneSets = workingSets.filter((s) => s.completed)
    totalSets += workingSets.length
    completedSets += doneSets.length
    if (doneSets.length > 0) completedExercises++
  }
  return { totalSets, completedSets, completedExercises, totalExercises: exercises.length }
})

const progressPercent = computed(() =>
  stats.value.totalSets > 0
    ? Math.round((stats.value.completedSets / stats.value.totalSets) * 100)
    : 0,
)

/**
 * Small-area hypothesis (Koo & Fishbach 2010): motivation is highest when the
 * displayed count is the smaller one — "done" early on, "to go" once past halfway.
 */
const progressLabel = computed(() => {
  const { totalSets, completedSets } = stats.value
  if (totalSets === 0) return ''
  if (completedSets >= totalSets) return 'All sets done'

  const remaining = totalSets - completedSets
  if (completedSets < remaining) return `${completedSets} set${completedSets === 1 ? '' : 's'} done`
  return `${remaining} set${remaining === 1 ? '' : 's'} to go`
})

const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', closeMenu)
  // Pre-load now so it's ready to show the moment the workout finishes.
  AdService.loadInterstitial()
})
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/sessions')
}

function onDiscard() {
  menuOpen.value = false
  if (!confirm('Discard this workout? This cannot be undone.')) return
  activeSession.discard()
  router.replace('/sessions')
}

const finishing = ref(false)
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

function onFinish() {
  if (finishing.value) return
  finishing.value = true

  const go = () => {
    const elapsedSeconds = activeSession.elapsedSeconds
    const stored = activeSession.finish()
    router.replace({
      name: 'session-complete',
      params: { id: stored.id },
      query: { elapsed: String(elapsedSeconds) },
    })
  }

  // A short beat of "squash" on the button before the page transition takes
  // over, so the tap reads as acknowledged rather than an instant cut.
  if (reduceMotion) go()
  else setTimeout(go, 140)
}

function onStartGroupWorkout() {
  // TODO: implement starting a shared/group workout.
}
</script>

<template>
  <AppPage :title="draft?.name || 'Workout'">
    <template #leading>
      <button type="button" class="icon-btn" aria-label="Back" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="draft" #actions>
      <button
        type="button"
        class="icon-btn"
        aria-label="Start group workout"
        @click="onStartGroupWorkout"
      >
        <Users :size="18" :stroke-width="2.25" />
      </button>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          aria-label="Workout options"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="18" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item menu__item--danger" @click="onDiscard">
            Discard workout
          </button>
        </div>
      </div>
      <button
        type="button"
        class="finish-btn"
        :class="{ 'finish-btn--pressed': finishing }"
        :disabled="finishing"
        @click="onFinish"
      >
        <Check :size="16" :stroke-width="2.5" /> Finish
      </button>
    </template>

    <p v-if="!draft" class="msg">
      No workout in progress. Start one from a routine to see it here.
    </p>

    <template v-else>
      <div class="stats-bar">
        <div class="stats-bar__row">
          <div class="stats-bar__time">
            <span class="stats-bar__time-label">Elapsed</span>
            <span class="stats-bar__time-value">{{
              formatClock(activeSession.elapsedSeconds)
            }}</span>
          </div>
          <div class="stats-bar__chips">
            <span class="chip">
              {{ stats.completedExercises }}/{{ stats.totalExercises }} exercises
            </span>
            <span class="chip">{{ stats.completedSets }}/{{ stats.totalSets }} sets</span>
          </div>
        </div>

        <div v-if="stats.totalSets > 0" class="stats-bar__progress">
          <div class="stats-bar__progress-track">
            <div class="stats-bar__progress-fill" :style="{ width: progressPercent + '%' }" />
          </div>
          <span class="stats-bar__progress-label">{{ progressLabel }}</span>
        </div>
      </div>

      <div class="stack">
        <ActiveExerciseCard
          v-for="(exercise, i) in draft.exercises"
          :key="i"
          :exercise-index="i"
          :exercise="exercise"
          :unit="draft.unit"
        />
      </div>

      <RestTimerBar />
    </template>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

.icon-btn:first-child {
  margin-left: -4px;
}

.stats-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.stats-bar__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-bar__time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats-bar__time-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
}

.stats-bar__time-value {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-heading);
  line-height: 1.1;
}

.stats-bar__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stats-bar__progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-bar__progress-track {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  overflow: hidden;
}

.stats-bar__progress-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.stats-bar__progress-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  white-space: nowrap;
}

.menu {
  position: relative;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.menu__item {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--color-background-mute);
}

.menu__item--danger {
  color: #e11d48;
}

.finish-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.finish-btn--pressed {
  animation: finish-btn-punch 0.14s ease-out both;
}

@keyframes finish-btn-punch {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(0.88);
  }
}

@media (prefers-reduced-motion: reduce) {
  .finish-btn--pressed {
    animation: none;
  }
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}
</style>
