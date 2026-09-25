<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import ExerciseImageSheet from '@/components/exercise/ExerciseImageSheet.vue'
import {
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  type MuscleGroup,
  searchExerciseCatalog,
} from '@/lib/exercises/exerciseCatalog'
import { useExerciseName } from '@/composables/useExerciseName'

const RESULT_LIMIT = 50

const props = defineProps<{
  open: boolean
  /** Prefills and pre-selects the search field, e.g. the exercise's current name. */
  initialQuery?: string
}>()

const emit = defineEmits<{
  close: []
  select: [name: string]
}>()

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const query = ref('')
const selectedGroup = ref<MuscleGroup | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const categoriesEl = ref<HTMLElement | null>(null)

/** Lets a plain vertical mouse wheel scroll this row, since it has no vertical overflow of its own. */
function onCategoriesWheel(event: WheelEvent) {
  if (!categoriesEl.value || event.deltaY === 0) return
  event.preventDefault()
  categoriesEl.value.scrollLeft += event.deltaY
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = props.initialQuery ?? ''
    selectedGroup.value = null
    await nextTick()
    searchInput.value?.focus()
    searchInput.value?.select()
  },
)

function toggleGroup(group: MuscleGroup) {
  selectedGroup.value = selectedGroup.value === group ? null : group
}

function groupLabel(group: MuscleGroup) {
  return t(`wtx.muscleGroups.${group.toLowerCase()}`)
}

const trimmedQuery = computed(() => query.value.trim())
const results = computed(() => {
  if (!selectedGroup.value) return searchExerciseCatalog(query.value, RESULT_LIMIT)
  // Search the whole catalog (not just the default top-N slice) so groups
  // that sort later alphabetically, like Neck, aren't filtered down to nothing.
  return searchExerciseCatalog(query.value, EXERCISE_CATALOG.length)
    .filter((entry) => entry.muscleGroup === selectedGroup.value)
    .slice(0, RESULT_LIMIT)
})

/** Shown when nothing in the catalog is an exact (case-insensitive) match. */
const showCustomOption = computed(() => {
  if (!trimmedQuery.value) return false
  const needle = trimmedQuery.value.toLowerCase()
  return !results.value.some((entry) => entry.name.toLowerCase() === needle)
})

function choose(name: string) {
  emit('select', name)
  emit('close')
}

const previewName = ref<string | null>(null)
</script>

<template>
  <BottomSheet :open="open" :title="t('wtx.exercisePicker.title')" full-height @close="emit('close')">
    <div class="picker">
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        class="picker__search"
        :placeholder="t('wtx.exercisePicker.searchPlaceholder')"
        autocomplete="off"
      />

      <div ref="categoriesEl" class="picker__categories" @wheel="onCategoriesWheel">
        <button
          type="button"
          class="picker__category-chip"
          :class="{ active: selectedGroup === null }"
          @click="selectedGroup = null"
        >
          {{ t('wtx.exercisePicker.allCategories') }}
        </button>
        <button
          v-for="group in MUSCLE_GROUPS"
          :key="group"
          type="button"
          class="picker__category-chip"
          :class="{ active: selectedGroup === group }"
          @click="toggleGroup(group)"
        >
          {{ groupLabel(group) }}
        </button>
      </div>

      <ul class="picker__list">
        <li v-if="showCustomOption">
          <button
            type="button"
            class="picker__item picker__item--custom"
            @click="choose(trimmedQuery)"
          >
            {{ t('wtx.exercisePicker.useCustom', { query: trimmedQuery }) }}
          </button>
        </li>
        <li v-for="entry in results" :key="entry.id" class="picker__row">
          <button
            type="button"
            class="picker__thumb-btn"
            :aria-label="t('wtx.exercisePicker.previewAria', { name: entry.name })"
            @click="previewName = entry.name"
          >
            <ExerciseThumb :name="entry.name" />
          </button>
          <button type="button" class="picker__item" @click="choose(entry.name)">
            <span class="picker__name">{{ exerciseName(entry.name) }}</span>
            <span class="picker__meta">{{ groupLabel(entry.muscleGroup) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <ExerciseImageSheet
      :open="previewName !== null"
      :name="previewName ?? ''"
      @close="previewName = null"
    />
  </BottomSheet>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.picker__search {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.picker__categories {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent);
}

.picker__categories::-webkit-scrollbar {
  display: none;
}

.picker__category-chip {
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-text);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 6px 12px;
  border-radius: 999px;
  opacity: 0.7;
  cursor: pointer;
  white-space: nowrap;
}

.picker__category-chip.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-background);
  opacity: 1;
}

.picker__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.picker__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker__thumb-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.picker__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.picker__item--custom {
  border-color: var(--color-accent);
  font-weight: 600;
}

.picker__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker__meta {
  font-size: 11px;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  flex-shrink: 0;
}
</style>
