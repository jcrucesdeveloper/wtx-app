<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { Download, GripVertical, Play, Plus, Trash2 } from '@lucide/vue'
import WeekStrip from '@/components/session/WeekStrip.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { parseTemplateText } from '@/lib/parseRoutine'
import { formatClock } from '@/lib/format'
import { sessionDateStrs } from '@/lib/sessionDates'
import { computeWeekStreak, sessionsThisWeek } from '@/lib/sessionStats'

/**
 * The Train screen, top to bottom:
 *   1. one line of status (your week), never a box of empty dots on its own;
 *   2. the one thing to do, above the fold: continue the workout in progress,
 *      or start the routine that is next in your rotation;
 *   3. every other routine, each still one tap from starting;
 *   4. the two ways to add a routine, as labelled buttons where the list ends.
 * Managing the list (reorder, delete) is a mode you enter with "Edit", so the
 * everyday screen carries no handles or bins.
 */
const { t, locale } = useI18n()
const router = useRouter()
const routines = useRoutinesStore()
const sessions = useSessionsStore()
const activeSession = useActiveSessionStore()
const ui = useUiStore()
const { startRoutine } = useStartRoutine()

const dateStrs = computed(() => sessionDateStrs(sessions))
const streak = computed(() => computeWeekStreak(dateStrs.value))
const weekCount = computed(() => sessionsThisWeek(dateStrs.value))

/** The week in one sentence: what you have, and what one workout would make it. */
const weekLine = computed(() => {
  if (!dateStrs.value.length) return { lead: t('train.weekFirst'), rest: '' }
  if (weekCount.value === 0) {
    return { lead: t('train.weekKeep', { count: streak.value + 1 }), rest: '' }
  }
  return {
    lead: t('session.streakRecap.weekInARow', { count: streak.value }, streak.value),
    rest: t('train.weekCount', { count: weekCount.value }, weekCount.value),
  }
})

