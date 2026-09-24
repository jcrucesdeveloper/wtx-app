<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { searchExerciseCatalog } from '@/lib/exercises/exerciseCatalog'

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
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = props.initialQuery ?? ''
    await nextTick()
    searchInput.value?.focus()
    searchInput.value?.select()
  },
)

const trimmedQuery = computed(() => query.value.trim())
const results = computed(() => searchExerciseCatalog(query.value))

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
        <li v-for="entry in results" :key="entry.id">
          <button type="button" class="picker__item" @click="choose(entry.name)">
            <span class="picker__name">{{ entry.name }}</span>
            <span class="picker__meta">{{ entry.muscleGroup }}</span>
          </button>
        </li>
      </ul>
    </div>
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
