<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronRight, Cloud, Smartphone, TriangleAlert } from '@lucide/vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore, type SessionSaveTarget } from '@/stores/settings'
import { isSupabaseConfigured } from '@/services/supabase'
import { routineDraftFromSession, sessionDiffersFromRoutine } from '@/lib/sessionToRoutine'
import { serializeTemplate } from '@/lib/serializeRoutine'
import { formatClock, formatNumber } from '@/lib/format'
import { containsBlockedTerms } from '@/lib/contentFilter'
import type { FinishSessionOptions } from '@/composables/useFinishSession'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** Everything's decided; save and finish the session. */
  finish: [options: FinishSessionOptions]
}>()

/**
 * Taps landing this soon after the sheet opens are ignored — a double tap on
 * the header's Finish button must not also press a button in the sheet.
 */
const MISCLICK_GUARD_MS = 400

const { t } = useI18n()
const activeSession = useActiveSessionStore()
const routines = useRoutinesStore()
const auth = useAuthStore()
const settings = useSettingsStore()

const template = computed(() => {
  const routineId = activeSession.session?.routineId
  if (!routineId) return undefined
  const result = routines.parsed(routineId)
  return result?.ok ? result.template : undefined
})

const routineName = computed(() => template.value?.name ?? t('session.finishSheet.thisRoutine'))

/** Exercises were added/removed, so a second step asks what to do with the routine. */
const routineChanged = computed(() => {
  const draft = activeSession.session?.draft
  return !!draft && !!template.value && sessionDiffersFromRoutine(draft, template.value)
})

const stats = computed(() => {
  const exercises = activeSession.session?.draft.exercises ?? []
  let totalSets = 0
  let completedSets = 0
  let completedExercises = 0
  let volume = 0
  for (const exercise of exercises) {
    const workingSets = exercise.loggedSets.filter((s) => s.type !== 'W')
    const doneSets = workingSets.filter((s) => s.completed)
    totalSets += workingSets.length
    completedSets += doneSets.length
    if (doneSets.length > 0) completedExercises++
    if (exercise.kind === 'reps') {
      for (const set of doneSets) volume += (set.weight ?? 0) * (set.reps ?? 0)
    }
  }
  return {
    totalSets,
    completedSets,
    completedExercises,
    totalExercises: exercises.length,
    volume,
    percent: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
  }
})

const unit = computed(() => activeSession.session?.draft.unit ?? '')
const remainingSets = computed(() => stats.value.totalSets - stats.value.completedSets)

const step = ref<'review' | 'routine' | 'save-new'>('review')
const sessionName = ref('')
const saveTarget = ref<SessionSaveTarget>('profile')
const shareToFeed = ref(true)
const newRoutineName = ref('')
const error = ref('')
let openedAt = 0

/**
 * Everything free-text a follower would read on the feed post. Names and
 * notes with a blocked term can't be shared (the workout still saves).
 */
const shareBlockedByFilter = computed(() => {
  const draft = activeSession.session?.draft
  if (!draft) return false
  return containsBlockedTerms(
    sessionName.value.trim() || draft.name,
    draft.notes,
    ...draft.exercises.flatMap((e) => [e.name, e.note]),
  )
})

/** Sharing needs an account and a synced (non-device-only) session. */
const shareEligible = computed(() => auth.isLoggedIn && saveTarget.value === 'profile')
const canShareToFeed = computed(() => shareEligible.value && !shareBlockedByFilter.value)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    openedAt = Date.now()
    step.value = 'review'
    sessionName.value = activeSession.session?.draft.name ?? ''
    saveTarget.value = settings.sessionSaveTarget
    shareToFeed.value = settings.shareToFeedDefault
    newRoutineName.value = t('session.finishSheet.editedSuffix', { name: routineName.value })
    error.value = ''
  },
)

const title = computed(() =>
  step.value === 'review' ? t('session.finishSheet.reviewTitle') : t('session.finishSheet.title'),
)

function tooSoon() {
  return Date.now() - openedAt < MISCLICK_GUARD_MS
}

function close() {
  emit('update:open', false)
}

function reviewedOptions(routineIdOverride?: string): FinishSessionOptions {
  return {
    routineIdOverride,
    name: sessionName.value,
    localOnly: isSupabaseConfigured && saveTarget.value === 'device',
    shareToFeed: canShareToFeed.value && shareToFeed.value,
  }
}

function finish(routineIdOverride?: string) {
  if (isSupabaseConfigured) settings.setSessionSaveTarget(saveTarget.value)
  if (canShareToFeed.value) settings.setShareToFeedDefault(shareToFeed.value)
  emit('finish', reviewedOptions(routineIdOverride))
}

