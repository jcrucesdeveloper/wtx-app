<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, EllipsisVertical, GripVertical, X } from '@lucide/vue'
import { VueDraggable } from 'vue-draggable-plus'
import {
  emptyExercise,
  type RoutineDraft,
  type RoutineDraftExercise,
  type RoutineDraftSet,
} from '@/lib/serializeRoutine'
import { formatCompactDuration } from '@/lib/format'
import { scrollFocusedIntoView } from '@/lib/scrollIntoViewOnFocus'
import ExerciseListSheet from '@/components/wtx/ExerciseListSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'

const draft = defineModel<RoutineDraft>({ required: true })

const { t } = useI18n()

const unitOptions = ['kg', 'lb'] as const

const tagsText = computed({
  get: () => draft.value.tags.join(', '),
  set: (value: string) => {
    draft.value.tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  },
})

/** Parses `1m30s`, `90s`, `2m`, `1:30` or a bare number of seconds. */
function parseDuration(input: string): number {
  const value = input.trim()
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const clock = /^(\d+):([0-5]?\d)$/.exec(value)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])
  const compact = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (compact && (compact[1] || compact[2] || compact[3])) {
    return Number(compact[1] ?? 0) * 3600 + Number(compact[2] ?? 0) * 60 + Number(compact[3] ?? 0)
  }
  return 0
}

/** Stable keys for draggable exercises, since drafts carry no id. */
const exerciseKeys = new WeakMap<RoutineDraftExercise, number>()
let nextExerciseKey = 0
function keyFor(exercise: RoutineDraftExercise): number {
  let key = exerciseKeys.get(exercise)
  if (key === undefined) {
    key = nextExerciseKey++
    exerciseKeys.set(exercise, key)
  }
  return key
}

/**
 * Exercise cards collapse to a one-line summary by default so editing a
 * routine with many exercises doesn't turn into one long form. A card starts
 * expanded only while it still needs input right away (no name yet).
 */
const expanded = reactive<Record<number, boolean>>({})
for (const exercise of draft.value.exercises) {
  if (!exercise.name.trim()) expanded[keyFor(exercise)] = true
}

function isExpanded(exercise: RoutineDraftExercise): boolean {
  return Boolean(expanded[keyFor(exercise)])
}

function toggleExpanded(exercise: RoutineDraftExercise) {
  const key = keyFor(exercise)
  expanded[key] = !expanded[key]
}

/** Removing an exercise lives behind its "⋯" menu. */
const menuOpenKey = ref<number | null>(null)

function isMenuOpen(exercise: RoutineDraftExercise): boolean {
  return menuOpenKey.value === keyFor(exercise)
}

function toggleMenu(exercise: RoutineDraftExercise) {
  const key = keyFor(exercise)
  menuOpenKey.value = menuOpenKey.value === key ? null : key
}

function closeMenu() {
  menuOpenKey.value = null
}

onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

/** Naming and renaming an exercise both go through the picker sheet. */
const pickerOpen = ref(false)
const pickerTarget = ref<RoutineDraftExercise | null>(null)

function openPicker(exercise: RoutineDraftExercise) {
  pickerTarget.value = exercise
  pickerOpen.value = true
  menuOpenKey.value = null
}

function onPickExercise(name: string) {
  if (pickerTarget.value) pickerTarget.value.name = name
  pickerOpen.value = false
}

function addExercise() {
  const exercise = emptyExercise()
  draft.value.exercises.push(exercise)
  expanded[keyFor(exercise)] = true
  openPicker(exercise)
}

function removeExercise(index: number) {
  draft.value.exercises.splice(index, 1)
  closeMenu()
}

function setKind(exercise: RoutineDraftExercise, kind: 'reps' | 'time') {
  exercise.kind = kind
}

