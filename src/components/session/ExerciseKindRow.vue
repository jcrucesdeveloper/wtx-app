<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { HapticsService } from '@/services/haptics'

/**
 * The exercise menu's switch between tracking weight × reps and tracking
 * time. It's rarely needed — most exercises are one or the other for good —
 * so it lives in the menu rather than on the logging screen. Sets already
 * logged can't be converted (8 reps aren't 8 seconds), so with any logged it
 * says how many will be cleared and asks first.
 */
const props = defineProps<{ index: number }>()

const emit = defineEmits<{ switched: [] }>()

const { t } = useI18n()
const activeSession = useActiveSessionStore()

const exercise = computed(() => activeSession.session?.draft.exercises[props.index])
const target = computed(() => (exercise.value?.kind === 'time' ? 'reps' : 'time'))

function onClick() {
  const current = exercise.value
  if (!current) return
  const logged = current.loggedSets.filter((s) => s.completed).length
  if (logged > 0) {
    const message = t(`timedExercise.confirm.${target.value}`, { count: logged }, logged)
    if (!confirm(message)) return
  }
  activeSession.setExerciseKind(props.index, target.value)
  void HapticsService.selection()
  emit('switched')
}
</script>

<template>
  <SettingsRow
    v-if="exercise"
    action
    :label="t(`timedExercise.switchTo.${target}`)"
    :hint="t(`timedExercise.switchHint.${target}`)"
    @click="onClick"
  />
</template>
