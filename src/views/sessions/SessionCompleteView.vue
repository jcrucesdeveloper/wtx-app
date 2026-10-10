<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import FinishSummary from '@/components/session/FinishSummary.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useSessionRecapStore } from '@/stores/sessionRecap'
import { formatClock, formatNumber } from '@/lib/format'
import { HapticsService } from '@/services/haptics'
import { AdService } from '@/services/ads'
import { AppReviewService } from '@/services/appReview'
import { canShare, shareImage, shareLink } from '@/services/nativeShare'
import { track } from '@/services/analytics'
import { publicOrigin, publicRouteUrl } from '@/lib/publicUrl'
import { renderWorkoutCard, type WorkoutCardData } from '@/lib/workoutCard'
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

// A record is felt as it lands on screen (the summary's reveal starts with it).
onMounted(() => {
  if (recap.value?.personalRecords.length) HapticsService.success()
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

/** What goes on the shared image: the headline numbers plus the top record, or the streak. */
const cardData = computed<WorkoutCardData | null>(() => {
  if (!result.value?.ok) return null
  const session = result.value.session
  const stats = [
    ...(recap.value
      ? [{ value: formatClock(recap.value.elapsedSeconds), label: t('sessionComplete.time') }]
      : []),
    { value: String(session.exerciseCount), label: t('sessionComplete.exercises') },
    { value: String(session.totalWorkingSets), label: t('sessionComplete.sets') },
    ...(session.totalVolume > 0
      ? [
          {
            value: formatNumber(session.totalVolume),
            label: t('sessionComplete.volumeUnit', { unit: session.unit }),
          },
        ]
      : []),
  ]
  const topPr = recap.value?.personalRecords[0]
  let highlight: WorkoutCardData['highlight']
  if (topPr) {
    highlight = {
      label: t('sessionComplete.cardPr'),
      text: `${exerciseName(topPr.exerciseName)} · ${topPr.weight} ${session.unit} × ${topPr.reps}`,
    }
  } else if (recap.value && recap.value.weekStreak >= 2) {
    highlight = {
      label: t('sessionComplete.cardStreakLabel'),
      text: t('sessionComplete.cardStreak', { weeks: recap.value.weekStreak }),
    }
  }
  return {
    eyebrow: t('sessionComplete.workoutComplete'),
    title: session.name,
    stats,
    highlight,
    footer: t('sessionComplete.cardFooter'),
    host: new URL(publicOrigin()).host,
    accent: theme.accent,
  }
})

const canNativeShare = canShare()
const shareCopied = ref(false)

/** Shares the workout as an image. Resolves `false` where images can't be shared. */
async function shareCard(): Promise<boolean> {
  if (!cardData.value) return false
  try {
    const png = await renderWorkoutCard(cardData.value)
    const shared = await shareImage(png, 'wtx-workout.png', 'image/png', shareText.value)
    if (shared) track('workout_card_shared')
    return shared
  } catch (err) {
    console.error('[share] workout card failed', err)
    return false
  }
}

async function share() {
  if (await shareCard()) return
  if (canNativeShare) {
    try {
      await shareLink({ text: shareText.value })
    } catch {
      /* user dismissed the share sheet, or it's unavailable */
    }
    return
  }
  try {
    await navigator.clipboard.writeText(shareText.value)
    shareCopied.value = true
    setTimeout(() => (shareCopied.value = false), 1500)
  } catch {
    /* clipboard blocked */
  }
}
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
      :share-copied="shareCopied"
      @done="onDone"
      @share="share"
      @recap="router.push({ name: 'room-recap', params: { id: stored.roomId } })"
    />
  </AppPage>
</template>

<style scoped>
.msg {
  font-size: var(--text-body);
}
</style>