const items = computed(() =>
  routines.list.map((routine) => {
    const result = parseTemplateText(routine.rawText)
    const last = sessions.list.find((s) => s.routineId === routine.id)
    const lastLabel = last
      ? new Date(last.addedAt).toLocaleDateString(locale.value, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : t('train.notDoneYet')
    return {
      id: routine.id,
      name: result.ok ? result.template.name : routine.filename,
      ok: result.ok,
      // When each routine was last done sits on its row, so the rotation is
      // something you can see rather than something you have to remember.
      meta: result.ok
        ? [
            t('routine.summary.exercise', { count: result.template.exerciseCount }, result.template.exerciseCount),
            ...(result.template.totalTime > 0 ? [`~${result.template.totalTimeHumanReadable}`] : []),
            lastLabel,
          ].join(' · ')
        : t('routines.parseError'),
      lastAt: last?.addedAt,
    }
  }),
)

/** The routine trained longest ago (or never): the likeliest one to be next in a rotation. */
const next = computed(() => {
  const startable = items.value.filter((item) => item.ok)
  if (!startable.length) return undefined
  return startable.reduce((oldest, item) => ((item.lastAt ?? 0) < (oldest.lastAt ?? 0) ? item : oldest))
})

/** A workout already running outranks any suggestion. */
const running = computed(() => (activeSession.isActive ? activeSession.session : null))

const rows = computed(() =>
  running.value ? items.value : items.value.filter((item) => item.id !== next.value?.id),
)

/** Edit mode lists every routine, the suggested one included, in its stored order. */
const editing = ref(false)

const ordered = computed({
  get: () => items.value,
  set: (value) =>
    routines.reorder(
      value.flatMap((item) => {
        const routine = routines.getById(item.id)
        return routine ? [routine] : []
      }),
    ),
})

function removeRoutine(id: string) {
  if (!confirm(t('routineDetail.deleteConfirm'))) return
  routines.remove(id)
  if (!routines.list.length) editing.value = false
}
</script>

<template>
  <div class="train">
    <section class="week">
      <p class="week__line">
        <b>{{ weekLine.lead }}</b>
        <template v-if="weekLine.rest"> · {{ weekLine.rest }}</template>
      </p>
      <WeekStrip :date-strs="dateStrs" small />
    </section>

    <button v-if="running" type="button" class="hero" @click="router.push({ name: 'active-session' })">
      <span class="hero__label"><i class="hero__dot" />{{ t('train.inProgress') }}</span>
      <span class="hero__name">{{ running.draft.name }}</span>
      <span class="hero__meta">{{ formatClock(activeSession.elapsedSeconds) }}</span>
      <span class="hero__action">{{ t('train.continue') }}</span>
    </button>

    <RouterLink v-else-if="next" :to="`/routines/${next.id}`" class="hero">
      <span class="hero__label">{{ t('train.nextUp') }}</span>
      <span class="hero__name">{{ next.name }}</span>
      <span class="hero__meta">{{ next.meta }}</span>
      <!-- `start-btn` only so the existing capture scripts still find it. -->
      <button type="button" class="hero__action start-btn" @click.stop.prevent="startRoutine(next.id)">
        <Play :size="16" :stroke-width="2.5" fill="currentColor" />
        {{ t('train.start') }}
      </button>
    </RouterLink>

    <section v-if="rows.length || editing">
      <div class="heading-row">
        <h2 class="heading">{{ t('routines.title') }}</h2>
        <button type="button" class="edit-toggle" @click="editing = !editing">
          {{ editing ? t('sessionComplete.done') : t('train.edit') }}
        </button>
      </div>

      <VueDraggable
        v-if="editing"
        v-model="ordered"
        tag="ul"
        class="list"
        handle=".row__handle"
        ghost-class="row--ghost"
        :animation="150"
      >
        <li v-for="item in ordered" :key="item.id" class="row">
          <span class="row__handle" :aria-label="t('session.reorderSheet.dragAria')">
            <GripVertical :size="20" :stroke-width="2" />
          </span>
          <span class="row__body">
            <span class="row__name">{{ item.name }}</span>
            <span class="row__meta">{{ item.meta }}</span>
          </span>
          <button
            type="button"
            class="row__delete"
            :aria-label="`${t('routineDetail.deleteRoutine')}: ${item.name}`"
            @click="removeRoutine(item.id)"
          >
            <Trash2 :size="18" :stroke-width="2" />
          </button>
        </li>
      </VueDraggable>

      <ul v-else class="list">
        <li v-for="item in rows" :key="item.id" class="row">
          <RouterLink :to="`/routines/${item.id}`" class="row__body">
            <span class="row__name">{{ item.name }}</span>
            <span class="row__meta">{{ item.meta }}</span>
          </RouterLink>
          <button
            v-if="item.ok"
            type="button"
            class="row__start"
            :aria-label="`${t('train.start')} ${item.name}`"
            @click="startRoutine(item.id)"
          >
            <Play :size="14" :stroke-width="2.5" fill="currentColor" />
            {{ t('train.start') }}
          </button>
        </li>
      </ul>
    </section>

    <div class="add">
      <button type="button" class="add__btn" @click="ui.open('create')">
        <Plus :size="18" :stroke-width="2.5" />
        {{ t('wtx.actions.create.title') }}
      </button>
      <button type="button" class="add__btn" @click="ui.open('load')">
        <Download :size="18" :stroke-width="2.25" />
        {{ t('wtx.actions.load.title') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Three text sizes on the whole screen: 28 (the one thing), 16, 13. */
.train {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Status, not a section: no box, so it never reads as an empty panel. */
.week {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week__line {
  font-size: 16px;
  line-height: 1.35;
}

.week__line b {
  font-weight: 700;
  color: var(--color-heading);
}

/* The only container on the screen, and the only accent on it. */
.hero {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px;
  border: none;
  border-radius: 20px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--color-background-soft);
  cursor: pointer;
}

.hero__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.hero__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
}

.hero__name {
  margin-top: 2px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.hero__meta {
  margin-top: 4px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.hero__action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 56px;
  margin-top: 18px;
  border: none;
  border-radius: 16px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-on-accent);
  background: var(--color-accent);
  cursor: pointer;
}

.hero__action:active {
  transform: scale(0.98);
}

.heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.edit-toggle {
  height: 44px;
  margin-right: -4px;
  padding: 0 4px;
  border: none;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

/* Edit mode: a handle to drag by, and a bin where Start was. */
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

.row--ghost {
  opacity: 0.4;
}

/* Rows on the page itself, divided by hairlines: grouped by space, not by a box. */
.list {
  list-style: none;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  border-bottom: 1px solid var(--color-border);
}

.row__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 12px 0;
  color: inherit;
}

.row__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.row__meta {
  font-size: 13px;
}

/* Still one tap to start any routine, without a second accent on the screen. */
.row__start {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: var(--color-background-mute);
  cursor: pointer;
}

.row__start:active {
  transform: scale(0.96);
}

/* Adding sits where the list ends, since that is what it grows. Outlined, so
   the two read as buttons without competing with Start. */
.add {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: -8px;
}

.add__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.add__btn:active {
  background: var(--color-background-mute);
}
</style>
