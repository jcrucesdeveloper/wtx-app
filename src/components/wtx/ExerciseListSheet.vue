<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ExerciseThumb from '@/components/exercise/ExerciseThumb.vue'
import ExerciseImageSheet from '@/components/exercise/ExerciseImageSheet.vue'
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type EquipmentType,
  type ExerciseCatalogEntry,
  type MuscleGroup,
  filterExerciseCatalog,
  findCatalogEntryByName,
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
const selectedEquipment = ref<EquipmentType | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

/** Lets a plain vertical mouse wheel scroll a chip row, since it has no vertical overflow of its own. */
function onChipsWheel(event: WheelEvent) {
  const row = event.currentTarget as HTMLElement | null
  if (!row || event.deltaY === 0) return
  event.preventDefault()
  row.scrollLeft += event.deltaY
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = props.initialQuery ?? ''
    clearFilters()
    await nextTick()
    searchInput.value?.focus()
    searchInput.value?.select()
  },
)

/** Tapping the active chip clears that row's filter. */
function toggleGroup(group: MuscleGroup) {
  selectedGroup.value = selectedGroup.value === group ? null : group
}

function toggleEquipment(equipment: EquipmentType) {
  selectedEquipment.value = selectedEquipment.value === equipment ? null : equipment
}

function clearFilters() {
  selectedGroup.value = null
  selectedEquipment.value = null
}

const hasChipFilter = computed(() => selectedGroup.value !== null || selectedEquipment.value !== null)

function groupLabel(group: MuscleGroup) {
  return t(`wtx.muscleGroups.${group.toLowerCase()}`)
}

function equipmentLabel(equipment: EquipmentType) {
  return t(`wtx.equipment.${equipment.toLowerCase()}`)
}

/** Muscle and equipment tags, minus whichever a chip already fixes — every row would repeat it. */
function metaFor(entry: ExerciseCatalogEntry) {
  const parts: string[] = []
  if (!selectedGroup.value) parts.push(groupLabel(entry.muscleGroup))
  if (!selectedEquipment.value) parts.push(equipmentLabel(entry.equipment))
  return parts.join(' · ')
}

const trimmedQuery = computed(() => query.value.trim())
/** Query, muscle and equipment combine with AND, over the whole catalog. */
const filtered = computed(() =>
  filterExerciseCatalog(
    { query: query.value, muscleGroup: selectedGroup.value, equipment: selectedEquipment.value },
    RESULT_LIMIT,
  ),
)

/** Shown when nothing in the catalog is an exact (case-insensitive) match. */
const showCustomOption = computed(
  () => !!trimmedQuery.value && !findCatalogEntryByName(trimmedQuery.value),
)

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

      <div class="picker__filters">
        <span id="picker-filter-muscle" class="picker__filter-label">
          {{ t('wtx.exercisePicker.muscleLabel') }}
        </span>
        <div
          class="picker__chips"
          role="group"
          aria-labelledby="picker-filter-muscle"
          @wheel="onChipsWheel"
        >
          <button
            v-for="group in MUSCLE_GROUPS"
            :key="group"
            type="button"
            class="picker__chip"
            :class="{ active: selectedGroup === group }"
            :aria-pressed="selectedGroup === group"
            @click="toggleGroup(group)"
          >
            {{ groupLabel(group) }}
          </button>
        </div>

        <span id="picker-filter-equipment" class="picker__filter-label">
          {{ t('wtx.exercisePicker.equipmentLabel') }}
        </span>
        <div
          class="picker__chips"
          role="group"
          aria-labelledby="picker-filter-equipment"
          @wheel="onChipsWheel"
        >
          <button
            v-for="equipment in EQUIPMENT_TYPES"
            :key="equipment"
            type="button"
            class="picker__chip"
            :class="{ active: selectedEquipment === equipment }"
            :aria-pressed="selectedEquipment === equipment"
            @click="toggleEquipment(equipment)"
          >
            {{ equipmentLabel(equipment) }}
          </button>
        </div>
      </div>

      <div class="picker__summary" aria-live="polite">
        <span>{{ t('wtx.exercisePicker.resultCount', filtered.total) }}</span>
        <button v-if="hasChipFilter" type="button" class="picker__clear" @click="clearFilters">
          {{ t('wtx.exercisePicker.clearFilters') }}
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
        <li v-for="entry in filtered.results" :key="entry.id" class="picker__row">
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
            <span v-if="metaFor(entry)" class="picker__meta">{{ metaFor(entry) }}</span>
          </button>
        </li>
        <li v-if="filtered.total === 0" class="picker__empty">
          {{ t('wtx.exercisePicker.noResults') }}
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

/* Label column + chip column, so both rows' chips start at the same x. */
.picker__filters {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.picker__filter-label {
  font-size: var(--text-small);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.picker__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, black calc(100% - 16px), transparent);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 16px), transparent);
}

.picker__chips::-webkit-scrollbar {
  display: none;
}

.picker__chip {
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-small);
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
  opacity: 0.7;
  cursor: pointer;
  white-space: nowrap;
}

.picker__chip.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-background);
  opacity: 1;
}

.picker__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  margin-top: -4px;
  flex-shrink: 0;
  font-size: var(--text-small);
}

.picker__summary > span {
  opacity: 0.6;
}

.picker__clear {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-weight: 700;
  padding: 4px 0;
  cursor: pointer;
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
  min-width: 0;
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
  font-size: var(--text-small);
  opacity: 0.6;
  flex-shrink: 0;
}

.picker__empty {
  padding: 24px 12px;
  text-align: center;
  font-size: var(--text-small);
  opacity: 0.7;
}
</style>
