<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { EllipsisVertical, Play, Share2, SquarePen, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import RoutineSummary from '@/components/routine/RoutineSummary.vue'
import ExerciseList from '@/components/routine/ExerciseList.vue'
import AppButton from '@/components/ui/AppButton.vue'
import HeaderLink from '@/components/ui/HeaderLink.vue'
import ShareRoutineSheet from '@/components/share/ShareRoutineSheet.vue'
import EditRoutineSheet from '@/components/wtx/EditRoutineSheet.vue'
import { useRoutinesStore } from '@/stores/routines'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { useAuthStore } from '@/stores/auth'
import { RoomError, useRoomStore } from '@/stores/room'
import { isSupabaseConfigured } from '@/services/supabase'
import { parseTemplateText } from '@/lib/parseRoutine'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const routines = useRoutinesStore()
const { startRoutine } = useStartRoutine()
const auth = useAuthStore()
const room = useRoomStore()

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

function onPlay() {
  if (!routine.value) return
  startRoutine(routine.value.id)
}

const creatingRoom = ref(false)

/** Creates a group workout room from this routine — or sends logged-out users to Social first. */
async function onPlayWithFriends() {
  if (!routine.value || creatingRoom.value) return
  if (!isSupabaseConfigured || !auth.isLoggedIn) {
    router.push({ name: 'social' })
    return
  }
  creatingRoom.value = true
  try {
    const created = await room.create(routine.value.id)
    router.push({ name: 'room-lobby', params: { id: created.id } })
  } catch (e) {
    alert(t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`))
  } finally {
    creatingRoom.value = false
  }
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
  <AppPage sub fill :title="t('routineDetail.fallbackTitle')">
    <template #leading>
      <HeaderLink kind="back" />
    </template>
    <template v-if="routine && result" #actions>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('routineDetail.editAria')"
        @click="editOpen = true"
      >
        <SquarePen :size="20" :stroke-width="2.25" />
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('routineDetail.shareAria')"
        @click="shareOpen = true"
      >
        <Share2 :size="20" :stroke-width="2.25" />
      </button>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('routineDetail.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="20" :stroke-width="2.25" />
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
        <header class="head">
          <h2 class="head__name">{{ result.template.name }}</h2>
          <p v-if="result.template.notes" class="head__notes">{{ result.template.notes }}</p>
          <RoutineSummary :template="result.template" />
        </header>

        <ExerciseList :exercises="result.template.exercises" :unit="result.template.unit" />

        <!-- The routine is a text file; this is it. -->
        <section class="text">
          <button type="button" class="text__toggle" @click="showSource = !showSource">
            {{ showSource ? t('routineDetail.hideSource') : t('routineDetail.showSource') }}
          </button>
          <pre v-if="showSource" class="source">{{ routine.rawText }}</pre>
        </section>

        <!-- Where the thumb is: start alone, or with someone. -->
        <div class="dock">
          <AppButton
            size="lg"
            :aria-label="t('routineDetail.playFriendsAria')"
            :disabled="creatingRoom"
            @click="onPlayWithFriends"
          >
            <Users :size="20" :stroke-width="2.25" />
          </AppButton>
          <!-- `start-btn` only so the existing capture scripts still find it. -->
          <AppButton variant="primary" size="lg" block class="start-btn" @click="onPlay">
            <Play :size="16" :stroke-width="2.5" fill="currentColor" />
            {{ t('routine.startButton') }}
          </AppButton>
        </div>
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
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

.menu {
  position: relative;
  margin-right: -10px;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 10px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-soft);
  box-shadow: var(--elevation-overlay);
}

.menu__item {
  min-height: var(--size-touch);
  padding: 0 var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: var(--weight-medium);
  text-align: left;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.menu__item--danger {
  color: var(--color-danger);
}

.stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.head__name {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.head__notes {
  margin-top: -6px;
  font-size: var(--text-body);
}

.text__toggle {
  min-height: var(--size-touch);
  border: none;
  padding: 0;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.source {
  margin-top: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: var(--text-small);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--color-heading);
  background: var(--color-background-soft);
  user-select: text;
  -webkit-user-select: text;
}

.dock {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin: auto calc(var(--space-5) * -1) calc(var(--space-6) * -1);
  padding: var(--space-3) var(--space-5) var(--space-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.msg {
  font-size: var(--text-body);
}

.error {
  font-size: var(--text-small);
  color: var(--color-danger);
}
</style>
