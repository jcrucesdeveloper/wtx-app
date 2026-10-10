<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Minus, Plus, Trophy } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import ExerciseImageSheet from '@/components/exercise/ExerciseImageSheet.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore } from '@/stores/sessions'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock, formatCompactDuration } from '@/lib/format'
import { HapticsService } from '@/services/haptics'
import { allTimeBestsByExercise } from '@/lib/sessionRecords'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'

/**
 * The active session as one focused step at a
 * time: the set you're on is the only large thing on screen, logging it is
 * the one big button under your thumb, and every other exercise is a single
 * line you can tap to jump to. Same store, same data, one tap per set.
 *
 * Nothing here waits on an animation: every tap changes state at once, and
 * motion only follows it. Celebration mid-workout is a line and a buzz, never
 * something to dismiss.
 */
defineProps<{
  /** The workout has just started: the screen arrives in sequence, once. */
  fresh?: boolean
}>()

const emit = defineEmits<{ finish: [] }>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const activeSession = useActiveSessionStore()

const draft = computed(() => activeSession.session?.draft)
const exercises = computed(() => draft.value?.exercises ?? [])
const unit = computed(() => draft.value?.unit ?? '')

function isDone(exercise: SessionExerciseDraft): boolean {
  return exercise.loggedSets.length > 0 && exercise.loggedSets.every((s) => s.completed)
}

const firstOpenIndex = computed(() => exercises.value.findIndex((e) => !isDone(e)))
const allDone = computed(() => exercises.value.length > 0 && firstOpenIndex.value === -1)

/** Set when the user taps another exercise; cleared once that exercise is finished. */
const pickedIndex = ref<number | null>(null)

const currentIndex = computed(() => {
  if (pickedIndex.value !== null && exercises.value[pickedIndex.value]) return pickedIndex.value
  return allDone.value ? exercises.value.length - 1 : Math.max(0, firstOpenIndex.value)
})
const current = computed(() => exercises.value[currentIndex.value])

/** Warm-ups/drop-sets show "W"/"D"; plain sets get sequential numbers, in array order. */
const labeledSets = computed(() => {
  let workingIndex = 0
  return (current.value?.loggedSets ?? []).map((set) => ({
    set,
    label: set.type === 'number' ? String(++workingIndex) : set.type,
  }))
})

/** Set when the user taps a later set to do it out of order. */
const pickedSetId = ref<string | null>(null)

const currentSet = computed(() => {
  const open = labeledSets.value.filter(({ set }) => !set.completed)
  return open.find(({ set }) => set.id === pickedSetId.value) ?? open[0]
})

/** What the set will be logged as: typed value, else last time's, else the plan. */
function shownWeight(set: SessionSetDraft): number {
  return set.weight ?? set.ghostWeight ?? current.value?.weight ?? 0
}
function shownReps(set: SessionSetDraft): number {
  return set.reps ?? set.ghostReps ?? current.value?.reps ?? 0
}

const isTime = computed(() => current.value?.kind === 'time')
const weightStep = computed(() => (unit.value === 'lb' ? 5 : 2.5))
const repsStep = computed(() => (isTime.value ? 5 : 1))

function update(patch: { weight?: number | null; reps?: number | null }) {
  if (!currentSet.value) return
  activeSession.updateSet(currentIndex.value, currentSet.value.set.id, patch)
}

/**
 * While a field has focus it shows exactly what was typed. Feeding the stored
 * number back in would rewrite a half-typed decimal ("72." is not a number yet).
 */
const editing = ref<'weight' | 'reps' | null>(null)
const typed = ref('')

function fieldValue(field: 'weight' | 'reps', set: SessionSetDraft): string | number {
  if (editing.value === field) return typed.value
  return field === 'weight' ? shownWeight(set) : shownReps(set)
}

function onFocus(field: 'weight' | 'reps', event: Event) {
  const input = event.target as HTMLInputElement
  typed.value = input.value
  editing.value = field
  // Selected, so typing replaces the number instead of adding to it.
  input.select()
}

