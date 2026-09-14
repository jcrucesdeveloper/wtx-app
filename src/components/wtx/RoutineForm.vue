<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ChevronDown, EllipsisVertical, GripVertical } from '@lucide/vue'
import { VueDraggable } from 'vue-draggable-plus'
import { emptyExercise, type RoutineDraft, type RoutineDraftExercise } from '@/lib/serializeRoutine'
import { formatCompactDuration } from '@/lib/format'

const draft = defineModel<RoutineDraft>({ required: true })

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
 * expanded — and, if it has no name yet, in rename mode — only while it still
 * needs input right away.
 */
const expanded = reactive<Record<number, boolean>>({})
const renaming = reactive<Record<number, boolean>>({})
for (const exercise of draft.value.exercises) {
  if (!exercise.name.trim()) {
    expanded[keyFor(exercise)] = true
    renaming[keyFor(exercise)] = true
  }
}

function isExpanded(exercise: RoutineDraftExercise): boolean {
  return Boolean(expanded[keyFor(exercise)])
}

function toggleExpanded(exercise: RoutineDraftExercise) {
  const key = keyFor(exercise)
  expanded[key] = !expanded[key]
}

/** Renaming and removing an exercise both live behind its "⋯" menu. */
const menuOpenKey = ref<number | null>(null)
const nameInputs = new Map<number, HTMLInputElement>()

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

function setNameInputRef(exercise: RoutineDraftExercise, el: Element | null) {
  const key = keyFor(exercise)
  if (el) nameInputs.set(key, el as HTMLInputElement)
  else nameInputs.delete(key)
}

function isRenaming(exercise: RoutineDraftExercise): boolean {
  return Boolean(renaming[keyFor(exercise)])
}

async function startRenaming(exercise: RoutineDraftExercise) {
  const key = keyFor(exercise)
  renaming[key] = true
  menuOpenKey.value = null
  await nextTick()
  nameInputs.get(key)?.focus()
  nameInputs.get(key)?.select()
}

function stopRenaming(exercise: RoutineDraftExercise) {
  renaming[keyFor(exercise)] = false
}

async function addExercise() {
  const exercise = emptyExercise()
  draft.value.exercises.push(exercise)
  expanded[keyFor(exercise)] = true
  await startRenaming(exercise)
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
  if (exercise.weight !== undefined)
    parts.push(`${exercise.weight} ${draft.value.unit ?? ''}`.trim())
  return parts.join(' · ')
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}
</script>

<template>
  <div class="form">
    <label class="field">
      <span class="field__label">Routine name</span>
      <input v-model="draft.name" type="text" placeholder="Push Day" maxlength="80" />
    </label>

    <div class="row">
      <div class="field">
        <span class="field__label">Unit</span>
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
        <span class="field__label">Tags</span>
        <input v-model="tagsText" type="text" placeholder="push, upper" />
      </label>
    </div>

    <label class="field">
      <span class="field__label">Notes</span>
      <textarea v-model="draft.notes" rows="2" placeholder="Focuses mostly on chest." />
    </label>

    <div class="exercises">
      <div class="exercises__head">
        <span class="field__label">Exercises</span>
        <button type="button" class="add" @click="addExercise">+ Add</button>
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
            <button type="button" class="exercise__handle" aria-label="Drag to reorder" @click.stop>
              <GripVertical :size="16" :stroke-width="2" />
            </button>
            <span class="exercise__index">{{ i + 1 }}</span>

            <div class="exercise__title">
              <input
                v-if="isRenaming(exercise)"
                :ref="(el) => setNameInputRef(exercise, el as Element | null)"
                v-model="exercise.name"
                class="exercise__name"
                type="text"
                placeholder="Bench Press"
                @click.stop
                @keydown.enter.prevent="stopRenaming(exercise)"
                @blur="stopRenaming(exercise)"
              />
              <span v-else class="exercise__name-text">
                {{ exercise.name || 'Unnamed exercise' }}
              </span>
              <span v-if="!isExpanded(exercise)" class="exercise__summary">
                {{ summaryFor(exercise) }}
              </span>
            </div>

            <div class="exercise__menu">
              <button
                type="button"
                class="exercise__kebab"
                aria-label="Exercise options"
                @click.stop="toggleMenu(exercise)"
              >
                <EllipsisVertical :size="16" :stroke-width="2.25" />
              </button>
              <div v-if="isMenuOpen(exercise)" class="exercise__menu-panel" @click.stop>
                <button type="button" class="exercise__menu-item" @click="startRenaming(exercise)">
                  Rename
                </button>
                <button
                  type="button"
                  class="exercise__menu-item exercise__menu-item--danger"
                  :disabled="draft.exercises.length === 1"
                  @click="removeExercise(i)"
                >
                  Remove exercise
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
                Reps
              </button>
              <button
                type="button"
                :class="{ active: exercise.kind === 'time' }"
                @click="setKind(exercise, 'time')"
              >
                Time
              </button>
            </div>

            <div v-if="exercise.kind === 'reps'" class="row">
              <label class="field">
                <span class="field__label">Sets</span>
                <input v-model.number="exercise.sets" type="number" min="1" inputmode="numeric" />
              </label>
              <label class="field">
                <span class="field__label">Reps</span>
                <input v-model.number="exercise.reps" type="number" min="1" inputmode="numeric" />
              </label>
            </div>
            <label v-else class="field">
              <span class="field__label">Duration</span>
              <input
                :value="formatCompactDuration(exercise.durationSeconds)"
                type="text"
                placeholder="1m30s"
                @change="
                  exercise.durationSeconds = parseDuration(
                    ($event.target as HTMLInputElement).value,
                  )
                "
              />
            </label>

            <div class="row">
              <label class="field">
                <span class="field__label">Weight ({{ draft.unit || '—' }})</span>
                <input
                  :value="exercise.weight ?? ''"
                  type="number"
                  min="0"
                  step="0.25"
                  inputmode="decimal"
                  placeholder="optional"
                  @input="
                    exercise.weight = numberOrUndefined(($event.target as HTMLInputElement).value)
                  "
                />
              </label>
              <label class="field">
                <span class="field__label">Rest</span>
                <input
                  :value="formatCompactDuration(exercise.restSeconds ?? 0)"
                  type="text"
                  placeholder="1m30s"
                  @change="
                    exercise.restSeconds =
                      parseDuration(($event.target as HTMLInputElement).value) || undefined
                  "
                />
              </label>
            </div>

            <label class="field">
              <span class="field__label">Muscle group</span>
              <input
                v-model="exercise.muscleGroup"
                type="text"
                placeholder="optional, e.g. chest"
              />
            </label>
          </div>
        </div>
      </VueDraggable>
    </div>
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
  grid-template-columns: auto auto 1fr auto auto;
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

.exercise__name {
  padding: 3px 4px;
  margin: -3px -4px;
  border: 1px solid transparent;
  background: transparent;
  font-weight: 600;
  color: var(--color-heading);
}

.exercise__name:focus {
  border-color: var(--color-border);
  background: var(--color-background);
  outline: none;
}

.exercise__name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--color-heading);
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
</style>
