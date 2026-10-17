<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Minus,
  Plus,
  Trash2,
  Trophy,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import ExerciseListSheet from '@/components/wtx/ExerciseListSheet.vue'
import WorkoutOverviewSheet from '@/components/session/WorkoutOverviewSheet.vue'
import RestTimer from '@/components/session/RestTimer.vue'
import RestTimeButton from '@/components/session/RestTimeButton.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import ExerciseImageSheet from '@/components/exercise/ExerciseImageSheet.vue'
import TimedSetField from '@/components/session/TimedSetField.vue'
import ExerciseKindRow from '@/components/session/ExerciseKindRow.vue'
import SwipeToDelete from '@/components/session/SwipeToDelete.vue'
import { formatDurationInput } from '@/lib/durationInput'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore } from '@/stores/sessions'
import { useExerciseName } from '@/composables/useExerciseName'
import { formatClock } from '@/lib/format'
import { focusAndSelect, holdKeyboard, selectAll } from '@/lib/focusField'
import { scrollFocusedIntoView } from '@/lib/scrollIntoViewOnFocus'
import { HapticsService } from '@/services/haptics'
import { allTimeBestsByExercise, liveRecordSetIds } from '@/lib/sessionRecords'
import { focusAfterReorder } from '@/lib/sessionFocus'
import type { SessionExerciseDraft, SessionSetDraft } from '@/lib/serializeSession'

/**
 * The active session as one focused step at a time: the set you're on is the
 * only large thing on screen and logging it is the one big button under your
 * thumb. Under it, every set of the exercise is a row; above it, where you
 * are in the workout and a way to the exercise before and after. Nothing
 * that removes work sits in the scroll path: an exercise goes from its menu,
 * and asks first; a single set slides aside to show its Delete (or goes from
 * the same menu) and doesn't ask — it can be undone for a few seconds.
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

/** Under way: a set logged, or a number typed into one. */
function isStarted(exercise: SessionExerciseDraft): boolean {
  return exercise.loggedSets.some((s) => s.completed || s.weight !== null || s.reps !== null)
}

const firstOpenIndex = computed(() => exercises.value.findIndex((e) => !isDone(e)))
const allDone = computed(() => exercises.value.length > 0 && firstOpenIndex.value === -1)

/**
 * Set when the user taps another exercise; cleared once that exercise is
 * finished. The exercise itself, not its index, so it stays put when the
 * list is reordered around it.
 */
const pickedExercise = ref<SessionExerciseDraft | null>(null)
const pickedIndex = computed(() =>
  pickedExercise.value ? exercises.value.indexOf(pickedExercise.value) : -1,
)

const currentIndex = computed(() => {
  if (pickedIndex.value >= 0) return pickedIndex.value
  return allDone.value ? exercises.value.length - 1 : Math.max(0, firstOpenIndex.value)
})

// A reorder — the user's own, or a group host's — never moves the screen to
// another exercise: whatever is on it, half-typed set and all, stays.
watch(
  () => activeSession.session?.draft.exercises,
  (next, previous) => {
    if (!next || !previous || next === previous) return
    pickedExercise.value = focusAfterReorder(previous, next, pickedExercise.value, isDone, isStarted)
  },
)
const current = computed(() => exercises.value[currentIndex.value])

/** Warm-ups/drop-sets show "W"/"D"; plain sets get sequential numbers, in array order. */
const labeledSets = computed(() => {
  let workingIndex = 0
  return (current.value?.loggedSets ?? []).map((set) => ({
    set,
    label: set.type === 'number' ? String(++workingIndex) : set.type,
  }))
})

/**
 * Where the set you're on sits among its own kind: "Set 2 of 3" counts
 * working sets only, the way the rows are numbered, and a warm-up or drop set
 * is counted among the warm-ups or drop sets.
 */
const currentSetLine = computed(() => {
  const target = currentSet.value
  if (!target) return ''
  const sameType = labeledSets.value.filter(({ set }) => set.type === target.set.type)
  const n = sameType.findIndex(({ set }) => set.id === target.set.id) + 1
  if (target.set.type === 'number') return t('workout.setOf', { n, total: sameType.length })
  const type = t(`workout.setType.${target.set.type}`)
  return sameType.length > 1 ? t('workout.typedSetOf', { type, n, total: sameType.length }) : type
})

