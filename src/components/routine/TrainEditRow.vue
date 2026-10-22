<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { GripVertical, Star, Trash2 } from '@lucide/vue'

/** One routine in the Train screen's edit mode: a handle to drag by, its star, and a bin. */
defineProps<{ name: string; meta: string; favorite: boolean }>()
const emit = defineEmits<{ favorite: []; remove: [] }>()

const { t } = useI18n()
</script>

<template>
  <li class="row">
    <span class="row__handle" :aria-label="t('session.reorderSheet.dragAria')">
      <GripVertical :size="20" :stroke-width="2" />
    </span>
    <span class="row__body">
      <span class="row__name">{{ name }}</span>
      <span class="row__meta">{{ meta }}</span>
    </span>
    <button
      type="button"
      class="row__star"
      :class="{ 'row__star--on': favorite }"
      :aria-label="`${t(favorite ? 'routineDetail.unfavoriteAria' : 'routineDetail.favoriteAria')}: ${name}`"
      :aria-pressed="favorite"
      @click="emit('favorite')"
    >
      <Star :size="20" :stroke-width="2" :fill="favorite ? 'currentColor' : 'none'" />
    </button>
    <button
      type="button"
      class="row__delete"
      :aria-label="`${t('routineDetail.deleteRoutine')}: ${name}`"
      @click="emit('remove')"
    >
      <Trash2 :size="18" :stroke-width="2" />
    </button>
  </li>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.row__handle {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 44px;
  margin-left: -8px;
  color: var(--color-text);
  cursor: grab;
  touch-action: none;
}

.row__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 0;
}

.row__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.row__meta {
  font-size: 13px;
}

/* A favourite is marked or unmarked here, away from the row's Start. */
.row__star {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.row__star--on {
  color: var(--color-heading);
}

.row__star:active {
  background: var(--color-background-mute);
}

.row__delete {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}
</style>
