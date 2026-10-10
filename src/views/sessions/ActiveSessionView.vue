<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, EllipsisVertical, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import FocusSession from '@/components/session/FocusSession.vue'
import ReorderExercisesSheet from '@/components/session/ReorderExercisesSheet.vue'
import FinishSessionSheet from '@/components/session/FinishSessionSheet.vue'
import ExerciseListSheet from '@/components/wtx/ExerciseListSheet.vue'
import PreSessionTransition from '@/components/session/PreSessionTransition.vue'
import PostSessionTransition from '@/components/session/PostSessionTransition.vue'
import GroupProgressStrip from '@/components/social/GroupProgressStrip.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useFinishSession, type FinishSessionOptions } from '@/composables/useFinishSession'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { AdService } from '@/services/ads'

const { t } = useI18n()
const router = useRouter()
const activeSession = useActiveSessionStore()
const { finishSession } = useFinishSession()

const draft = computed(() => activeSession.session?.draft)

/** Only the moment a workout truly starts, not every time this view is re-entered. */
const showIntro = ref(false)

/** Set once finishing, so the outro beat can outlive `draft` going null. */
const finishing = ref(false)
const finishedSessionId = ref<string | null>(null)

const menuOpen = ref(false)
function closeMenu() {
  menuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', closeMenu)
  // Pre-load now so it's ready to show the moment the workout finishes.
  AdService.loadInterstitial()
  // A freshly-started session is a few seconds old at most — resuming an
  // already-in-progress one (e.g. backgrounding and returning) shouldn't replay it.
  if (!prefersReducedMotion() && activeSession.elapsedSeconds < 2) showIntro.value = true
})
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/')
}

function onDiscard() {
  menuOpen.value = false
  if (!confirm(t('activeSession.discardConfirm'))) return
  activeSession.discard()
  router.replace('/')
}

const reorderOpen = ref(false)
function onReorder() {
  menuOpen.value = false
  reorderOpen.value = true
}

const addExerciseOpen = ref(false)
function onAddExercise() {
  menuOpen.value = false
  addExerciseOpen.value = true
}
function onPickExercise(name: string) {
  activeSession.addExercise(name)
  addExerciseOpen.value = false
}

function finishAndNavigate(options: FinishSessionOptions) {
  const stored = finishSession(options)
  if (prefersReducedMotion()) {
    router.replace({ name: 'session-complete', params: { id: stored.id } })
    return
  }
  finishedSessionId.value = stored.id
  finishing.value = true
}

function onFinishTransitionDone() {
  // The outro stays up until the summary has replaced this screen, so the
  // emptied workout underneath is never seen.
  const id = finishedSessionId.value
  if (!id) {
    finishing.value = false
    return
  }
  void router.replace({ name: 'session-complete', params: { id } })
}

/** Finishing always goes through a review step, so a stray tap can't end the workout. */
const finishSheetOpen = ref(false)
function onFinish() {
  menuOpen.value = false
  finishSheetOpen.value = true
}

function onFinishSheetChoice(options: FinishSessionOptions) {
  finishSheetOpen.value = false
  finishAndNavigate(options)
}

const roomId = computed(() => activeSession.session?.roomId)

/** In a group workout this opens its room; otherwise Friends, where group workouts start. */
function onStartGroupWorkout() {
  if (roomId.value) router.push({ name: 'room-lobby', params: { id: roomId.value } })
  else router.push({ name: 'social' })
}
</script>

<template>
  <AppPage sub fill :title="draft?.name || t('activeSession.fallbackTitle')">
    <template #leading>
      <button
        type="button"
        class="icon-btn icon-btn--lead"
        :aria-label="t('activeSession.backAria')"
        @click="goBack"
      >
        <ArrowLeft :size="22" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="draft" #actions>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('activeSession.groupAria')"
        @click="onStartGroupWorkout"
      >
        <Users :size="20" :stroke-width="2.25" />
      </button>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('activeSession.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="20" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item" @click="onAddExercise">
            {{ t('activeSession.addExercise') }}
          </button>
          <button
            type="button"
            class="menu__item"
            :disabled="draft.exercises.length < 2"
            @click="onReorder"
          >
            {{ t('activeSession.reorderExercises') }}
          </button>
          <button type="button" class="menu__item menu__item--danger" @click="onDiscard">
            {{ t('activeSession.discardWorkout') }}
          </button>
        </div>
      </div>
      <!-- Always reachable, but quiet: the dock's button becomes "Finish" once the sets are done. -->
      <button type="button" class="finish-btn" @click="onFinish">
        {{ t('activeSession.finish') }}
      </button>
    </template>

    <p v-if="!draft && !finishing" class="msg">
      {{ t('activeSession.noWorkout') }}
    </p>

    <template v-else-if="draft">
      <GroupProgressStrip v-if="roomId" :room-id="roomId" />

      <FocusSession @finish="onFinish" />

      <ReorderExercisesSheet v-model:open="reorderOpen" />
      <ExerciseListSheet
        :open="addExerciseOpen"
        @close="addExerciseOpen = false"
        @select="onPickExercise"
      />
      <FinishSessionSheet v-model:open="finishSheetOpen" @finish="onFinishSheetChoice" />
    </template>

    <PreSessionTransition
      v-if="showIntro && draft"
      :routine-name="draft.name"
      @done="showIntro = false"
    />
    <PostSessionTransition v-if="finishing" @done="onFinishTransitionDone" />
  </AppPage>
</template>

<style scoped>
/* Header controls stay quiet: on this screen the only loud thing is the dock's button. */
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

.icon-btn--lead {
  margin-left: -10px;
  color: var(--color-heading);
}

.menu {
  position: relative;
}

.finish-btn {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-pill);
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.menu__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
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

.menu__item:active {
  background: var(--color-background-mute);
}

.menu__item--danger {
  color: var(--color-danger);
}

.menu__item:disabled {
  opacity: 0.35;
  cursor: default;
  background: transparent;
}

.msg {
  font-size: var(--text-body);
}
</style>