function onInput(field: 'weight' | 'reps', event: Event) {
  const value = (event.target as HTMLInputElement).value
  typed.value = value
  update({ [field]: value.trim() === '' ? null : Number(value) })
}

function step(field: 'weight' | 'reps', delta: number) {
  if (!currentSet.value) return
  const from =
    field === 'weight' ? shownWeight(currentSet.value.set) : shownReps(currentSet.value.set)
  update({ [field]: Math.max(0, Math.round((from + delta) * 100) / 100) })
  void HapticsService.selection()
}

/** The set that was just logged, so its row can acknowledge it once. */
const justLoggedId = ref<string | null>(null)

// ----- a record, recognised the moment it is logged -----
const sessions = useSessionsStore()

/** All-time bests before this workout started. */
const priorBests = allTimeBestsByExercise(
  sessions.list.flatMap((stored) => {
    const result = sessions.parsed(stored.id)
    return result?.ok ? [result.session] : []
  }),
)

/** Sets logged today that beat the all-time best, so their chips can say so. */
const recordSetIds = ref(new Set<string>())
const recordFlash = ref<number | null>(null)
let recordTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Heavier than the all-time best, and heavier than anything already logged
 * for this exercise today — a second set at the same new weight is not news.
 * Same rule as the finish screen: only a strictly heavier weight counts, and
 * an exercise with no history has no record to beat.
 */
function isRecord(exercise: SessionExerciseDraft, weight: number): boolean {
  const prior = priorBests.get(exercise.name.trim().toLowerCase())
  if (!prior || weight <= prior.weight) return false
  return !exercise.loggedSets.some(
    (s) => s.completed && s.type !== 'W' && (s.weight ?? 0) >= weight,
  )
}

function logSet() {
  const target = currentSet.value
  if (!target) return
  const { set } = target
  const exercise = current.value
  // Logging commits whatever is on screen, so a set that needs no edits is one tap.
  if (set.weight === null || set.reps === null) {
    update({ weight: shownWeight(set), reps: shownReps(set) })
  }
  const record = !!exercise && set.type !== 'W' && isRecord(exercise, shownWeight(set))
  activeSession.completeSet(currentIndex.value, set.id)

  // One buzz per set, scaled to what just happened.
  if (record) {
    recordSetIds.value.add(set.id)
    recordFlash.value = shownWeight(set)
    clearTimeout(recordTimer)
    recordTimer = setTimeout(() => (recordFlash.value = null), 2800)
    void HapticsService.success()
  } else if (exercise && isDone(exercise)) {
    void HapticsService.medium()
  } else {
    void HapticsService.light()
  }

  pickedSetId.value = null
  justLoggedId.value = set.id
  setTimeout(() => {
    if (justLoggedId.value === set.id) justLoggedId.value = null
  }, 450)
}

function onSetTap(set: SessionSetDraft) {
  if (set.completed) activeSession.uncompleteSet(currentIndex.value, set.id)
  else pickedSetId.value = set.id
}

/** Working set, warm-up or drop set — tapping the label steps through them. */
function cycleType() {
  if (!currentSet.value) return
  activeSession.cycleSetType(currentIndex.value, currentSet.value.set.id)
  void HapticsService.selection()
}

function removeExercise() {
  const exercise = current.value
  if (!exercise) return
  const name = exerciseName(exercise.name)
  const logged = exercise.loggedSets.filter((s) => s.completed).length
  // One tap from the workout screen, so it always asks — and says what would be lost.
  const message =
    logged > 0
      ? t('session.activeExerciseCard.removeConfirm', { name, count: logged }, logged)
      : t('workout.removeConfirm', { name })
  if (!confirm(message)) return
  activeSession.removeExercise(currentIndex.value)
  pickedIndex.value = null
  pickedSetId.value = null
}

function focusExercise(index: number) {
  pickedIndex.value = index
  pickedSetId.value = null
}

