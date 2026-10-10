<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { PartyPopper, Share2, TrendingDown, TrendingUp } from '@lucide/vue'
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
import { AppReviewService } from '@/services/appReview'
import { canShare, shareImage, shareLink } from '@/services/nativeShare'
import { track } from '@/services/analytics'
import { publicOrigin, publicRouteUrl } from '@/lib/publicUrl'
import { renderWorkoutCard, type WorkoutCardData } from '@/lib/workoutCard'
import { useThemeStore } from '@/stores/theme'
import { useExerciseName } from '@/composables/useExerciseName'
// PROTO (redesign Phase 1)
import ProtoFinish from '@/proto/ProtoFinish.vue'
import { protoDirection } from '@/proto/direction'

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
    class="session-complete"
    :title="result?.ok ? result.session.name : t('sessionComplete.fallbackTitle')"
  >
    <template #actions>
      <button
        v-if="result?.ok"
        type="button"
        class="share-btn"
        :aria-label="t('sessionComplete.shareAria')"
        @click="share"
      >
        <Share2 :size="16" :stroke-width="2.25" />
        <span v-if="shareCopied">{{ t('sessionComplete.shareCopied') }}</span>
      </button>
      <button type="button" class="done-btn" @click="onDone">
        {{ t('sessionComplete.done') }}
      </button>
    </template>

    <p v-if="!stored || !result?.ok" class="msg">{{ t('sessionDetail.notFound') }}</p>

    <ProtoFinish
      v-else-if="protoDirection === 'focus'"
      :session="result.session"
      :recap="recap"
      @done="onDone"
      @share="share"
    />

    <template v-else>
      <div class="headline">
        <p class="headline__title">{{ t('sessionComplete.workoutComplete') }}</p>
        <div class="headline__stats">
          <div v-if="recap" class="headline__stat">
            <span class="headline__value">{{ formatClock(recap.elapsedSeconds) }}</span>
            <span class="headline__label">{{ t('sessionComplete.time') }}</span>
          </div>
          <div class="headline__stat">
            <span class="headline__value">{{ result.session.exerciseCount }}</span>
            <span class="headline__label">{{ t('sessionComplete.exercises') }}</span>
          </div>
          <div class="headline__stat">
            <span class="headline__value">{{ result.session.totalWorkingSets }}</span>
            <span class="headline__label">{{ t('sessionComplete.sets') }}</span>
          </div>
          <div v-if="result.session.totalVolume > 0" class="headline__stat">
            <span class="headline__value">{{ formatNumber(result.session.totalVolume) }}</span>
            <span class="headline__label">{{
              t('sessionComplete.volumeUnit', { unit: result.session.unit })
            }}</span>
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
            {{
              t(
                recap.comparison.isVolumeUp
                  ? 'sessionComplete.moreVolume'
                  : 'sessionComplete.lessVolume',
                {
                  value: formatNumber(Math.abs(recap.comparison.volumeDelta)),
                  unit: result.session.unit,
                },
              )
            }}
          </span>
        </div>
      </Transition>

      <Transition v-if="recap" name="reveal">
        <div v-if="stage >= 3" class="stack">
          <StreakRecapCard :week-streak="recap.weekStreak" />
          <div v-if="recap.milestone" class="milestone">
            <PartyPopper :size="20" :stroke-width="2.25" class="milestone__icon" />
            <span class="milestone__label">{{
              t(
                recap.milestone.kind === 'total-sessions'
                  ? 'sessionComplete.milestoneSessions'
                  : 'sessionComplete.milestoneStreak',
                { count: recap.milestone.count },
              )
            }}</span>
          </div>
        </div>
      </Transition>

      <button
        v-if="stored.roomId"
        type="button"
        class="group-recap"
        @click="router.push({ name: 'room-recap', params: { id: stored.roomId } })"
      >
        {{ t('room.viewRecap') }}
      </button>

      <LoggedExerciseList :exercises="result.session.exercises" :unit="result.session.unit" />
    </template>
  </AppPage>
</template>

<style scoped>
.group-recap {
  width: 100%;
  margin-bottom: 14px;
  border: none;
  border-radius: var(--radius-md);
  padding: 13px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 8px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-background-soft);
  cursor: pointer;
}

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