function onReviewConfirm() {
  if (tooSoon()) return
  if (routineChanged.value) step.value = 'routine'
  else finish()
}

function onUpdate() {
  const session = activeSession.session
  if (!session || !template.value) return
  try {
    const draft = routineDraftFromSession(session.draft, template.value)
    routines.update(session.routineId, serializeTemplate(draft))
    finish()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function onSaveNew() {
  const session = activeSession.session
  if (!session || !template.value) return
  try {
    const draft = routineDraftFromSession(session.draft, template.value, newRoutineName.value)
    const stored = routines.add(serializeTemplate(draft), '')
    finish(stored.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

const targets = computed(() => [
  {
    value: 'profile' as const,
    icon: Cloud,
    title: t('session.finishSheet.targetProfile'),
    desc: auth.isLoggedIn
      ? t('session.finishSheet.targetProfileDesc')
      : t('session.finishSheet.targetProfileLoggedOutDesc'),
  },
  {
    value: 'device' as const,
    icon: Smartphone,
    title: t('session.finishSheet.targetDevice'),
    desc: t('session.finishSheet.targetDeviceDesc'),
  },
])
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="close">
    <template v-if="step === 'review'">
      <section class="summary" :aria-label="t('session.finishSheet.summaryAria')">
        <div class="summary__row">
          <div class="summary__time">
            <span class="label">{{ t('activeSession.elapsed') }}</span>
            <span class="summary__time-value">{{ formatClock(activeSession.elapsedSeconds) }}</span>
          </div>
          <div class="summary__chips">
            <span class="chip">
              {{
                t('activeSession.exercisesChip', {
                  done: stats.completedExercises,
                  total: stats.totalExercises,
                })
              }}
            </span>
            <span class="chip">
              {{ t('activeSession.setsChip', { done: stats.completedSets, total: stats.totalSets }) }}
            </span>
            <span v-if="stats.volume > 0" class="chip">
              {{ formatNumber(stats.volume) }} {{ unit }}
            </span>
          </div>
        </div>
        <div v-if="stats.totalSets > 0" class="summary__track">
          <div class="summary__fill" :style="{ width: stats.percent + '%' }" />
        </div>
      </section>

      <p v-if="stats.completedSets === 0" class="notice notice--strong" role="status">
        <TriangleAlert :size="16" :stroke-width="2.25" class="notice__icon" />
        {{ t('session.finishSheet.noSetsDone') }}
      </p>
      <p v-else-if="remainingSets > 0" class="notice" role="status">
        <TriangleAlert :size="16" :stroke-width="2.25" class="notice__icon" />
        {{ t('session.finishSheet.setsLeft', { count: remainingSets }, remainingSets) }}
      </p>

      <label class="field">
        <span class="label">{{ t('session.finishSheet.sessionName') }}</span>
        <input
          v-model="sessionName"
          type="text"
          maxlength="80"
          enterkeyhint="done"
          :placeholder="activeSession.session?.draft.name"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
      </label>

      <div v-if="isSupabaseConfigured" class="field">
        <span id="finish-save-target" class="label">{{ t('session.finishSheet.saveTo') }}</span>
        <div class="targets" role="radiogroup" aria-labelledby="finish-save-target">
          <button
            v-for="target in targets"
            :key="target.value"
            type="button"
            role="radio"
            class="target"
            :class="{ 'target--on': saveTarget === target.value }"
            :aria-checked="saveTarget === target.value"
            @click="saveTarget = target.value"
          >
            <span class="target__head">
              <component :is="target.icon" :size="18" :stroke-width="2.25" />
              <span class="target__check" aria-hidden="true">
                <Check v-if="saveTarget === target.value" :size="12" :stroke-width="3" />
              </span>
            </span>
            <span class="target__title">{{ target.title }}</span>
            <span class="target__desc">{{ target.desc }}</span>
          </button>
        </div>
      </div>

      <label v-if="canShareToFeed" class="share-toggle">
        <input v-model="shareToFeed" type="checkbox" />
        <span class="share-toggle__body">
          <span class="share-toggle__title">{{ t('session.finishSheet.shareToFeed') }}</span>
          <span class="share-toggle__desc">{{ t('session.finishSheet.shareToFeedDesc') }}</span>
        </span>
      </label>
      <p v-else-if="shareEligible && shareBlockedByFilter" class="notice" role="status">
        <TriangleAlert :size="16" :stroke-width="2.25" class="notice__icon" />
        {{ t('social.moderation.filter.share') }}
      </p>

      <div class="actions">
        <button type="button" class="secondary" @click="close">
          {{ t('session.finishSheet.keepTraining') }}
        </button>
        <button type="button" class="primary" @click="onReviewConfirm">
          <template v-if="routineChanged">
            {{ t('session.finishSheet.next') }}
            <ChevronRight :size="16" :stroke-width="2.5" />
          </template>
          <template v-else>
            <Check :size="16" :stroke-width="2.5" />
            {{ t('session.finishSheet.finishAndSave') }}
          </template>
        </button>
      </div>
    </template>

    <template v-else-if="step === 'routine'">
      <p class="hint">
        {{ t('session.finishSheet.changedHint', { name: routineName }) }}
      </p>

      <div class="choices">
        <button type="button" class="choice" @click="step = 'save-new'">
          <span class="choice__title">{{ t('session.finishSheet.saveNew') }}</span>
          <span class="choice__desc">{{ t('session.finishSheet.saveNewDesc', { name: routineName }) }}</span>
        </button>
        <button type="button" class="choice" @click="finish()">
          <span class="choice__title">{{ t('session.finishSheet.keepFinish') }}</span>
          <span class="choice__desc">{{ t('session.finishSheet.keepFinishDesc', { name: routineName }) }}</span>
        </button>
        <button type="button" class="choice" @click="onUpdate">
          <span class="choice__title">{{ t('session.finishSheet.update', { name: routineName }) }}</span>
          <span class="choice__desc">{{ t('session.finishSheet.updateDesc') }}</span>
        </button>
      </div>

      <div class="actions">
        <button type="button" class="secondary" @click="step = 'review'">
          {{ t('session.finishSheet.back') }}
        </button>
      </div>
    </template>

    <template v-else>
      <label class="field">
        <span class="label">{{ t('session.finishSheet.newRoutineName') }}</span>
        <input v-model="newRoutineName" type="text" maxlength="80" />
      </label>

      <div class="actions">
        <button type="button" class="secondary" @click="step = 'routine'">
          {{ t('session.finishSheet.back') }}
        </button>
        <button type="button" class="primary" :disabled="!newRoutineName.trim()" @click="onSaveNew">
          {{ t('session.finishSheet.saveAndFinish') }}
        </button>
      </div>
    </template>

    <p v-if="error" class="error">{{ error }}</p>
  </BottomSheet>
</template>

<style scoped>
/* The step before the summary: what you did so far, then one decision to make. */
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.summary__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
}

.summary__time {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-text);
}

.summary__time-value {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.summary__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.chip {
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
  background: var(--color-background-soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.summary__track {
  height: 4px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.summary__fill {
  height: 100%;
  border-radius: 2px;
  background: var(--color-accent);
}

/* A heads-up, not an alarm: sets left is a fact about the workout. */
.notice {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) 14px;
  border-radius: 14px;
  font-size: var(--text-small);
  line-height: 1.4;
  color: var(--color-heading);
  background: var(--color-background-soft);
}

.notice--strong {
  font-weight: var(--weight-bold);
}

.notice__icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field input[type='text'] {
  width: 100%;
  min-height: var(--size-control);
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  font: inherit;
  font-size: var(--text-body);
  color: var(--color-heading);
  background: var(--color-background-soft);
  outline: none;
}

.field input[type='text']:focus {
  border-color: var(--color-border-hover);
}

.targets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* The chosen place is marked by fill and outline; the accent is for the button below. */
.target {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  text-align: left;
  font: inherit;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.target--on {
  border-color: var(--color-heading);
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.target__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.target__check {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px var(--color-border-hover);
}

.target--on .target__check {
  color: var(--color-background);
  background: var(--color-heading);
  box-shadow: none;
}

.target__title {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.target__desc {
  font-size: var(--text-small);
  line-height: 1.35;
}

.share-toggle {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}

.share-toggle input {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  accent-color: var(--color-heading);
}

.share-toggle__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.share-toggle__title {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.share-toggle__desc {
  font-size: var(--text-small);
  line-height: 1.35;
}

.hint {
  font-size: var(--text-small);
  line-height: 1.45;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  text-align: left;
  font: inherit;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.choice:active {
  background: var(--color-background-mute);
}

.choice__title {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.choice__desc {
  font-size: var(--text-small);
  line-height: 1.35;
}

/* "Keep training" stays quiet beside the one accent on the sheet. */
.actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}

.secondary,
.primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--size-action);
  padding: 0 var(--space-5);
  border: none;
  border-radius: var(--radius-lg);
  font: inherit;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  cursor: pointer;
  transition: transform var(--motion-instant) ease-out;
}

.secondary:active,
.primary:active:not(:disabled) {
  transform: scale(0.97);
}

.secondary {
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.error {
  font-size: var(--text-small);
  color: var(--color-danger);
}
</style>
