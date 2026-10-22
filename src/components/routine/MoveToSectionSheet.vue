<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Plus } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import SectionSheet from '@/components/routine/SectionSheet.vue'
import { useRoutinesStore } from '@/stores/routines'
import { HapticsService } from '@/services/haptics'

/** Files one routine under a section (or none), with a way to make the section on the spot. */
const props = defineProps<{ open: boolean; routineId: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const routines = useRoutinesStore()

const current = computed(() => routines.getById(props.routineId)?.sectionId ?? null)
const creating = ref(false)

function pick(sectionId: string | null) {
  routines.moveToSection(props.routineId, sectionId)
  void HapticsService.selection()
  emit('update:open', false)
}

function onCreated(id: string) {
  pick(id)
}
</script>

<template>
  <BottomSheet :open="open && !creating" :title="t('sections.moveTitle')" @close="emit('update:open', false)">
    <ul class="options" role="radiogroup" :aria-label="t('sections.moveTitle')">
      <li v-for="section in routines.sections" :key="section.id">
        <button
          type="button"
          class="option"
          role="radio"
          :aria-checked="current === section.id"
          @click="pick(section.id)"
        >
          <i class="option__dot" :style="{ background: section.color }" />
          <span class="option__name">{{ section.name }}</span>
          <Check v-if="current === section.id" :size="18" :stroke-width="2.5" />
        </button>
      </li>
      <li>
        <button type="button" class="option" role="radio" :aria-checked="current === null" @click="pick(null)">
          <i class="option__dot option__dot--none" />
          <span class="option__name">{{ t('sections.none') }}</span>
          <Check v-if="current === null" :size="18" :stroke-width="2.5" />
        </button>
      </li>
      <li>
        <button type="button" class="option option--new" @click="creating = true">
          <Plus :size="18" :stroke-width="2.5" />
          <span class="option__name">{{ t('sections.new') }}</span>
        </button>
      </li>
    </ul>
  </BottomSheet>
  <SectionSheet
    :open="open && creating"
    :section-id="null"
    @update:open="creating = false"
    @created="onCreated"
  />
</template>

<style scoped>
.options {
  list-style: none;
  padding: 0 0 12px;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 0 4px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  text-align: left;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.option:active {
  background: var(--color-background-mute);
}

.option__dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.option__dot--none {
  border: 2px solid var(--color-border-hover);
}

.option__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option--new {
  border-bottom: none;
  font-size: 15px;
  color: var(--color-text);
}
</style>