/** Short one-line stand-in for a collapsed exercise's prescription. */
function summaryFor(exercise: RoutineDraftExercise): string {
  const parts: string[] = []
  parts.push(
    exercise.kind === 'time'
      ? formatCompactDuration(exercise.durationSeconds) || '0s'
      : `${exercise.sets || 0} × ${exercise.reps || 0}`,
  )
  if (exercise.kind === 'reps' && exercise.weight !== undefined)
    parts.push(`${exercise.weight} ${draft.value.unit ?? ''}`.trim())
  return parts.join(' · ')
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/**
 * One row per prescribed set, mirroring the active session's per-set rows.
 * Rows beyond the saved `setRows` (or when there are none yet) fall back to
 * the plain numbered default, without writing anything until touched.
 */
function displayRows(exercise: RoutineDraftExercise): RoutineDraftSet[] {
  const count = Math.max(0, Math.trunc(exercise.sets) || 0)
  return Array.from({ length: count }, (_, i) => exercise.setRows?.[i] ?? { type: 'number' })
}

/** Lazily grows `setRows` so row `index` exists, then returns it for mutation. */
function ensureRow(exercise: RoutineDraftExercise, index: number): RoutineDraftSet {
  if (!exercise.setRows) exercise.setRows = []
  while (exercise.setRows.length <= index) {
    exercise.setRows.push({ type: 'number' })
  }
  return exercise.setRows[index]!
}

/** Tapping a set's number cycles it through plain number → warm-up → drop set. */
function cycleSetType(exercise: RoutineDraftExercise, index: number) {
  const row = ensureRow(exercise, index)
  row.type = row.type === 'number' ? 'W' : row.type === 'W' ? 'D' : 'number'
}

function onSetWeightInput(exercise: RoutineDraftExercise, index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  ensureRow(exercise, index).weight = numberOrUndefined(value)
}

function onSetRepsInput(exercise: RoutineDraftExercise, index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value
  ensureRow(exercise, index).reps = numberOrUndefined(value)
}

function addSet(exercise: RoutineDraftExercise) {
  exercise.sets = (exercise.sets || 0) + 1
}

function removeSet(exercise: RoutineDraftExercise, index: number) {
  exercise.sets = Math.max(0, (exercise.sets || 0) - 1)
  exercise.setRows?.splice(index, 1)
}
</script>

<template>
  <div class="form">
    <label class="field">
      <span class="field__label">{{ t('wtx.routineForm.routineName') }}</span>
      <input
        v-model="draft.name"
        type="text"
        :placeholder="t('wtx.routineForm.routineNamePlaceholder')"
        maxlength="80"
        @focus="scrollFocusedIntoView"
      />
    </label>

    <div class="row">
      <div class="field">
        <span class="field__label">{{ t('wtx.routineForm.unit') }}</span>
        <div class="segmented">
          <button
            v-for="option in unitOptions"
            :key="option"
            type="button"
            :class="{ active: draft.unit === option }"
            @click="draft.unit = option"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <label class="field">
        <span class="field__label">{{ t('wtx.routineForm.tags') }}</span>
        <input
          v-model="tagsText"
          type="text"
          :placeholder="t('wtx.routineForm.tagsPlaceholder')"
          @focus="scrollFocusedIntoView"
        />
      </label>
    </div>

    <label class="field">
      <span class="field__label">{{ t('wtx.routineForm.notes') }}</span>
      <textarea
        v-model="draft.notes"
        rows="2"
        :placeholder="t('wtx.routineForm.notesPlaceholder')"
        @focus="scrollFocusedIntoView"
      />
    </label>

    <div class="exercises">
      <div class="exercises__head">
        <span class="field__label">{{ t('wtx.routineForm.exercises') }}</span>
        <button type="button" class="add" @click="addExercise">{{ t('wtx.routineForm.add') }}</button>
      </div>

      <VueDraggable
        v-model="draft.exercises"
        class="exercises__list"
        handle=".exercise__handle"
        ghost-class="exercise--ghost"
        drag-class="exercise--dragging"
        :animation="150"
      >
        <div
          v-for="(exercise, i) in draft.exercises"
          :key="keyFor(exercise)"
          class="exercise"
          :class="{ 'exercise--open': isExpanded(exercise) }"
        >
          <div class="exercise__top" @click="toggleExpanded(exercise)">
            <button
              type="button"
              class="exercise__handle"
              :aria-label="t('wtx.routineForm.dragAria')"
              @click.stop
            >
              <GripVertical :size="16" :stroke-width="2" />
            </button>
            <span class="exercise__index">{{ i + 1 }}</span>
            <ExerciseThumb :name="exercise.name" />

            <div class="exercise__title">
              <button type="button" class="exercise__name-text" @click.stop="openPicker(exercise)">
                {{ exercise.name || t('wtx.routineForm.unnamedExercise') }}
              </button>
              <span v-if="!isExpanded(exercise)" class="exercise__summary">
                {{ summaryFor(exercise) }}
              </span>
            </div>

            <div class="exercise__menu">
              <button
                type="button"
                class="exercise__kebab"
                :aria-label="t('wtx.routineForm.optionsAria')"
                @click.stop="toggleMenu(exercise)"
              >
                <EllipsisVertical :size="16" :stroke-width="2.25" />
              </button>
              <div v-if="isMenuOpen(exercise)" class="exercise__menu-panel" @click.stop>
                <button type="button" class="exercise__menu-item" @click="openPicker(exercise)">
                  {{ t('wtx.routineForm.changeExercise') }}
                </button>
                <button
                  type="button"
                  class="exercise__menu-item exercise__menu-item--danger"
                  :disabled="draft.exercises.length === 1"
                  @click="removeExercise(i)"
                >
                  {{ t('wtx.routineForm.removeExercise') }}
                </button>
              </div>
            </div>

            <ChevronDown class="exercise__chevron" :size="16" :stroke-width="2.25" />
          </div>

          <div v-if="isExpanded(exercise)" class="exercise__body">
            <div class="segmented">
              <button
                type="button"
                :class="{ active: exercise.kind === 'reps' }"
                @click="setKind(exercise, 'reps')"
              >
                {{ t('wtx.routineForm.reps') }}
              </button>
              <button
                type="button"
                :class="{ active: exercise.kind === 'time' }"
                @click="setKind(exercise, 'time')"
              >
                {{ t('wtx.routineForm.time') }}
              </button>
            </div>

            <label v-if="exercise.kind == 'time'" class="field">
              <span class="field__label">{{ t('wtx.routineForm.duration') }}</span>
              <input
                :value="formatCompactDuration(exercise.durationSeconds)"
                type="text"
                :placeholder="t('wtx.routineForm.durationPlaceholder')"
                @change="
                  exercise.durationSeconds = parseDuration(
                    ($event.target as HTMLInputElement).value,
                  )
                "
                @focus="scrollFocusedIntoView"
              />
            </label>

            <div v-if="exercise.kind === 'reps'" class="row">
              <label class="field">
                <span class="field__label">{{ t('wtx.routineForm.rest') }}</span>
                <input
                  :value="formatCompactDuration(exercise.restSeconds ?? 0)"
                  type="text"
                  :placeholder="t('wtx.routineForm.durationPlaceholder')"
                  @change="
                    exercise.restSeconds =
                      parseDuration(($event.target as HTMLInputElement).value) || undefined
                  "
                  @focus="scrollFocusedIntoView"
                />
              </label>
            </div>

            <div v-if="exercise.kind === 'reps'" class="sets">
              <div class="sets__head">
                <span />
                <span>{{ t('wtx.routineForm.weightWithUnit', { unit: draft.unit || '—' }) }}</span>
                <span>{{ t('wtx.routineForm.reps') }}</span>
                <span />
              </div>
              <div v-for="(row, si) in displayRows(exercise)" :key="si" class="sets__row">
                <button
                  type="button"
                  class="sets__label"
                  :class="{ 'sets__label--marked': row.type !== 'number' }"
                  :aria-label="t('wtx.routineForm.setTypeAria', { n: si + 1 })"
                  @click="cycleSetType(exercise, si)"
                >
                  {{ row.type === 'number' ? si + 1 : row.type }}
                </button>
                <input
                  class="sets__input"
                  type="number"
                  min="0"
                  step="0.25"
                  inputmode="decimal"
                  :placeholder="String(exercise.weight ?? 0)"
                  :value="row.weight ?? ''"
                  @input="onSetWeightInput(exercise, si, $event)"
                  @focus="scrollFocusedIntoView"
                />
                <input
                  class="sets__input"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  :placeholder="String(exercise.reps ?? 0)"
                  :value="row.reps ?? ''"
                  @input="onSetRepsInput(exercise, si, $event)"
                  @focus="scrollFocusedIntoView"
                />
                <button
                  type="button"
                  class="sets__remove"
                  :aria-label="t('wtx.routineForm.removeSetAria', { n: si + 1 })"
                  @click="removeSet(exercise, si)"
                >
                  <X :size="14" :stroke-width="2.25" />
                </button>
              </div>
              <button type="button" class="sets__add" @click="addSet(exercise)">
                {{ t('wtx.routineForm.addSet') }}
              </button>
            </div>
          </div>
        </div>
      </VueDraggable>
    </div>

    <ExerciseListSheet
      :open="pickerOpen"
      :initial-query="pickerTarget?.name ?? ''"
      @close="pickerOpen = false"
      @select="onPickExercise"
    />
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
}

