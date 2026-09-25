<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useRoutinesStore } from '@/stores/routines'
import { RoomError, useRoomStore } from '@/stores/room'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { parseTemplateText } from '@/lib/parseRoutine'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'

const { t } = useI18n()
const ui = useUiStore()
const { startSheetOpen, groupSheetOpen } = storeToRefs(ui)
const routines = useRoutinesStore()
const room = useRoomStore()
const router = useRouter()
const { startRoutine } = useStartRoutine()

const open = computed(() => startSheetOpen.value || groupSheetOpen.value)
const title = computed(() =>
  groupSheetOpen.value ? t('room.createTitle') : t('routine.startTrainingSheet.title'),
)

const creating = ref(false)
const groupError = ref('')

const items = computed(() =>
  routines.list.map((routine) => ({
    routine,
    result: parseTemplateText(routine.rawText),
  })),
)

async function pick(routineId: string) {
  if (!groupSheetOpen.value) {
    ui.close()
    startRoutine(routineId)
    return
  }

  if (creating.value) return
  creating.value = true
  groupError.value = ''
  try {
    const created = await room.create(routineId)
    ui.close()
    router.push({ name: 'room-lobby', params: { id: created.id } })
  } catch (e) {
    groupError.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    creating.value = false
  }
}

function goLoad() {
  ui.open('load')
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="ui.close()">
    <p v-if="groupSheetOpen" class="group-hint">
      {{ creating ? t('room.creating') : t('room.createHint') }}
    </p>
    <p v-if="groupSheetOpen && groupError" class="group-error">{{ groupError }}</p>

    <div v-if="!items.length" class="empty">
      <p class="empty__title">{{ t('routine.startTrainingSheet.emptyTitle') }}</p>
      <p class="empty__hint">
        {{ t('routine.startTrainingSheet.emptyHint', { ext: '.wtt' }) }}
      </p>
      <button type="button" class="empty__btn" @click="goLoad">
        {{ t('routine.startTrainingSheet.emptyBtn') }}
      </button>
    </div>

    <ul v-else class="list">
      <li v-for="{ routine, result } in items" :key="routine.id">
        <button v-if="result.ok" type="button" class="card" :disabled="creating" @click="pick(routine.id)">
          <span class="card__name">{{ result.template.name }}</span>
          <RoutineSummary :template="result.template" />
        </button>
        <span v-else class="card card--error">
          <span class="card__name">{{ routine.filename }}</span>
          <span class="card__error">{{ t('routine.startTrainingSheet.parseError') }}</span>
        </span>
      </li>
    </ul>
  </BottomSheet>
</template>

<style scoped>
.group-hint {
  font-size: 13px;
  opacity: 0.75;
  margin-top: -6px;
}

.group-error {
  font-size: 13px;
  color: #e11d48;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.card--error {
  cursor: default;
  border-left-color: var(--color-border);
}

.card__name {
  font-weight: 600;
  color: var(--color-heading);
}

.card__error {
  font-size: 13px;
  color: #e11d48;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 24px;
  text-align: center;
}

.empty__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
}

.empty__btn {
  margin-top: 14px;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
