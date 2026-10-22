<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import { ChevronDown, Download, GripVertical, Pencil, Play, Plus } from '@lucide/vue'
import WeekStrip from '@/components/session/WeekStrip.vue'
import SectionSheet from '@/components/routine/SectionSheet.vue'
import TrainEditRow from '@/components/routine/TrainEditRow.vue'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useRoutinesStore, type RoutineSection } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useUiStore } from '@/stores/ui'
import { useStartRoutine } from '@/composables/useStartRoutine'
import { parseTemplateText } from '@/lib/parseRoutine'
import { formatClock } from '@/lib/format'
import { HapticsService } from '@/services/haptics'
import { sessionDateStrs } from '@/lib/sessionDates'
import { computeWeekStreak, sessionsThisWeek, streakRepair } from '@/lib/sessionStats'

/**
 * The Train screen, top to bottom:
 *   1. one line of status (your week), never a box of empty dots on its own;
 *   2. the one thing to do, above the fold: continue the workout in progress,
 *      or start the routine that is next in your rotation;
 *   3. your favourite routines, then your sections (if you made any), then
 *      every other one, each still one tap from starting;
 *   4. the two ways to add a routine, as labelled buttons where the list ends.
 * Managing the list (reorder, favourite, sort into sections, delete) is a
 * mode you enter with "Edit", so the everyday screen carries no handles,
 * stars to hit or bins.
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

/**
 * Nothing logged yet: instead of an empty week, the first steps — and the
 * first of them is already done, because the starter routines are here.
 */
const firstRun = computed(() => dateStrs.value.length === 0)
const firstSteps = computed(() => [
  { label: t('train.stepRoutines'), done: true },
  { label: t('train.stepStart'), done: activeSession.isActive },
  { label: t('train.stepFinish'), done: false },
])
const firstDone = computed(() => firstSteps.value.filter((step) => step.done).length)

