<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import { cleanSectionName, useRoutinesStore } from '@/stores/routines'
import { SECTION_NAME_MAX } from '@/lib/supabase/limits'
import { HapticsService } from '@/services/haptics'

/**
 * Makes a new routine section, or renames, recolours and deletes one.
 * Deleting never touches the routines in it: they go back to the unsorted list.
 */
const props = defineProps<{
  open: boolean
  /** The section to edit; `null` makes a new one. */
  sectionId: string | null
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  /** A new section was made (not emitted for edits). */
  created: [id: string]
}>()

const { t } = useI18n()
const routines = useRoutinesStore()

const section = computed(() => (props.sectionId ? routines.getSection(props.sectionId) : undefined))
const name = ref('')
const color = ref('')
const form = ref<HTMLFormElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = section.value?.name ?? ''
    color.value = section.value?.color ?? routines.nextSectionColor()
    // A new section starts with its name, so the field is ready to type in.
    if (!section.value) void nextTick(() => form.value?.querySelector('input')?.focus())
  },
  { immediate: true },
)

const canSave = computed(() => cleanSectionName(name.value).length > 0)
const count = computed(() =>
  section.value ? routines.list.filter((r) => r.sectionId === section.value!.id).length : 0,
)

function close() {
  emit('update:open', false)
}

function save() {
  if (!canSave.value) return
  if (section.value) {
    routines.updateSection(section.value.id, { name: name.value, color: color.value })
  } else {
    const created = routines.addSection(name.value, color.value)
    emit('created', created.id)
  }
  void HapticsService.selection()
  close()
}

function remove() {
  if (!section.value) return
  if (!confirm(t('sections.deleteConfirm', { name: section.value.name }, count.value))) return
  routines.removeSection(section.value.id)
  close()
}
</script>

<template>
  <BottomSheet :open="open" :title="section ? t('sections.editTitle') : t('sections.newTitle')" @close="close">
    <form ref="form" class="sheet" @submit.prevent="save">
      <AppInput
        v-model="name"
        :label="t('sections.nameLabel')"
        :placeholder="t('sections.namePlaceholder')"
        :maxlength="SECTION_NAME_MAX"
      />
      <div class="sheet__field">
        <span class="sheet__label">{{ t('sections.colorLabel') }}</span>
        <ColorPicker v-model="color" :label="t('sections.colorLabel')" />
      </div>
      <div class="sheet__actions">
        <AppButton size="lg" @click="close">{{ t('common.cancel') }}</AppButton>
        <AppButton type="submit" variant="primary" size="lg" block :disabled="!canSave">
          {{ section ? t('sections.save') : t('sections.create') }}
        </AppButton>
      </div>
      <AppButton v-if="section" variant="danger" block @click="remove">
        {{ t('sections.delete') }}
      </AppButton>
    </form>
  </BottomSheet>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 12px;
}

.sheet__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheet__label {
  font-size: 13px;
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.sheet__actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
}
</style>