/**
 * Set when the user taps a row: a later set to do it out of order, or one
 * already logged to correct its numbers.
 */
const pickedSetId = ref<string | null>(null)

const currentSet = computed(() => {
  const picked = labeledSets.value.find(({ set }) => set.id === pickedSetId.value)
  return picked ?? labeledSets.value.find(({ set }) => !set.completed)
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
  selectAll(input)
  scrollFocusedIntoView(event as FocusEvent)
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

/**
 * Sets of this exercise that beat the all-time best, so their rows can say
 * so. Derived from the sets, so the marks are still there after a resume.
 */
const recordSetIds = computed(() => {
  const exercise = current.value
  if (!exercise) return new Set<string>()
  return liveRecordSetIds(
    exercise.loggedSets,
    priorBests.get(exercise.name.trim().toLowerCase()),
  )
})
const recordFlash = ref<number | null>(null)
let recordTimer: ReturnType<typeof setTimeout> | undefined

/** Logs the set you're on — or, from its own row, any other open set. */
function logSet(target = currentSet.value) {
  if (!target) return
  const { set } = target
  const exercise = current.value
  // Logging commits whatever is on screen, so a set that needs no edits is one tap.
  if (set.weight === null || set.reps === null) {
    activeSession.updateSet(currentIndex.value, set.id, {
      weight: shownWeight(set),
      reps: shownReps(set),
    })
  }
  activeSession.completeSet(currentIndex.value, set.id)
  const record = recordSetIds.value.has(set.id)

  // One buzz per set, scaled to what just happened.
  if (record) {
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

/** A row's check: logs that set, or takes a logged one back to fix it. */
function toggleSet(row: (typeof labeledSets.value)[number]) {
  if (!row.set.completed) return logSet(row)
  activeSession.uncompleteSet(currentIndex.value, row.set.id)
  pickedSetId.value = row.set.id
  void HapticsService.selection()
}

/**
 * Tapping a row, anywhere on it, makes it the set you're on. A logged set
 * stays logged: its numbers can be corrected in place.
 */
function pickSet(set: SessionSetDraft) {
  swipedSetId.value = null
  if (pickedSetId.value === set.id) return
  pickedSetId.value = set.id
  void HapticsService.selection()
}

const weightInput = useTemplateRef<HTMLInputElement>('weightInput')
const repsInput = useTemplateRef<HTMLInputElement>('repsInput')
/** A timed exercise has one field, its mm:ss time, inside its own component. */
const timedField = useTemplateRef<{ $el: Element }>('timedField')

/** Tapping a row's weight or reps: that set, with the number ready to type over. */
function editField(set: SessionSetDraft, field: 'weight' | 'reps') {
  const input = () =>
    isTime.value
      ? timedField.value?.$el.querySelector('input')
      : field === 'weight'
        ? weightInput.value
        : repsInput.value
  // Its fields are already on screen: focus them inside the tap.
  const onScreen = currentSet.value?.set.id === set.id
  // Otherwise they re-render for the new set; hold the keyboard open until they have.
  const release = onScreen
    ? null
    : holdKeyboard(field === 'weight' && !isTime.value ? 'decimal' : 'numeric')
  pickSet(set)
  if (!release) return void focusAndSelect(input())
  void nextTick(() => {
    focusAndSelect(input())
    release()
  })
}

/** Working set, warm-up or drop set — tapping the label steps through them. */
function cycleType() {
  if (!currentSet.value) return
  activeSession.cycleSetType(currentIndex.value, currentSet.value.set.id)
  void HapticsService.selection()
}

// ----- the exercise's own menu: swap it, or take it out -----
const actionsOpen = ref(false)
const swapOpen = ref(false)

function loggedCount(exercise: SessionExerciseDraft): number {
  return exercise.loggedSets.filter((s) => s.completed).length
}

function removeExercise() {
  actionsOpen.value = false
  const exercise = current.value
  if (!exercise) return
  const name = exerciseName(exercise.name)
  const logged = loggedCount(exercise)
  // It always asks — and says what would be lost.
  const message =
    logged > 0
      ? t('session.activeExerciseCard.removeConfirm', { name, count: logged }, logged)
      : t('workout.removeConfirm', { name })
  if (!confirm(message)) return
  activeSession.removeExercise(currentIndex.value)
  pickedExercise.value = null
  pickedSetId.value = null
}

function startSwap() {
  actionsOpen.value = false
  swapOpen.value = true
}

/**
 * Swaps the exercise in place. Sets already logged belong to the old
 * exercise and can't follow, so with any logged it asks first; with none
 * there is nothing to lose and it just happens.
 */
function onSwapPicked(name: string) {
  const exercise = current.value
  const index = currentIndex.value
  if (!exercise || name.trim().toLowerCase() === exercise.name.trim().toLowerCase()) return
  const logged = loggedCount(exercise)
  if (logged > 0) {
    const message = t(
      'workout.changeConfirm',
      { from: exerciseName(exercise.name), to: exerciseName(name), count: logged },
      logged,
    )
    if (!confirm(message)) return
  }
  activeSession.replaceExercise(index, name)
  // Stay on the slot that was swapped, wherever the workout would otherwise go next.
  pickedExercise.value = exercises.value[index] ?? null
  pickedSetId.value = null
}

// ----- deleting one set: no question first, an undo after -----

/** The row slid open to show its Delete — one at a time. */
const swipedSetId = ref<string | null>(null)

/** How long the undo stays offered after a set is deleted. */
const UNDO_MS = 8000

/** The set just deleted, while it can still be put back. */
const undo = ref<{
  exercise: SessionExerciseDraft
  exerciseIndex: number
  setId: string
  text: string
} | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined

/** The undo only stands while its exercise is still where it was. */
const undoable = computed(() => {
  const pending = undo.value
  return pending && exercises.value[pending.exerciseIndex] === pending.exercise ? pending : null
})

function deleteLabel(row: (typeof labeledSets.value)[number]): string {
  return t(`workout.deleteSetTyped.${row.set.type}`, { n: row.label })
}

/**
 * Deletes one set of the exercise on screen, logged or not. It doesn't ask:
 * it says what went, with an undo, for a few seconds. An exercise left with
 * no sets stays, waiting for one to be added.
 */
function deleteSet(setId: string) {
  const row = labeledSets.value.find(({ set }) => set.id === setId)
  const exercise = current.value
  const index = currentIndex.value
  if (!row || !exercise) return
  const text = t(`workout.setDeleted.${row.set.type}`, { n: row.label })

  activeSession.removeSet(index, setId)
  swipedSetId.value = null
  if (pickedSetId.value === setId) pickedSetId.value = null
  // Taking the last open set away finishes the exercise; stay on it rather
  // than jumping to the next one under the thumb that just deleted.
  if (pickedIndex.value === null && isDone(exercise)) pickedIndex.value = index

  undo.value = { exercise, exerciseIndex: index, setId, text }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => (undo.value = null), UNDO_MS)
  void HapticsService.medium()
}

function undoDelete() {
  const pending = undoable.value
  undo.value = null
  clearTimeout(undoTimer)
  if (!pending) return
  activeSession.restoreSet(pending.exerciseIndex, pending.setId)
  // Back where it was deleted, so the set is seen coming back.
  if (pending.exerciseIndex !== currentIndex.value) pickedIndex.value = pending.exerciseIndex
  void HapticsService.selection()
}

/** The visible way to the same delete: the exercise's menu, for the set you're on. */
function deleteFromMenu() {
  actionsOpen.value = false
  if (currentSet.value) deleteSet(currentSet.value.set.id)
}

const overviewOpen = ref(false)

function focusExercise(index: number) {
  pickedExercise.value = exercises.value[index] ?? null
  pickedSetId.value = null
  swipedSetId.value = null
}

/**
 * The one button: log the set, move on once an exercise is done, finish at
 * the end. An exercise left with no sets can only be given one.
 */
const primary = computed<'log' | 'edited' | 'add' | 'next' | 'finish'>(() => {
  // A logged set opened to correct it: the button closes it again.
  if (currentSet.value) return currentSet.value.set.completed ? 'edited' : 'log'
  if (current.value?.loggedSets.length === 0) return 'add'
  return allDone.value ? 'finish' : 'next'
})

function onPrimary() {
  if (primary.value === 'log') logSet()
  else if (primary.value === 'edited') pickedSetId.value = null
  else if (primary.value === 'add') activeSession.addSet(currentIndex.value)
  else if (primary.value === 'next') pickedExercise.value = null
  else emit('finish')
}

const nextName = computed(() => {
  const next = exercises.value[firstOpenIndex.value]
  return next ? exerciseName(next.name) : ''
})

/** One segment per exercise, filled by the share of its sets that are logged. */
const segments = computed(() =>
  exercises.value.map((exercise) =>
    exercise.loggedSets.length
      ? exercise.loggedSets.filter((s) => s.completed).length / exercise.loggedSets.length
      : 0,
  ),
)

onBeforeUnmount(() => {
  clearTimeout(recordTimer)
  clearTimeout(undoTimer)
})

const showImage = ref(false)

function onNoteInput(event: Event) {
  activeSession.updateNote(currentIndex.value, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div v-if="current" class="session" :class="{ 'session--fresh': fresh }">
    <!-- Where you are in the workout, and the way to the exercise before and after. -->
    <nav class="where" :aria-label="t('workout.overview')">
      <div class="where__row">
        <button
          v-if="exercises.length > 1"
          type="button"
          class="where__step"
          :aria-label="t('workout.previousExercise')"
          :disabled="currentIndex === 0"
          @click="focusExercise(currentIndex - 1)"
        >
          <ChevronLeft :size="24" :stroke-width="2.25" />
        </button>
        <component
          :is="exercises.length > 1 ? 'button' : 'div'"
          :type="exercises.length > 1 ? 'button' : undefined"
          class="where__now"
          @click="exercises.length > 1 && (overviewOpen = true)"
        >
          <span class="where__label">
            {{ t('workout.exerciseOf', { n: currentIndex + 1, total: exercises.length }) }}
            <ChevronDown v-if="exercises.length > 1" :size="16" :stroke-width="2.5" />
          </span>
          <span class="where__clock">{{ formatClock(activeSession.elapsedSeconds) }}</span>
        </component>
        <button
          v-if="exercises.length > 1"
          type="button"
          class="where__step"
          :aria-label="t('workout.followingExercise')"
          :disabled="currentIndex === exercises.length - 1"
          @click="focusExercise(currentIndex + 1)"
        >
          <ChevronRight :size="24" :stroke-width="2.25" />
        </button>
      </div>
      <div class="progress" aria-hidden="true">
        <span
          v-for="(fraction, i) in segments"
          :key="i"
          class="progress__segment"
          :class="{ 'progress__segment--current': i === currentIndex }"
        >
          <i :style="{ transform: `scaleX(${fraction})` }" />
        </span>
      </div>
    </nav>

    <!-- Keyed, so moving to another exercise arrives as a new thing. -->
    <section :key="currentIndex" class="now">
      <header class="now__head">
        <button type="button" class="now__exercise" @click="showImage = true">
          <ExerciseThumb :name="current.name" />
          <span class="now__name">{{ exerciseName(current.name) }}</span>
        </button>
        <button
          type="button"
          class="now__more"
          :aria-label="t('session.activeExerciseCard.optionsAria')"
          @click="actionsOpen = true"
        >
          <EllipsisVertical :size="22" :stroke-width="2.25" />
        </button>
      </header>

      <template v-if="currentSet">
        <div class="now__meta">
          <p class="now__set">
            {{ currentSetLine }}
          </p>
          <button
            type="button"
            class="now__type"
            :class="`now__type--${currentSet.set.type}`"
            :aria-label="t('workout.setTypeAria')"
            @click="cycleType"
          >
            {{ t(`workout.setType.${currentSet.set.type}`) }}
          </button>
        </div>

        <!-- Keyed by set: the next set's numbers arrive, they don't just change. -->
        <div v-if="!isTime" :key="currentSet.set.id" class="fields">
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
                ref="weightInput"
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
                ref="repsInput"
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
        <TimedSetField
          v-else
          ref="timedField"
          :key="`time-${currentSet.set.id}`"
          :seconds="shownReps(currentSet.set)"
          @update="update({ reps: $event })"
        />
      </template>

      <!-- Every set of this exercise, a row each: what it is, what you did last
           time, what it is logged as, and whether it is done. -->
      <div class="sets">
        <div v-if="labeledSets.length" class="sets__head" aria-hidden="true">
          <span>{{ t('workout.setColumn') }}</span>
          <span>{{ t('workout.previousColumn') }}</span>
          <span class="sets__num">{{
            isTime ? '' : unit || t('session.activeExerciseCard.weight')
          }}</span>
          <span class="sets__num">{{
            isTime ? t('timedExercise.time') : t('session.activeExerciseCard.reps')
          }}</span>
        </div>
        <p v-else class="sets__empty">{{ t('workout.noSets') }}</p>

        <ul class="sets__rows">
          <!-- Swiping a row left shows its Delete; the menu has the same, for the set you're on. -->
          <li
            v-for="row in labeledSets"
            :key="row.set.id"
            class="set"
            :class="{
              'set--done': row.set.completed,
              'set--current': row.set.id === currentSet?.set.id,
              'set--just': row.set.id === justLoggedId,
            }"
          >
            <SwipeToDelete
              :open="swipedSetId === row.set.id"
              :label="t('workout.deleteSet')"
              :action-label="t('workout.deleteSetAria', { label: row.label })"
              @update:open="swipedSetId = $event ? row.set.id : null"
              @delete="deleteSet(row.set.id)"
            >
              <div class="set__row" @click="pickSet(row.set)">
                <!-- The whole row picks the set; the button is what a keyboard or screen reader uses. -->
                <button
                  type="button"
                  class="set__main"
                  :aria-current="row.set.id === currentSet?.set.id ? 'true' : undefined"
                >
                  <span
                    class="set__tag"
                    :class="`set__tag--${row.set.type}`"
                    :title="t(`workout.setType.${row.set.type}`)"
                  >
                    {{ row.label }}
                  </span>
                  <span class="set__prev">
                    <template v-if="row.set.ghostFromLast && row.set.ghostWeight != null">
                      <template v-if="isTime">{{
                        formatDurationInput(row.set.ghostReps ?? 0)
                      }}</template>
                      <template v-else>{{ row.set.ghostWeight }} × {{ row.set.ghostReps }}</template>
                    </template>
                    <template v-else>–</template>
                  </span>
                  <span class="set__num" @click.stop="editField(row.set, 'weight')">
                    <span
                      v-if="recordSetIds.has(row.set.id)"
                      class="set__pr"
                      :aria-label="t('session.personalRecordBanner.title')"
                    >
                      PR
                    </span>
                    {{ isTime ? '–' : shownWeight(row.set) }}
                  </span>
                  <span class="set__num" @click.stop="editField(row.set, 'reps')">{{
                    isTime ? formatDurationInput(shownReps(row.set)) : shownReps(row.set)
                  }}</span>
                </button>
                <RestTimeButton :exercise-index="currentIndex" :set="row.set" />
                <button
                  type="button"
                  class="set__done"
                  :aria-label="t('session.activeSetRow.markCompleteAria')"
                  :aria-pressed="row.set.completed"
                  @click.stop="toggleSet(row)"
                >
                  <span class="set__mark">
                    <Check v-if="row.set.completed" :size="16" :stroke-width="3" />
                  </span>
                </button>
              </div>
            </SwipeToDelete>
          </li>
        </ul>

        <button type="button" class="sets__add" @click="activeSession.addSet(currentIndex)">
          <Plus :size="16" :stroke-width="2.5" />
          {{ t('session.activeExerciseCard.addSet') }}
        </button>
      </div>

      <input
        class="note"
        type="text"
        :placeholder="t('session.activeExerciseCard.notePlaceholder')"
        :value="current.note"
        @input="onNoteInput"
      />
    </section>

    <div class="dock">
      <p v-if="recordFlash !== null" class="record" role="status">
        <Trophy :size="18" :stroke-width="2.25" />
        {{ t('workout.newRecord', { weight: recordFlash, unit }) }}
      </p>

      <p v-if="undoable" class="undo" role="status">
        <Trash2 :size="18" :stroke-width="2.25" />
        <span class="undo__text">{{ undoable.text }}</span>
        <button type="button" class="undo__btn" @click="undoDelete">
          {{ t('workout.undo') }}
        </button>
      </p>

      <RestTimer />
      <!-- `row__check` only so the existing capture scripts still find it. -->
      <AppButton
        :variant="primary === 'log' || primary === 'finish' ? 'primary' : 'quiet'"
        size="lg"
        block
        class="primary-action"
        :class="{ row__check: primary === 'log' }"
        @click="onPrimary"
      >
        <template v-if="primary === 'log'">
          <Check :size="20" :stroke-width="3" />
          {{
            currentSet?.set.type === 'number'
              ? t('workout.logSet', { n: currentSet.label })
              : t(`workout.logSetType.${currentSet?.set.type}`)
          }}
        </template>
        <template v-else-if="primary === 'edited'">
          <Check :size="20" :stroke-width="3" />
          {{ t('workout.doneEditing') }}
        </template>
        <template v-else-if="primary === 'add'">
          <Plus :size="20" :stroke-width="2.5" />
          {{ t('session.activeExerciseCard.addSet') }}
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

    <WorkoutOverviewSheet
      :open="overviewOpen"
      :current-index="currentIndex"
      @close="overviewOpen = false"
      @select="focusExercise"
    />

    <!-- The exercise's menu. Removing lives here, two taps and a question away
         from the thumb that is logging sets. -->
    <BottomSheet
      :open="actionsOpen"
      :title="exerciseName(current.name)"
      @close="actionsOpen = false"
    >
      <div class="actions">
        <SettingsRow
          action
          :label="t('workout.changeExercise')"
          :hint="t('workout.changeExerciseHint')"
          @click="startSwap"
        />
        <ExerciseKindRow
          :index="currentIndex"
          @switched="((actionsOpen = false), (pickedSetId = null))"
        />
        <SettingsRow
          v-if="currentSet"
          action
          danger
          :label="deleteLabel(currentSet)"
          :hint="t('workout.deleteSetHint')"
          @click="deleteFromMenu"
        />
        <SettingsRow
          v-if="exercises.length > 1"
          action
          danger
          :label="t('session.activeExerciseCard.removeExercise')"
          :hint="t('workout.removeExerciseHint')"
          @click="removeExercise"
        />
      </div>
    </BottomSheet>

    <ExerciseListSheet :open="swapOpen" @close="swapOpen = false" @select="onSwapPicked" />
    <ExerciseImageSheet :open="showImage" :name="current.name" @close="showImage = false" />
  </div>
</template>

<style scoped>
.session {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  flex: 1;
}

/* Where you are: shown once, at the top, with a step either way. */
.where {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.where__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.where__step {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  color: var(--color-heading);
  background: var(--color-background-soft);
  cursor: pointer;
}

.where__step:active:not(:disabled) {
  background: var(--color-background-mute);
  transform: scale(0.94);
}

.where__step:disabled {
  opacity: 0.3;
  cursor: default;
}

.where__now {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  min-height: 48px;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  padding: 0;
  font: inherit;
  color: inherit;
  background: transparent;
  font-variant-numeric: tabular-nums;
}

button.where__now {
  cursor: pointer;
}

button.where__now:active {
  background: var(--color-background-soft);
}

.where__label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 15px;
  font-weight: var(--weight-bold);
  line-height: 1.3;
  color: var(--color-heading);
}

.where__clock {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  line-height: 1.3;
}

.progress {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 8px;
}

.progress__segment {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--color-background-mute);
  overflow: hidden;
}

/* The exercise on screen: a taller segment, so it is found without colour. */
.progress__segment--current {
  height: 8px;
  border-radius: 4px;
  background: var(--color-border-hover);
}

.progress__segment i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-accent);
  transform-origin: left;
}

/* The set you're on. */
.now {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: now-in var(--motion-base) var(--ease-out);
}

.now__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.now__exercise {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: var(--size-touch);
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.now__name {
  min-width: 0;
  font-size: 24px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
  overflow-wrap: anywhere;
  /* A very long name wraps, then stops: the sets stay on the first screen. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.now__more {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  margin-right: -10px;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.now__more:active {
  background: var(--color-background-mute);
}

.now__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: 6px;
}

.now__set {
  font-size: 14px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.now__type {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fields-in var(--motion-quick) var(--ease-out);
}

.field {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
  height: 76px;
  border-radius: var(--radius-lg);
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
  font-weight: var(--weight-heavy);
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
  font-weight: var(--weight-medium);
}

/* Every set of this exercise: where you are in it, and a way to fix one. The
   head and each row share one set of columns, so the numbers line up. */
.sets {
  /* Previous is only as wide as its text; the two numbers share the rest. */
  --set-columns: 36px 80px minmax(0, 1.4fr) minmax(0, 1fr);
  --rest-time-width: 60px;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.sets__head,
.set__main {
  display: grid;
  grid-template-columns: var(--set-columns);
  align-items: center;
  column-gap: var(--space-3);
}

.sets__head {
  /* Lines up with the rows: their inset on the left, their rest and check on the right. */
  padding: 0 calc(var(--rest-time-width) + var(--size-touch) + 2 * var(--space-1)) 0 var(--space-2);
  font-size: var(--text-micro);
  font-weight: var(--weight-medium);
}

.sets__num {
  text-align: center;
}

.sets__empty {
  padding: var(--space-3) 0;
  font-size: var(--text-small);
}

.sets__rows {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
}

.set__row {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--size-control);
  padding-left: var(--space-2);
  border-radius: var(--radius-md);
  font-variant-numeric: tabular-nums;
}

.set--current .set__row {
  background: var(--color-background-soft);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
}

.set__main {
  flex: 1;
  min-width: 0;
  min-height: var(--size-control);
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  font-size: var(--text-body);
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.set__tag {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: var(--text-small);
  font-weight: var(--weight-heavy);
  color: var(--color-heading);
  background: var(--color-background-mute);
}

/* A warm-up and a drop set carry their colour wherever the type is named. */
.now__type--W,
.set__tag--W {
  color: var(--color-set-warmup);
  background: var(--color-set-warmup-soft);
}

.now__type--D,
.set__tag--D {
  color: var(--color-set-drop);
  background: var(--color-set-drop-soft);
}

.set__prev {
  font-size: var(--text-small);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.set__num {
  /* The full row height, so the whole cell is the tap that edits the number. */
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: var(--weight-medium);
}

/* What is logged, and what you are about to log, reads as fact; the rest waits. */
.set--done .set__num,
.set--current .set__num {
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.set__pr {
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  font-size: var(--text-micro);
  font-weight: var(--weight-heavy);
  line-height: 1.3;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.set__done {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-control);
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.set__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px var(--color-border-hover);
}

.set__done:active .set__mark {
  transform: scale(0.9);
}

.set--done .set__mark {
  color: var(--color-on-accent);
  background: var(--color-accent);
  box-shadow: none;
}

.sets__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--size-touch);
  margin-top: var(--space-1);
  border: 1px dashed var(--color-border-hover);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.sets__add:active {
  color: var(--color-heading);
  background: var(--color-background-soft);
}

.note {
  height: var(--size-touch);
  margin-top: var(--space-1);
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: var(--color-text);
  background: transparent;
  outline: none;
}

/* The exercise's menu, in its sheet. */
.actions {
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  overflow: hidden;
}

.actions > :deep(* + *) {
  border-top: 1px solid var(--color-border);
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

/* A set just deleted: what went, and the way back, for a few seconds. Quiet,
   like the record line, so it never reads as the button under it. */
.undo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-touch);
  padding-left: var(--space-3);
  border-radius: var(--radius-lg);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-soft);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  animation: note-in var(--motion-base) var(--ease-spring);
}

.undo__text {
  flex: 1;
  min-width: 0;
}

/* The same pill as the rest timer's buttons, so it reads as part of the dock. */
.undo__btn {
  flex-shrink: 0;
  min-width: var(--size-touch);
  height: 36px;
  margin-right: 4px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: 15px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.undo__btn:active {
  transform: scale(0.94);
}

/* A record mid-workout: one line above the button, gone on its own. */
.record {
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
.session--fresh .where,
.session--fresh .now__head,
.session--fresh .now__meta,
.session--fresh .sets {
  animation: session-rise var(--motion-base) var(--ease-out) both;
}

.session--fresh .now__head {
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