input,
textarea {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  resize: vertical;
}

.exercises {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exercises__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add {
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.exercises__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exercise {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
}

.exercise--ghost {
  opacity: 0.4;
}

.exercise--dragging {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.exercise__top {
  display: grid;
  grid-template-columns: auto auto auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
}

.exercise__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
}

.exercise__handle:active {
  opacity: 1;
  background: var(--color-background-mute);
  cursor: grabbing;
}

.exercise__index {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.4;
}

.exercise__title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.exercise__name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--color-heading);
  max-width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.exercise__summary {
  font-size: 11px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.exercise__menu {
  position: relative;
}

.exercise__kebab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
}

.exercise__menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.exercise__menu-item {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.exercise__menu-item:hover,
.exercise__menu-item:focus-visible {
  background: var(--color-background-mute);
}

.exercise__menu-item--danger {
  color: #e11d48;
}

.exercise__menu-item:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: transparent;
}

.exercise__chevron {
  opacity: 0.45;
  transition: transform 0.15s ease;
}

.exercise--open .exercise__chevron {
  transform: rotate(180deg);
}

.exercise__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px 14px;
}

.segmented {
  display: inline-flex;
  align-self: flex-start;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}

.segmented button {
  border: none;
  background: transparent;
  padding: 5px 16px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.segmented button.active {
  background: var(--color-background);
  opacity: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.sets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sets__head {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 24px;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.5;
}

.sets__row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 24px;
  align-items: center;
  gap: 8px;
}

.sets__remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
}

.sets__remove:hover {
  opacity: 1;
  color: #e11d48;
  border-color: #e11d48;
}

.sets__add {
  align-self: flex-start;
  border: 1px dashed var(--color-border-hover);
  background: transparent;
  color: var(--color-text);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0.75;
}

.sets__add:hover {
  opacity: 1;
}

.sets__label {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  cursor: pointer;
}

.sets__label--marked {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
  opacity: 1;
}

.sets__input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  padding: 7px 8px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
</style>