/** The one button: log the set, move on once an exercise is done, finish at the end. */
const primary = computed<'log' | 'next' | 'finish'>(() => {
  if (currentSet.value) return 'log'
  return allDone.value ? 'finish' : 'next'
})

function onPrimary() {
  if (primary.value === 'log') logSet()
  else if (primary.value === 'next') pickedIndex.value = null
  else emit('finish')
}

const nextName = computed(() => {
  const next = exercises.value[firstOpenIndex.value]
  return next ? exerciseName(next.name) : ''
})

function summary(exercise: SessionExerciseDraft): string {
  const done = exercise.loggedSets.filter((s) => s.completed)
  if (done.length === exercise.loggedSets.length && done.length > 0) {
    const top = done.reduce((best, s) => ((s.weight ?? 0) > (best.weight ?? 0) ? s : best))
    return `${done.length} × ${top.reps} · ${top.weight} ${unit.value}`.trim()
  }
  if (done.length > 0) {
    return t('activeSession.setsChip', { done: done.length, total: exercise.loggedSets.length })
  }
  const plan =
    exercise.kind === 'time'
      ? formatCompactDuration(exercise.reps) || '0s'
      : `${exercise.sets} × ${exercise.reps}`
  return exercise.weight ? `${plan} · ${exercise.weight} ${unit.value}`.trim() : plan
}

const others = computed(() =>
  exercises.value
    .map((exercise, index) => ({ exercise, index, done: isDone(exercise) }))
    .filter((item) => item.index !== currentIndex.value),
)
const upcoming = computed(() => others.value.filter((item) => !item.done))
const finished = computed(() => others.value.filter((item) => item.done))

/** One segment per exercise, filled by the share of its sets that are logged. */
const segments = computed(() =>
  exercises.value.map((exercise) =>
    exercise.loggedSets.length
      ? exercise.loggedSets.filter((s) => s.completed).length / exercise.loggedSets.length
      : 0,
  ),
)

const resting = computed(() => activeSession.session?.restEndsAt != null)
const restFraction = computed(() => {
  const duration = activeSession.session?.restDurationSeconds
  if (!duration) return 0
  return Math.min(1, Math.max(0, activeSession.restRemainingSeconds / duration))
})

// ----- rest -----
/** The timer ran out on its own (not skipped): said once, briefly. */
const restOver = ref(false)
let restOverTimer: ReturnType<typeof setTimeout> | undefined
let restEndedByHand = false

watch(resting, (now, before) => {
  if (!before || now) return
  if (!restEndedByHand) {
    restOver.value = true
    clearTimeout(restOverTimer)
    restOverTimer = setTimeout(() => (restOver.value = false), 2600)
  }
  restEndedByHand = false
})

function adjustRest(seconds: number) {
  activeSession.adjustRestTimer(seconds)
  void HapticsService.selection()
}

function skipRest() {
  restEndedByHand = true
  activeSession.skipRestTimer()
  void HapticsService.selection()
}

onBeforeUnmount(() => {
  clearTimeout(recordTimer)
  clearTimeout(restOverTimer)
})

const showImage = ref(false)

