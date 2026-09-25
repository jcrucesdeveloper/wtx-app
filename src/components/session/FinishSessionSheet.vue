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
const newRoutineName = ref('')
const error = ref('')
let openedAt = 0

watch(
  () => props.open,
  (open) => {
    if (!open) return
    openedAt = Date.now()
    step.value = 'review'
    sessionName.value = activeSession.session?.draft.name ?? ''
    saveTarget.value = settings.sessionSaveTarget
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
  }
}

function finish(routineIdOverride?: string) {
  if (isSupabaseConfigured) settings.setSessionSaveTarget(saveTarget.value)
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
.label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary__time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary__time-value {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-heading);
  line-height: 1.1;
}

.summary__chips {
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

.summary__track {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  overflow: hidden;
}

.summary__fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 13px;
  line-height: 1.4;
}

.notice--strong {
  border-color: #d97706;
  color: var(--color-heading);
}

.notice__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: #d97706;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

input {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-heading);
}

input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.targets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.target {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  text-align: left;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.target:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.target--on {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.target__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  opacity: 0.85;
}

.target--on .target__head {
  color: var(--color-accent);
  opacity: 1;
}

.target__check {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-hover);
}

.target--on .target__check {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.target__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-heading);
}

.target__desc {
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.65;
}

.hint {
  font-size: 13px;
  opacity: 0.75;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.choice:hover,
.choice:focus-visible {
  border-color: var(--color-border-hover);
}

.choice__title {
  font-weight: 600;
  color: var(--color-heading);
}

.choice__desc {
  font-size: 12px;
  opacity: 0.65;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.secondary {
  flex: 1;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  padding: 13px 12px;
  font-size: 14px;
  font-weight: 700;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.primary {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: var(--radius-md);
  padding: 13px 12px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-word;
}
</style>