/** The week in one sentence: what you have, and what one workout would make it. */
const weekLine = computed(() => {
  // A run missed by a single week can still be picked back up: say how.
  const repair = streakRepair(dateStrs.value)
  if (repair) {
    return {
      lead: t(repair.needed > 1 ? 'train.repairTwo' : 'train.repairOne', { count: repair.weeks }),
      rest: '',
    }
  }
  // A run that ended is not mentioned: the screen just offers the next one.
  if (streak.value === 0) return { lead: t('train.weekFresh'), rest: '' }
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
      favorite: routines.isFavorite(routine.id),
      sectionId: routine.sectionId,
      sectionColor: routine.sectionId ? routines.getSection(routine.sectionId)?.color : undefined,
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

/**
 * The routine trained longest ago (or never): the likeliest one to be next in
 * a rotation. Favourites, when there are any, are the rotation — otherwise a
 * routine you keep around but never do would be suggested every single day.
 */
const next = computed(() => {
  const ok = items.value.filter((item) => item.ok)
  const favorites = ok.filter((item) => item.favorite)
  const startable = favorites.length ? favorites : ok
  if (!startable.length) return undefined
  return startable.reduce((oldest, item) => ((item.lastAt ?? 0) < (oldest.lastAt ?? 0) ? item : oldest))
})

/** A workout already running outranks any suggestion. */
const running = computed(() => (activeSession.isActive ? activeSession.session : null))

const rows = computed(() =>
  running.value ? items.value : items.value.filter((item) => item.id !== next.value?.id),
)

/**
 * Favourites get their own group above the rest, then each section you made,
 * then whatever is in neither — each keeping the order you gave the list.
 * A section always lists every routine filed in it, the suggested one and
 * favourites included: it is the account's layout (synced), so it reads the
 * same on every device, while Favourites is this device's shortcut on top.
 */
interface Group {
  key: string
  title: string
  items: typeof rows.value
  section?: RoutineSection
}

const groups = computed<Group[]>(() => {
  const favorites = rows.value.filter((item) => item.favorite)
  const sectionIds = new Set(routines.sections.map((s) => s.id))
  const sectionGroups = routines.sections.map((section) => ({
    key: section.id,
    title: section.name,
    items: items.value.filter((item) => item.sectionId === section.id),
    section,
  }))
  const others = rows.value.filter(
    (item) => !item.favorite && (!item.sectionId || !sectionIds.has(item.sectionId)),
  )
  // The whole section's heading and its Edit button sit on the first group.
  if (!favorites.length && !sectionGroups.length) return [{ key: 'all', title: t('routines.title'), items: others }]
  return [
    ...(favorites.length ? [{ key: 'favorites', title: t('train.favorites'), items: favorites }] : []),
    ...sectionGroups,
    ...(others.length ? [{ key: 'others', title: t('train.otherRoutines'), items: others }] : []),
  ]
})

/** Sections folded shut on this device — a view preference, so it stays here and never syncs. */
const COLLAPSED_KEY = 'wtx:collapsedSections'
function readCollapsed(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}
const collapsed = ref<string[]>(readCollapsed())
watch(collapsed, (value) => {
  try {
    const live = value.filter((id) => routines.getSection(id))
    if (live.length) localStorage.setItem(COLLAPSED_KEY, JSON.stringify(live))
    else localStorage.removeItem(COLLAPSED_KEY)
  } catch {
    /* storage unavailable — the sections just open again next time */
  }
})

function toggleCollapsed(id: string) {
  collapsed.value = collapsed.value.includes(id)
    ? collapsed.value.filter((c) => c !== id)
    : [...collapsed.value, id]
}

function toggleFavorite(id: string) {
  routines.toggleFavorite(id)
  void HapticsService.selection()
}

/** Edit mode lists every routine, the suggested one included, in its stored order. */
const editing = ref(false)

type Item = (typeof items.value)[number]
interface EditSection {
  section: RoutineSection
  items: Item[]
}

/**
 * Edit mode's working copy of the layout: each section with its routines,
 * then the unsorted ones. Drag-and-drop moves items between these arrays;
 * {@link commitLayout} then writes the whole layout to the store at once.
 */
const editSections = ref<EditSection[]>([])
const editUnsorted = ref<Item[]>([])

function buildLayout() {
  const sectionIds = new Set(routines.sections.map((s) => s.id))
  editSections.value = routines.sections.map((section) => ({
    section,
    items: items.value.filter((item) => item.sectionId === section.id),
  }))
  editUnsorted.value = items.value.filter((item) => !item.sectionId || !sectionIds.has(item.sectionId))
}

watch([items, () => routines.sections], buildLayout, { immediate: true, deep: true })

/** Runs after a drop, once vue-draggable-plus has updated the arrays on both ends. */
async function commitLayout() {
  await nextTick()
  const order = editSections.value.map((group) => group.section)
  if (order.some((section, i) => section.id !== routines.sections[i]?.id)) routines.reorderSections(order)
  routines.arrange([
    ...editSections.value.map((group) => ({
      sectionId: group.section.id,
      routineIds: group.items.map((item) => item.id),
    })),
    { sectionId: null, routineIds: editUnsorted.value.map((item) => item.id) },
  ])
}

function removeRoutine(id: string) {
  if (!confirm(t('routineDetail.deleteConfirm'))) return
  routines.remove(id)
  if (!routines.list.length) editing.value = false
}

/** The section sheet: `null` id makes a new section. */
const sectionSheetOpen = ref(false)
const sectionSheetId = ref<string | null>(null)

function openSectionSheet(id: string | null) {
  sectionSheetId.value = id
  sectionSheetOpen.value = true
}
</script>

<template>
  <div class="train">
    <section v-if="firstRun" class="first">
      <p class="week__line">
        <b>{{ t('train.firstTitle') }}</b>
        · {{ t('train.firstProgress', { done: firstDone, total: firstSteps.length }) }}
      </p>
      <ol class="first__steps">
        <li
          v-for="step in firstSteps"
          :key="step.label"
          class="first__step"
          :class="{ 'first__step--done': step.done }"
        >
          <span class="first__bar" />
          <span class="first__label">{{ step.label }}</span>
        </li>
      </ol>
    </section>

    <section v-else class="week">
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

    <section v-if="editing" class="edit">
      <div class="heading-row">
        <h2 class="heading">{{ t('routines.title') }}</h2>
        <button type="button" class="edit-toggle" @click="editing = false">
          {{ t('sessionComplete.done') }}
        </button>
      </div>

      <!-- Sections drag by the handle on their heading; routines drag between them. -->
      <VueDraggable
        v-model="editSections"
        class="edit__sections"
        handle=".section__handle"
        ghost-class="row--ghost"
        :animation="150"
        @end="commitLayout"
      >
        <div v-for="group in editSections" :key="group.section.id" class="section">
          <div class="heading-row section__head">
            <span class="section__handle" :aria-label="t('sections.dragAria')">
              <GripVertical :size="20" :stroke-width="2" />
            </span>
            <i class="section__dot" :style="{ background: group.section.color }" />
            <h3 class="heading section__name">{{ group.section.name }}</h3>
            <button
              type="button"
              class="section__edit"
              :aria-label="`${t('sections.editTitle')}: ${group.section.name}`"
              @click="openSectionSheet(group.section.id)"
            >
              <Pencil :size="16" :stroke-width="2.25" />
            </button>
          </div>
          <VueDraggable
            v-model="group.items"
            tag="ul"
            class="list list--drop"
            :data-empty="t('sections.dropHere')"
            group="routines"
            handle=".row__handle"
            ghost-class="row--ghost"
            :animation="150"
            @end="commitLayout"
          >
            <TrainEditRow
              v-for="item in group.items"
              :key="item.id"
              :name="item.name"
              :meta="item.meta"
              :favorite="item.favorite"
              @favorite="toggleFavorite(item.id)"
              @remove="removeRoutine(item.id)"
            />
          </VueDraggable>
        </div>
      </VueDraggable>

      <div v-if="editSections.length" class="heading-row">
        <h3 class="heading">{{ t('train.otherRoutines') }}</h3>
      </div>
      <VueDraggable
        v-model="editUnsorted"
        tag="ul"
        class="list"
        :class="{ 'list--drop': editSections.length }"
        :data-empty="t('sections.dropHere')"
        group="routines"
        handle=".row__handle"
        ghost-class="row--ghost"
        :animation="150"
        @end="commitLayout"
      >
        <TrainEditRow
          v-for="item in editUnsorted"
          :key="item.id"
          :name="item.name"
          :meta="item.meta"
          :favorite="item.favorite"
          @favorite="toggleFavorite(item.id)"
          @remove="removeRoutine(item.id)"
        />
      </VueDraggable>

      <button type="button" class="new-section" @click="openSectionSheet(null)">
        <Plus :size="16" :stroke-width="2.5" />
        {{ t('sections.new') }}
      </button>
    </section>

    <section v-for="(group, i) in rows.length || routines.sections.length ? groups : []" v-else :key="group.key">
      <div class="heading-row">
        <button
          v-if="group.section"
          type="button"
          class="section__toggle"
          :aria-expanded="!collapsed.includes(group.section.id)"
          @click="toggleCollapsed(group.section.id)"
        >
          <i class="section__dot" :style="{ background: group.section.color }" />
          <h2 class="heading section__name">{{ group.title }}</h2>
          <span v-if="collapsed.includes(group.section.id)" class="section__count">{{ group.items.length }}</span>
          <ChevronDown
            class="section__chevron"
            :class="{ 'section__chevron--shut': collapsed.includes(group.section.id) }"
            :size="18"
            :stroke-width="2.25"
          />
        </button>
        <h2 v-else class="heading">{{ group.title }}</h2>
        <button v-if="i === 0" type="button" class="edit-toggle" @click="editing = true">
          {{ t('train.edit') }}
        </button>
      </div>

      <p v-if="group.section && !group.items.length && !collapsed.includes(group.key)" class="section__empty">
        {{ t('sections.emptyHint') }}
      </p>
      <ul v-if="!group.section || !collapsed.includes(group.section.id)" class="list">
        <li v-for="item in group.items" :key="item.id" class="row">
          <RouterLink :to="`/routines/${item.id}`" class="row__body">
            <span class="row__name">
              <!-- A favourite still shows which section it belongs to. -->
              <i
                v-if="group.key === 'favorites' && item.sectionColor"
                class="row__dot"
                :style="{ background: item.sectionColor }"
              />
              {{ item.name }}
            </span>
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
      <button v-if="!editing" type="button" class="new-section new-section--quiet" @click="openSectionSheet(null)">
        <Plus :size="16" :stroke-width="2.5" />
        {{ t('sections.new') }}
      </button>
    </div>

    <SectionSheet v-model:open="sectionSheetOpen" :section-id="sectionSheetId" />
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

/* First run: three steps, the first already filled in. */
.first {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.first__steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 0;
}

.first__step {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--text-small);
}

.first__bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-background-mute);
}

