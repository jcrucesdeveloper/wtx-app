<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CloudUpload, EllipsisVertical, Share2, Smartphone, Trophy } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import QuietState from '@/components/ui/QuietState.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import ShareWorkoutSheet from '@/components/session/ShareWorkoutSheet.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'
import { formatClock, formatNumber, formatTimeOfDay } from '@/lib/format'
import { pastSessionRecap, type LoggedSession } from '@/lib/pastSessionRecap'
import type { WorkoutCardFormat, WorkoutCardStyle } from '@/lib/workoutCard'
import { useWorkoutShare } from '@/composables/useWorkoutShare'
import { useExerciseName } from '@/composables/useExerciseName'

/**
 * A workout from History, seen after the fact: the finish screen's facts in
 * its visual language — the name, the numbers on one hairline row, the
 * records it set, then every set — without the celebration. It shares from
 * here with the same card and sheet as the finish screen.
 */
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()
const auth = useAuthStore()
const { exerciseName } = useExerciseName()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : null))
const session = computed(() => (result.value?.ok ? result.value.session : null))

/** Accounts exist in this build and the session was kept off them on finish. */
const isDeviceOnly = computed(() => isSupabaseConfigured && !!stored.value?.localOnly)

/** Every parsed session, for working out what this one meant at the time. */
const logged = computed<LoggedSession[]>(() =>
  sessions.list.flatMap((s) => {
    const parsed = sessions.parsed(s.id)
    if (!parsed?.ok) return []
    return [
      {
        id: s.id,
        addedAt: s.addedAt,
        routineId: s.routineId,
        feedSnapshot: s.feedSnapshot,
        session: parsed.session,
      },
    ]
  }),
)

const recap = computed(() => {
  const target = logged.value.find((item) => item.id === id.value)
  return target ? pastSessionRecap(target, logged.value) : null
})

/** "Friday, October 2 · 6:40 PM" from the session's `YYYY-MM-DD`; the raw text if it isn't one. */
const dateLabel = computed(() => {
  if (!session.value || !stored.value) return ''
  const raw = session.value.date
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return raw
  const day = new Date(y, m - 1, d).toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: y === new Date().getFullYear() ? undefined : 'numeric',
  })
  return `${day} · ${formatTimeOfDay(stored.value.addedAt)}`
})

const unit = computed(() => session.value?.unit ?? '')

/** The finish screen's row: the time when it was kept, the sets, then volume or exercises. */
const stats = computed(() => {
  const s = session.value
  if (!s) return []
  const elapsed = recap.value?.elapsedSeconds ?? 0
  return [
    ...(elapsed > 0 ? [{ value: formatClock(elapsed), label: t('sessionComplete.time') }] : []),
    { value: String(s.totalWorkingSets), label: t('sessionComplete.sets') },
    s.totalVolume > 0
      ? {
          value: formatNumber(s.totalVolume),
          label: t('sessionComplete.volumeUnit', { unit: unit.value }),
        }
      : { value: String(s.exerciseCount), label: t('sessionComplete.exercises') },
  ]
})

const comparison = computed(() => {
  const c = recap.value?.comparison
  // The same volume as last time is not worth a line.
  if (!c || c.volumeDelta === 0) return undefined
  return {
    up: c.isVolumeUp,
    text: t(c.isVolumeUp ? 'sessionComplete.moreVolume' : 'sessionComplete.lessVolume', {
      value: formatNumber(Math.abs(c.volumeDelta)),
      unit: unit.value,
    }),
  }
})

const records = computed(() => recap.value?.personalRecords ?? [])
const recordNames = computed(() => records.value.map((pr) => pr.exerciseName))

/** One line per record. Raw weight, not formatNumber: a 72.5 must not read as 73. */
const recordLines = computed(() =>
  records.value.map((pr) => ({
    name: exerciseName(pr.exerciseName),
    value: `${pr.weight} ${unit.value}`.trim() + ` × ${pr.reps}`,
  })),
)

function onSaveToProfile() {
  if (stored.value) sessions.saveToProfile(stored.value.id)
}

// Sharing: the finish screen's card and sheet, for this session. What the
// sheet is set to lives here, so a photo picked once is still there next time.
const { cardData, caption } = useWorkoutShare(session, recap, 'past')
const shareOpen = ref(false)
const shareStyle = ref<WorkoutCardStyle>('card')
const shareFormat = ref<WorkoutCardFormat>('story')
// Not deep-reactive: it's an image element, only ever swapped whole.
const sharePhoto = shallowRef<HTMLImageElement | null>(null)

const showSource = ref(false)
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

function onDelete() {
  menuOpen.value = false
  if (!stored.value) return
  if (!confirm(t('sessionDetail.deleteConfirm'))) return
  sessions.remove(stored.value.id)
  router.replace('/sessions')
}
</script>

