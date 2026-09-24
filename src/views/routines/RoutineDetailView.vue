<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, EllipsisVertical, Play, Share2, SquarePen, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'
import StartRoutineButton from '@/components/routine/StartRoutineButton.vue'
import ShareRoutineSheet from '@/components/share/ShareRoutineSheet.vue'
import EditRoutineSheet from '@/components/wtx/EditRoutineSheet.vue'
import { useRoutinesStore } from '@/stores/routines'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { parseTemplateText } from '@/lib/parseRoutine'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const routines = useRoutinesStore()
const { startRoutine } = useStartRoutine()

const id = computed(() => String(route.params.id))
const routine = computed(() => routines.getById(id.value))
const result = computed(() => (routine.value ? parseTemplateText(routine.value.rawText) : null))

const shareName = computed(() => {
  if (!routine.value) return ''
  return result.value?.ok ? result.value.template.name : routine.value.filename
})

const showSource = ref(false)
const shareOpen = ref(false)
const editOpen = ref(false)
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/')
}

function onPlay() {
  if (!routine.value) return
  startRoutine(routine.value.id)
}

function onPlayWithFriends() {
  router.push({ name: 'social' })
}

function onDelete() {
  menuOpen.value = false
  if (!routine.value) return
  if (!confirm(t('routineDetail.deleteConfirm'))) return
  routines.remove(routine.value.id)
  router.replace('/')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.template.name : t('routineDetail.fallbackTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('routineDetail.backAria')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="routine && result" #actions>
      <button
        type="button"
        class="icon-btn icon-btn--primary"
        :aria-label="t('routineDetail.playAria')"
        @click="onPlay"
      >
        <Play :size="18" :stroke-width="2.25" fill="currentColor" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('routineDetail.playFriendsAria')"
        @click="onPlayWithFriends"
      >
        <Users :size="18" :stroke-width="2.25" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('routineDetail.editAria')"
        @click="editOpen = true"
      >
        <SquarePen :size="18" :stroke-width="2.25" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('routineDetail.shareAria')"
        @click="shareOpen = true"
      >
        <Share2 :size="18" :stroke-width="2.25" />
      </button>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('routineDetail.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="18" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item menu__item--danger" @click="onDelete">
            {{ t('routineDetail.deleteRoutine') }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="!routine" class="msg">{{ t('routineDetail.notFound') }}</p>

    <template v-else-if="result">
      <div v-if="result.ok" class="stack">
        <p v-if="result.template.notes" class="notes">{{ result.template.notes }}</p>
        <RoutineSummary :template="result.template" />

        <ExerciseList :exercises="result.template.exercises" :unit="result.template.unit" />

        <StartRoutineButton :routine-id="routine.id" />

        <button type="button" class="link" @click="showSource = !showSource">
          {{ showSource ? t('routineDetail.hideSource') : t('routineDetail.showSource') }}
        </button>
        <pre v-if="showSource" class="source">{{ routine.rawText }}</pre>
      </div>

      <div v-else class="stack">
        <p class="error">{{ result.error }}</p>
        <pre class="source">{{ routine.rawText }}</pre>
      </div>
    </template>

    <template v-if="routine">
      <ShareRoutineSheet v-model:open="shareOpen" :raw-text="routine.rawText" :name="shareName" />
      <EditRoutineSheet v-model:open="editOpen" :routine-id="routine.id" />
    </template>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

/* Pull the back button to the visual edge so the tap target still feels inset. */
.icon-btn:first-child {
  margin-left: -4px;
}

.icon-btn--primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.icon-btn--primary:active {
  background: var(--color-accent);
  opacity: 0.85;
}

.menu {
  position: relative;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.menu__item {
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

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--color-background-mute);
}

.menu__item--danger {
  color: #e11d48;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notes {
  font-size: 14px;
  opacity: 0.8;
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.link {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.source {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  overflow-x: auto;
  white-space: pre;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
