import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WorkoutSession } from '@/lib/wtx'
import type { PersonalRecord } from '@/lib/sessionRecords'
import { publicOrigin, publicRouteUrl } from '@/lib/publicUrl'
import { workoutCardContent, type WorkoutCardData } from '@/lib/workoutCard'
import { useThemeStore } from '@/stores/theme'
import { useExerciseName } from '@/composables/useExerciseName'

/** What the card and the caption lean on beyond the session itself. */
export interface WorkoutShareRecap {
  elapsedSeconds: number
  weekStreak: number
  personalRecords: PersonalRecord[]
}

/**
 * The image and the caption for sharing a workout, in the user's language.
 * One source for the finish screen and for a past session opened from
 * History, so a workout shared later looks the same as one shared right away.
 *
 * `when` only changes the caption's first line: "Just finished…" is only
 * true on the finish screen.
 */
export function useWorkoutShare(
  session: MaybeRefOrGetter<WorkoutSession | null | undefined>,
  recap: MaybeRefOrGetter<WorkoutShareRecap | null | undefined>,
  when: 'now' | 'past' = 'now',
) {
  const { t } = useI18n()
  const theme = useThemeStore()
  const { exerciseName } = useExerciseName()

  // Leads with the most exciting fact — a fresh PR beats a plain streak count.
  const caption = computed(() => {
    const s = toValue(session)
    if (!s) return ''
    const r = toValue(recap)
    const lines = [
      t(when === 'now' ? 'sessionComplete.shareIntro' : 'sessionDetail.shareIntro', {
        name: s.name,
      }),
      t('sessionComplete.shareStats', { sets: s.totalWorkingSets, exercises: s.exerciseCount }),
    ]
    const topPr = r?.personalRecords[0]
    if (topPr) {
      lines.push(
        t('sessionComplete.sharePr', {
          exercise: exerciseName(topPr.exerciseName),
          // Not formatNumber: it rounds, and a 72.5 record must not read as 73.
          weight: topPr.weight,
          unit: s.unit,
          reps: topPr.reps,
        }),
      )
    } else if (r && r.weekStreak >= 2) {
      lines.push(t('sessionComplete.shareStreak', { weeks: r.weekStreak }))
    }
    // Tagged so installs that come from a shared workout can be told apart.
    lines.push(publicRouteUrl('/?src=share-card'))
    return lines.join('\n')
  })

  /** What goes on the shared image: the numbers, the lifts, and the top record or the streak. */
  const cardData = computed<WorkoutCardData | null>(() => {
    const s = toValue(session)
    if (!s) return null
    return workoutCardContent({
      session: s,
      recap: toValue(recap) ?? null,
      exerciseName,
      host: new URL(publicOrigin()).host,
      accent: theme.accent,
      labels: {
        eyebrow: t('sessionComplete.workoutComplete'),
        time: t('sessionComplete.time'),
        sets: t('sessionComplete.sets'),
        exercises: t('sessionComplete.exercises'),
        volume: t('sessionComplete.volumeUnit', { unit: s.unit }),
        record: t('sessionComplete.cardPr'),
        recordMark: t('sessionComplete.cardRecordMark'),
        streakLabel: t('sessionComplete.cardStreakLabel'),
        streak: (weeks) => t('sessionComplete.cardStreak', { weeks }),
        more: (count) => t('sessionComplete.cardMore', { count }),
      },
    })
  })

  return { cardData, caption }
}
