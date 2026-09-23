<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PartyPopper, TrendingDown, TrendingUp } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import PersonalRecordBanner from '@/components/session/PersonalRecordBanner.vue'
import StreakRecapCard from '@/components/session/StreakRecapCard.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useSessionRecapStore } from '@/stores/sessionRecap'
import { formatClock, formatNumber } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { HapticsService } from '@/services/haptics'
import { AdService } from '@/services/ads'

const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()
const sessionRecap = useSessionRecapStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : undefined))

/** Only trust the recap if it's for this exact session — guards stale/direct navigation. */
const recap = computed(() =>
  sessionRecap.recap?.sessionId === id.value ? sessionRecap.recap : null,
)

/**
 * Staged reveal: headline → PRs → comparison → streak/milestone. Reduced
 * motion shows everything at once instead of staggering.
 */
const reduced = prefersReducedMotion()
const stage = ref(reduced ? 3 : 0)
const revealTimers: ReturnType<typeof setTimeout>[] = []

onMounted(() => {
  if (reduced) return
  revealTimers.push(
    setTimeout(() => {
      stage.value = 1
      if (recap.value?.personalRecords.length) HapticsService.success()
    }, 350),
  )
  revealTimers.push(setTimeout(() => (stage.value = 2), 700))
  revealTimers.push(setTimeout(() => (stage.value = 3), 1050))
})

onBeforeUnmount(() => revealTimers.forEach(clearTimeout))

function onDone() {
  sessionRecap.clear()
  // Fire-and-forget, same as the flow this replaces — never block leaving the screen on it.
  AdService.showInterstitial()
  router.replace('/sessions')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.session.name : 'Workout complete'">
    <template #actions>
      <button type="button" class="done-btn" @click="onDone">Done</button>
    </template>

    <p v-if="!stored || !result?.ok" class="msg">This session is no longer in your history.</p>

    <template v-else>
      <div class="headline">
        <p class="headline__title">Workout complete</p>
        <div class="headline__stats">
          <div v-if="recap" class="headline__stat">
            <span class="headline__value">{{ formatClock(recap.elapsedSeconds) }}</span>
            <span class="headline__label">time</span>
          </div>
          <div class="headline__stat">
            <span class="headline__value">{{ result.session.exerciseCount }}</span>
            <span class="headline__label">exercises</span>
          </div>
          <div class="headline__stat">
            <span class="headline__value">{{ result.session.totalWorkingSets }}</span>
            <span class="headline__label">sets</span>
          </div>
          <div v-if="result.session.totalVolume > 0" class="headline__stat">
            <span class="headline__value">{{ formatNumber(result.session.totalVolume) }}</span>
            <span class="headline__label">{{ result.session.unit }} volume</span>
          </div>
        </div>
      </div>

      <Transition v-if="recap" name="reveal">
        <div v-if="stage >= 1 && recap.personalRecords.length" class="stack">
          <PersonalRecordBanner
            v-for="pr in recap.personalRecords"
            :key="pr.exerciseName"
            :record="pr"
            :unit="result.session.unit"
          />
        </div>
      </Transition>

      <Transition v-if="recap" name="reveal">
        <div v-if="stage >= 2 && recap.comparison" class="compare">
          <component
            :is="recap.comparison.isVolumeUp ? TrendingUp : TrendingDown"
            :size="18"
            :stroke-width="2.25"
            :class="recap.comparison.isVolumeUp ? 'compare__icon--up' : 'compare__icon--down'"
          />
          <span class="compare__text">
            {{ formatNumber(Math.abs(recap.comparison.volumeDelta)) }} {{ result.session.unit }}
            {{ recap.comparison.isVolumeUp ? 'more' : 'less' }} volume vs. last time
          </span>
        </div>
      </Transition>

      <Transition v-if="recap" name="reveal">
        <div v-if="stage >= 3" class="stack">
          <StreakRecapCard :week-streak="recap.weekStreak" />
          <div v-if="recap.milestone" class="milestone">
            <PartyPopper :size="20" :stroke-width="2.25" class="milestone__icon" />
            <span class="milestone__label">{{ recap.milestone.label }}</span>
          </div>
        </div>
      </Transition>

      <LoggedExerciseList :exercises="result.session.exercises" :unit="result.session.unit" />
    </template>
  </AppPage>
</template>

<style scoped>
.done-btn {
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.headline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.headline__title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
}

.headline__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.headline__stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.headline__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.headline__label {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.6;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.compare {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.compare__icon--up {
  color: #16a34a;
}

.compare__icon--down {
  color: #e11d48;
}

.compare__text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.milestone {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-background-soft));
  border: 1px solid var(--color-accent);
}

.milestone__icon {
  color: var(--color-accent);
}

.milestone__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
}

.reveal-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.reveal-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