<template>
  <AppPage sub :title="t('sessionDetail.title')">
    <template #leading>
      <button
        type="button"
        class="icon-btn icon-btn--start"
        :aria-label="t('sessionDetail.backAria')"
        @click="goBack"
      >
        <ArrowLeft :size="22" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="stored" #actions>
      <button
        v-if="cardData"
        type="button"
        class="icon-btn"
        :aria-label="t('sessionComplete.shareAria')"
        @click="shareOpen = true"
      >
        <Share2 :size="20" :stroke-width="2.25" />
      </button>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('sessionDetail.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="20" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item menu__item--danger" @click="onDelete">
            {{ t('sessionDetail.deleteSession') }}
          </button>
        </div>
      </div>
    </template>

    <QuietState
      v-if="!stored"
      :title="t('sessionDetail.notFoundTitle')"
      :hint="t('sessionDetail.notFound')"
    >
      <AppButton @click="router.replace('/sessions')">{{
        t('sessionDetail.backToHistory')
      }}</AppButton>
    </QuietState>

    <template v-else-if="result">
      <div v-if="session" class="stack">
        <header class="head">
          <p class="head__date">
            {{ dateLabel }}
            <template v-if="!session.isComplete"> · {{ t('sessionDetail.incomplete') }}</template>
          </p>
          <h2 class="head__name">{{ session.name }}</h2>
          <p v-if="session.notes" class="head__notes">{{ session.notes }}</p>
        </header>

        <section>
          <div class="stats">
            <div v-for="stat in stats" :key="stat.label" class="stats__item">
              <span class="stats__value">{{ stat.value }}</span>
              <span class="stats__label">{{ stat.label }}</span>
            </div>
          </div>
          <p v-if="comparison" class="compare">
            <span v-if="comparison.up" class="compare__up">↑</span> {{ comparison.text }}
          </p>
        </section>

        <section v-if="recordLines.length" class="records">
          <span class="records__badge"><Trophy :size="18" :stroke-width="2.5" /></span>
          <div class="records__body">
            <span class="records__title">
              {{ t('sessionDetail.records', { count: recordLines.length }, recordLines.length) }}
            </span>
            <span v-for="line in recordLines" :key="line.name" class="records__line">
              {{ line.name }} · <strong>{{ line.value }}</strong>
            </span>
          </div>
        </section>

        <div v-if="isDeviceOnly" class="local">
          <Smartphone :size="20" :stroke-width="2" class="local__icon" />
          <div class="local__text">
            <span class="local__title">{{ t('sessionDetail.deviceOnly') }}</span>
            <span class="local__hint">{{ t('sessionDetail.deviceOnlyHint') }}</span>
          </div>
          <AppButton v-if="auth.isLoggedIn" variant="quiet" size="sm" @click="onSaveToProfile">
            <CloudUpload :size="15" :stroke-width="2.5" />
            {{ t('sessionDetail.saveToProfile') }}
          </AppButton>
        </div>

        <section>
          <h2 class="label">{{ t('finish.whatYouDid') }}</h2>
          <LoggedExerciseList
            :exercises="session.exercises"
            :unit="session.unit"
            :records="recordNames"
          />
        </section>

        <!-- The session is a text file; this is it. -->
        <section>
          <button type="button" class="text__toggle" @click="showSource = !showSource">
            {{ showSource ? t('sessionDetail.hideSource') : t('sessionDetail.showSource') }}
          </button>
          <pre v-if="showSource" class="source">{{ stored.rawText }}</pre>
        </section>
      </div>

      <div v-else-if="!result.ok" class="stack">
        <p class="error">{{ result.error }}</p>
        <pre class="source">{{ stored.rawText }}</pre>
      </div>
    </template>

    <ShareWorkoutSheet
      v-model:style="shareStyle"
      v-model:format="shareFormat"
      v-model:photo="sharePhoto"
      :open="shareOpen"
      :data="cardData"
      :caption="caption"
      @close="shareOpen = false"
    />
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.icon-btn--start {
  margin-left: -10px;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

.menu {
  position: relative;
  margin-right: -10px;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 10px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-soft);
  box-shadow: var(--elevation-overlay);
}

.menu__item {
  min-height: var(--size-touch);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 15px;
  font-weight: var(--weight-medium);
  text-align: left;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--color-background-mute);
}

.menu__item--danger {
  color: var(--color-danger);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
  font-variant-numeric: tabular-nums;
}

.label {
  margin-bottom: 10px;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

/* Who and when. */
.head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: var(--space-2);
}

.head__date {
  font-size: 13px;
  font-weight: 700;
}

.head__date::first-letter {
  text-transform: capitalize;
}

.head__name {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.head__notes {
  margin-top: 4px;
  font-size: var(--text-body);
  line-height: 1.4;
}

/* The numbers: one row, divided by hairlines, not boxes — as on the finish screen. */
.stats {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stats__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 0 14px 16px;
}

.stats__item:first-child {
  padding-left: 0;
}

.stats__item + .stats__item {
  border-left: 1px solid var(--color-border);
}

.stats__value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-heading);
}

.stats__label {
  font-size: 13px;
}

.compare {
  margin-top: 12px;
  font-size: 14px;
}

.compare__up {
  font-weight: 800;
  color: var(--color-heading);
}

/* What it beat. */
.records {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--color-background-soft);
}

.records__badge {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.records__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.records__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.records__line {
  font-size: 14px;
}

.records__line strong {
  font-weight: 700;
  color: var(--color-heading);
}

.local {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 14px;
  border-radius: 14px;
  background: var(--color-background-soft);
}

.local__icon {
  flex-shrink: 0;
}

.local__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.local__title {
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.local__hint {
  font-size: var(--text-small);
  line-height: 1.35;
}

.text__toggle {
  min-height: var(--size-touch);
  border: none;
  padding: 0;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.error {
  font-size: var(--text-small);
  color: var(--color-danger);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.source {
  margin-top: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: var(--text-small);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--color-heading);
  background: var(--color-background-soft);
  user-select: text;
  -webkit-user-select: text;
}
</style>