.first__step--done {
  color: var(--color-heading);
  font-weight: var(--weight-medium);
}

.first__step--done .first__bar {
  background: var(--color-accent);
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
  /* The same height with or without the Edit button beside the heading. */
  min-height: 44px;
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

/* A section heading reads like the Favourites one, with its colour as a dot. */
.section__toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: none;
  font: inherit;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.section__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.section__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section__count {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.section__chevron {
  flex-shrink: 0;
  color: var(--color-text);
  transition: transform var(--motion-quick) ease;
}

.section__chevron--shut {
  transform: rotate(-90deg);
}

.section__empty {
  padding: 4px 0 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border);
}

/* Edit mode: sections stack with room between them, each dragged by its grip. */
.edit {
  display: flex;
  flex-direction: column;
}

.edit__sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.edit__sections:empty {
  display: none;
}

.section {
  background: var(--color-background);
}

.section__head {
  gap: 10px;
  justify-content: flex-start;
}

.section__handle {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 44px;
  margin-left: -8px;
  margin-right: -6px;
  color: var(--color-text);
  cursor: grab;
  touch-action: none;
}

.section__edit {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: auto;
  margin-right: -10px;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.section__edit:active {
  background: var(--color-background-mute);
}

/* An empty list still takes a drop, and says so. */
.list--drop {
  min-height: 52px;
}

.list--drop:empty::after {
  content: attr(data-empty);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border: 1px dashed var(--color-border-hover);
  border-radius: 12px;
  font-size: 13px;
}

.new-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  margin-top: 12px;
  border: none;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

/* On the everyday screen it stays out of the way, under the two add buttons. */
.new-section--quiet {
  grid-column: 1 / -1;
  margin-top: 0;
  font-weight: 600;
  color: var(--color-text);
}

.row__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: 0.1em;
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
