<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import FinishSummary from '@/components/session/FinishSummary.vue'
import ShareWorkoutSheet from '@/components/session/ShareWorkoutSheet.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useSessionRecapStore } from '@/stores/sessionRecap'
import { HapticsService } from '@/services/haptics'
import { celebrationTier } from '@/lib/celebration'
import { AdService } from '@/services/ads'
import { AppReviewService } from '@/services/appReview'
import { publicOrigin, publicRouteUrl } from '@/lib/publicUrl'
import { workoutCardContent, type WorkoutCardData } from '@/lib/workoutCard'
import { useThemeStore } from '@/stores/theme'
import { useExerciseName } from '@/composables/useExerciseName'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()
const sessionRecap = useSessionRecapStore()
const theme = useThemeStore()
const { exerciseName } = useExerciseName()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : undefined))

/** Only trust the recap if it's for this exact session — guards stale/direct navigation. */
const recap = computed(() =>
  sessionRecap.recap?.sessionId === id.value ? sessionRecap.recap : null,
)

// Felt as it lands on screen, and sized like the screen is: nothing extra for
// an ordinary finish (the outro already marked it), a success for something
// earned, and a heavier beat first for the rare one.
onMounted(() => {
  if (!recap.value) return
  const tier = celebrationTier({
    personalRecords: recap.value.personalRecords.length,
    milestone: recap.value.milestone,
    plateUp: !!recap.value.plateUp,
  })
  if (tier === 'routine') return
  if (tier === 'event') {
    void HapticsService.heavy()
    setTimeout(() => void HapticsService.success(), 220)
  } else {
    void HapticsService.success()
  }
})

async function onDone() {
  const hadWin =
    !!recap.value && (recap.value.personalRecords.length > 0 || !!recap.value.milestone)
  const totalSessions = sessions.list.length
  sessionRecap.clear()
  router.replace('/sessions')
  // A win is the moment to ask for a rating. An ad never stacks on that request —
  // it waits for the next finish — and neither blocks leaving the screen.
  if (!(await AppReviewService.maybeAsk({ hadWin, totalSessions }))) AdService.showInterstitial()
}

// Leads with the most exciting fact — a fresh PR beats a plain streak count.
const shareText = computed(() => {
  if (!result.value?.ok) return ''
  const session = result.value.session
  const lines = [
    t('sessionComplete.shareIntro', { name: session.name }),
    t('sessionComplete.shareStats', {
      sets: session.totalWorkingSets,
      exercises: session.exerciseCount,
    }),
  ]
  const topPr = recap.value?.personalRecords[0]
  if (topPr) {
    lines.push(
      t('sessionComplete.sharePr', {
        exercise: exerciseName(topPr.exerciseName),
        // Not formatNumber: it rounds, and a 72.5 record must not read as 73.
        weight: topPr.weight,
        unit: session.unit,
        reps: topPr.reps,
      }),
    )
  } else if (recap.value && recap.value.weekStreak >= 2) {
    lines.push(t('sessionComplete.shareStreak', { weeks: recap.value.weekStreak }))
  }
  // Tagged so installs that come from a shared workout can be told apart.
  lines.push(publicRouteUrl('/?src=share-card'))
  return lines.join('\n')
})

/** What goes on the shared image: the numbers, the lifts, and the top record or the streak. */
const cardData = computed<WorkoutCardData | null>(() => {
  if (!result.value?.ok) return null
  const session = result.value.session
  return workoutCardContent({
    session,
    recap: recap.value,
    exerciseName,
    host: new URL(publicOrigin()).host,
    accent: theme.accent,
    labels: {
      eyebrow: t('sessionComplete.workoutComplete'),
      time: t('sessionComplete.time'),
      sets: t('sessionComplete.sets'),
      exercises: t('sessionComplete.exercises'),
      volume: t('sessionComplete.volumeUnit', { unit: session.unit }),
      record: t('sessionComplete.cardPr'),
      recordMark: t('sessionComplete.cardRecordMark'),
      streakLabel: t('sessionComplete.cardStreakLabel'),
      streak: (weeks) => t('sessionComplete.cardStreak', { weeks }),
      more: (count) => t('sessionComplete.cardMore', { count }),
    },
  })
})

/** Sharing opens a preview first: nothing leaves the phone that wasn't looked at. */
const shareOpen = ref(false)
</script>

<template>
  <AppPage
    sub
    fill
    :title="result?.ok ? result.session.name : t('sessionComplete.fallbackTitle')"
  >
    <p v-if="!stored || !result?.ok" class="msg">{{ t('sessionDetail.notFound') }}</p>

    <FinishSummary
      v-else
      :session="result.session"
      :recap="recap"
      :room-id="stored.roomId"
      @done="onDone"
      @share="shareOpen = true"
      @recap="router.push({ name: 'room-recap', params: { id: stored.roomId } })"
    />

    <ShareWorkoutSheet
      :open="shareOpen"
      :data="cardData"
      :caption="shareText"
      @close="shareOpen = false"
    />
  </AppPage>
</template>

<style scoped>
.msg {
  font-size: var(--text-body);
}
</style>