function onNoteInput(event: Event) {
  activeSession.updateNote(currentIndex.value, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div v-if="current" class="session" :class="{ 'session--fresh': fresh }">
    <div class="progress">
      <div class="progress__segments" aria-hidden="true">
        <span v-for="(fraction, i) in segments" :key="i" class="progress__segment">
          <i :style="{ transform: `scaleX(${fraction})` }" />
        </span>
      </div>
      <div class="progress__row">
        <span>{{ t('workout.exerciseOf', { n: currentIndex + 1, total: exercises.length }) }}</span>
        <span class="progress__clock">{{ formatClock(activeSession.elapsedSeconds) }}</span>
      </div>
    </div>

    <!-- Keyed, so moving to another exercise arrives as a new thing. -->
    <section :key="currentIndex" class="now">
      <button type="button" class="now__exercise" @click="showImage = true">
        <ExerciseThumb :name="current.name" />
        <span class="now__name">{{ exerciseName(current.name) }}</span>
      </button>

      <template v-if="currentSet">
        <div class="now__meta">
          <p class="now__set">
            {{ t('workout.setOf', { n: currentSet.label, total: labeledSets.length }) }}
            <span v-if="currentSet.set.ghostWeight != null" class="now__last">
              ·
              {{
                t(currentSet.set.ghostFromLast ? 'workout.lastTimeSet' : 'workout.planSet', {
                  weight: currentSet.set.ghostWeight,
                  reps: currentSet.set.ghostReps,
                })
              }}
            </span>
          </p>
          <button
            type="button"
            class="now__type"
            :aria-label="t('workout.setTypeAria')"
            @click="cycleType"
          >
            {{ t(`workout.setType.${currentSet.set.type}`) }}
          </button>
        </div>

        <!-- Keyed by set: the next set's numbers arrive, they don't just change. -->
        <div :key="currentSet.set.id" class="fields">
          <div class="field">
            <button
              type="button"
              class="field__step"
              :aria-label="t('workout.less')"
              @click="step('weight', -weightStep)"
            >
              <Minus :size="20" :stroke-width="2.5" />
            </button>
            <label class="field__value">
              <!-- `row__input` only so the existing capture scripts still find it. -->
              <input
                class="field__input row__input"
                type="number"
                inputmode="decimal"
                :value="fieldValue('weight', currentSet.set)"
                @input="onInput('weight', $event)"
                @focus="onFocus('weight', $event)"
                @blur="editing = null"
              />
              <span class="field__unit">{{ unit || t('session.activeExerciseCard.weight') }}</span>
            </label>
            <button
              type="button"
              class="field__step"
              :aria-label="t('workout.more')"
              @click="step('weight', weightStep)"
            >
              <Plus :size="20" :stroke-width="2.5" />
            </button>
          </div>

          <div class="field">
            <button
              type="button"
              class="field__step"
              :aria-label="t('workout.less')"
              @click="step('reps', -repsStep)"
            >
              <Minus :size="20" :stroke-width="2.5" />
            </button>
            <label class="field__value">
              <input
                class="field__input"
                type="number"
                inputmode="numeric"
                :value="fieldValue('reps', currentSet.set)"
                @input="onInput('reps', $event)"
                @focus="onFocus('reps', $event)"
                @blur="editing = null"
              />
              <span class="field__unit">{{
                isTime
                  ? t('session.activeExerciseCard.seconds')
                  : t('session.activeExerciseCard.reps')
              }}</span>
            </label>
            <button
              type="button"
              class="field__step"
              :aria-label="t('workout.more')"
              @click="step('reps', repsStep)"
            >
              <Plus :size="20" :stroke-width="2.5" />
            </button>
          </div>
        </div>
      </template>

      <ul class="sets">
        <li v-for="{ set, label } in labeledSets" :key="set.id">
          <button
            type="button"
            class="set"
            :class="{
              'set--done': set.completed,
              'set--current': set.id === currentSet?.set.id,
              'set--just': set.id === justLoggedId,
            }"
            @click="onSetTap(set)"
          >
            <span class="set__mark">
              <Check v-if="set.completed" :size="14" :stroke-width="3" />
              <template v-else>{{ label }}</template>
            </span>
            <span class="set__value">{{ shownWeight(set) }} {{ unit }} × {{ shownReps(set) }}</span>
            <span v-if="recordSetIds.has(set.id)" class="set__pr">PR</span>
          </button>
        </li>
        <li>
          <button type="button" class="set set--add" @click="activeSession.addSet(currentIndex)">
            <span class="set__mark"><Plus :size="14" :stroke-width="2.5" /></span>
            <span class="set__value">{{ t('session.activeExerciseCard.addSet') }}</span>
          </button>
        </li>
      </ul>

      <input
        class="note"
        type="text"
        :placeholder="t('session.activeExerciseCard.notePlaceholder')"
        :value="current.note"
        @input="onNoteInput"
      />

      <button v-if="exercises.length > 1" type="button" class="remove" @click="removeExercise">
        {{ t('session.activeExerciseCard.removeExercise') }}
      </button>
    </section>

    <section v-if="upcoming.length">
      <h2 class="label">{{ t('workout.upNext') }}</h2>
      <ul class="list">
        <li v-for="item in upcoming" :key="item.index">
          <button type="button" class="item" @click="focusExercise(item.index)">
            <ExerciseThumb :name="item.exercise.name" />
            <span class="item__body">
              <span class="item__name">{{ exerciseName(item.exercise.name) }}</span>
              <span class="item__meta">{{ summary(item.exercise) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="finished.length">
      <h2 class="label">{{ t('sessions.done') }}</h2>
      <ul class="list">
        <li v-for="item in finished" :key="item.index">
          <button type="button" class="item item--done" @click="focusExercise(item.index)">
            <span class="item__check"><Check :size="16" :stroke-width="3" /></span>
            <span class="item__body">
              <span class="item__name">{{ exerciseName(item.exercise.name) }}</span>
              <span class="item__meta">{{ summary(item.exercise) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <div class="dock">
      <p v-if="recordFlash !== null" class="record" role="status">
        <Trophy :size="18" :stroke-width="2.25" />
        {{ t('workout.newRecord', { weight: recordFlash, unit }) }}
      </p>

      <p v-if="restOver && !resting" class="rest-over" role="status">{{ t('workout.restOver') }}</p>

      <div v-if="resting" class="rest">
        <span class="rest__track" aria-hidden="true">
          <i :style="{ transform: `scaleX(${restFraction})` }" />
        </span>
        <span class="rest__label">{{ t('session.restTimer.rest') }}</span>
        <span class="rest__time">{{ formatClock(activeSession.restRemainingSeconds) }}</span>
        <span class="rest__actions">
          <AppButton variant="quiet" size="sm" @click="adjustRest(-15)">−15</AppButton>
          <AppButton variant="quiet" size="sm" @click="adjustRest(15)">+15</AppButton>
          <AppButton variant="quiet" size="sm" @click="skipRest">
            {{ t('session.restTimer.skip') }}
          </AppButton>
        </span>
      </div>
      <!-- `row__check` only so the existing capture scripts still find it. -->
      <AppButton
        :variant="primary === 'next' ? 'quiet' : 'primary'"
        size="lg"
        block
        class="primary-action"
        :class="{ row__check: primary === 'log' }"
        @click="onPrimary"
      >
        <template v-if="primary === 'log'">
          <Check :size="20" :stroke-width="3" />
          {{ t('workout.logSet', { n: currentSet?.label }) }}
        </template>
        <template v-else-if="primary === 'next'">{{
          t('workout.nextExercise', { name: nextName })
        }}</template>
        <template v-else>
          <Check :size="20" :stroke-width="3" />
          {{ t('workout.finishWorkout') }}
        </template>
      </AppButton>
    </div>

    <ExerciseImageSheet :open="showImage" :name="current.name" @close="showImage = false" />
  </div>
</template>

<style scoped>
.session {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}

.label {
  margin-bottom: 10px;
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

/* Progress: shown once, at the top. */
.progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress__segments {
  display: flex;
  gap: 4px;
}

.progress__segment {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.progress__segment i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--color-accent);
  transform-origin: left;
}

.progress__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.progress__clock {
  color: var(--color-heading);
}

/* The set you're on. */
.now {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.now__exercise {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.now__name {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.now__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
}

.now__type {
  flex-shrink: 0;
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.remove {
  align-self: flex-start;
  min-height: var(--size-touch);
  border: none;
  padding: 0;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-danger);
  background: transparent;
  cursor: pointer;
}

.now__set {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-heading);
}

.now__last {
  font-weight: 400;
  color: var(--color-text);
}

.field {
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: center;
  height: 76px;
  border-radius: 16px;
  background: var(--color-background-soft);
}

.field__step {
  display: grid;
  place-items: center;
  height: 100%;
  border: none;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.field__step:active {
  color: var(--color-heading);
  transform: scale(0.9);
}

.field__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.field__input {
  /* Sized to its content so the unit sits right next to the number; a fixed
     width where the WebView doesn't support that yet. */
  width: 5ch;
  field-sizing: content;
  min-width: 1ch;
  max-width: 100%;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--color-heading);
  background: transparent;
  outline: none;
  font-variant-numeric: tabular-nums;
  appearance: textfield;
  -moz-appearance: textfield;
}

@supports (field-sizing: content) {
  .field__input {
    width: auto;
  }
}

.field__input::-webkit-outer-spin-button,
.field__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.field__unit {
  font-size: 15px;
  font-weight: 600;
}

/* Every set of this exercise, small: where you are in it, and a way to fix one. */
.sets {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  padding: 0;
}

.set {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.set__mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-background-mute);
}

.set--current {
  border-color: var(--color-heading);
  color: var(--color-heading);
}

.set--done {
  border-color: transparent;
  color: var(--color-heading);
  background: var(--color-background-soft);
}

.set--done .set__mark {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.set--add {
  border-style: dashed;
}

.note {
  height: 44px;
  margin-top: 4px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: var(--color-text);
  background: transparent;
  outline: none;
}

/* Everything else in the workout: one line each. */
.list {
  list-style: none;
  padding: 0;
  border-radius: 16px;
  background: var(--color-background-soft);
}

.list li + li {
  border-top: 1px solid var(--color-border);
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 12px 16px;
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.item__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-heading);
}

.item__meta {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.item__check {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

/* The dock: rest, and the one button, where the thumb already is. */
.dock {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: auto -20px -24px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.rest {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
}

.rest__track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.rest__track i {
  display: block;
  height: 100%;
  background: var(--color-heading);
  transform-origin: left;
}

.rest__label {
  font-size: 13px;
  font-weight: 600;
}

.rest__time {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.rest__actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fields-in var(--motion-quick) var(--ease-out);
}

.now {
  animation: now-in var(--motion-base) var(--ease-out);
}

.set__pr {
  margin-left: 2px;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  font-size: var(--text-micro);
  font-weight: var(--weight-heavy);
  color: var(--color-on-accent);
  background: var(--color-accent);
}

/* A record mid-workout: one line above the button, gone on its own. */
.record,
.rest-over {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  animation: note-in var(--motion-base) var(--ease-spring);
}

.record svg {
  color: var(--color-accent);
}

/* The start of a workout: the screen arrives in order, and is usable throughout. */
.session--fresh .progress,
.session--fresh .now__exercise,
.session--fresh .now__meta,
.session--fresh .sets {
  animation: session-rise var(--motion-base) var(--ease-out) both;
}

.session--fresh .now__exercise {
  animation-delay: calc(var(--motion-stagger) * 1);
}

.session--fresh .now__meta {
  animation-delay: calc(var(--motion-stagger) * 2);
}

.session--fresh .fields {
  animation: session-rise var(--motion-base) var(--ease-out) calc(var(--motion-stagger) * 3) both;
}

.session--fresh .sets {
  animation-delay: calc(var(--motion-stagger) * 4);
}

@keyframes fields-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes now-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
}

@keyframes note-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }
}

@keyframes session-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

/* Movement only. With reduced motion every state above still changes, instantly. */
@media (prefers-reduced-motion: no-preference) {
  .progress__segment i {
    transition: transform 0.3s var(--ease-out);
  }

  .rest__track i {
    transition: transform 1s linear;
  }

  .set--just .set__mark {
    animation: set-land 0.36s var(--ease-spring);
  }
}

@keyframes set-land {
  from {
    transform: scale(0.3);
  }
  to {
    transform: scale(1);
  }
}
</style>
