<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, EllipsisVertical, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import ActiveExerciseCard from '@/components/session/ActiveExerciseCard.vue'
import RestTimerBar from '@/components/session/RestTimerBar.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { formatClock } from '@/lib/format'

const router = useRouter()
const activeSession = useActiveSessionStore()

const draft = computed(() => activeSession.session?.draft)

const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
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

function onFinish() {
  const stored = activeSession.finish()
  router.replace({ name: 'session-detail', params: { id: stored.id } })
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
      <span class="elapsed">{{ formatClock(activeSession.elapsedSeconds) }}</span>
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
      <button type="button" class="finish-btn" @click="onFinish">
        <Check :size="16" :stroke-width="2.5" /> Finish
      </button>
    </template>

    <p v-if="!draft" class="msg">
      No workout in progress. Start one from a routine to see it here.
    </p>

    <template v-else>
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

.elapsed {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-heading);
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
