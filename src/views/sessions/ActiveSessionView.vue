<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, EllipsisVertical, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import ActiveExerciseCard from '@/components/session/ActiveExerciseCard.vue'
import RestTimerBar from '@/components/session/RestTimerBar.vue'
import ReorderExercisesSheet from '@/components/session/ReorderExercisesSheet.vue'
import FinishSessionSheet from '@/components/session/FinishSessionSheet.vue'
import ExerciseListSheet from '@/components/wtx/ExerciseListSheet.vue'
import PreSessionTransition from '@/components/session/PreSessionTransition.vue'
import PostSessionTransition from '@/components/session/PostSessionTransition.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useFinishSession } from '@/composables/useFinishSession'
import { sessionDiffersFromRoutine } from '@/lib/sessionToRoutine'
import { formatClock } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { AdService } from '@/services/ads'

const router = useRouter()
const activeSession = useActiveSessionStore()
const routines = useRoutinesStore()
const { finishSession } = useFinishSession()

const draft = computed(() => activeSession.session?.draft)

/** Only the moment a workout truly starts, not every time this view is re-entered. */
const showIntro = ref(false)

/** Set once finishing, so the outro beat can outlive `draft` going null. */
const finishing = ref(false)
const finishedSessionId = ref<string | null>(null)

const stats = computed(() => {
  const exercises = draft.value?.exercises ?? []
  let totalSets = 0
  let completedSets = 0
  let completedExercises = 0
  for (const exercise of exercises) {
    const workingSets = exercise.loggedSets.filter((s) => s.type !== 'W')
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
  // A freshly-started session is a few seconds old at most — resuming an
  // already-in-progress one (e.g. backgrounding and returning) shouldn't replay it.
  if (!prefersReducedMotion() && activeSession.elapsedSeconds < 2) showIntro.value = true
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

const reorderOpen = ref(false)
function onReorder() {
  menuOpen.value = false
  reorderOpen.value = true
}

const addExerciseOpen = ref(false)
function onAddExercise() {
  menuOpen.value = false
  addExerciseOpen.value = true
}
function onPickExercise(name: string) {
  activeSession.addExercise(name)
  addExerciseOpen.value = false
}

function finishAndNavigate(routineIdOverride?: string) {
  const stored = finishSession(routineIdOverride)
  if (prefersReducedMotion()) {
    router.replace({ name: 'session-complete', params: { id: stored.id } })
    return
  }
  finishedSessionId.value = stored.id
  finishing.value = true
}

function onFinishTransitionDone() {
  finishing.value = false
  if (finishedSessionId.value) {
    router.replace({ name: 'session-complete', params: { id: finishedSessionId.value } })
  }
}

const finishSheetOpen = ref(false)
function onFinish() {
  const session = activeSession.session
  const routineId = session?.routineId
  const template = routineId ? routines.parsed(routineId) : undefined

  if (session && template?.ok && sessionDiffersFromRoutine(session.draft, template.template)) {
    finishSheetOpen.value = true
    return
  }
  finishAndNavigate()
}

function onFinishSheetChoice(routineIdOverride?: string) {
  finishSheetOpen.value = false
  finishAndNavigate(routineIdOverride)
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
          <button type="button" class="menu__item" @click="onAddExercise">Add exercise</button>
          <button
            type="button"
            class="menu__item"
            :disabled="stats.totalExercises < 2"
            @click="onReorder"
          >
            Reorder exercises
          </button>
          <button type="button" class="menu__item menu__item--danger" @click="onDiscard">
            Discard workout
          </button>
        </div>
      </div>
      <button type="button" class="finish-btn" @click="onFinish">
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
          :can-remove="draft.exercises.length > 1"
          @reorder="onReorder"
        />
      </div>

      <RestTimerBar />

      <div class="bottom-space" aria-hidden="true" />

      <ReorderExercisesSheet v-model:open="reorderOpen" />
      <ExerciseListSheet
        :open="addExerciseOpen"
        @close="addExerciseOpen = false"
        @select="onPickExercise"
      />
      <FinishSessionSheet v-model:open="finishSheetOpen" @finish="onFinishSheetChoice" />
    </template>

    <PreSessionTransition
      v-if="showIntro && draft"
      :routine-name="draft.name"
      @done="showIntro = false"
    />
    <PostSessionTransition v-if="finishing" @done="onFinishTransitionDone" />
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

.menu__item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: transparent;
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

.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.bottom-space {
  /* Room for the last exercise's inputs to scroll clear of the on-screen
     keyboard — see scrollFocusedIntoView. Without this there's nothing left
     to scroll for sets near the end of the workout. */
  height: 240px;
}
</style>
