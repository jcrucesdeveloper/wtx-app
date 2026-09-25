<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, EllipsisVertical } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import { useSessionsStore } from '@/stores/sessions'
import { formatNumber } from '@/lib/format'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : null))

const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/sessions')
}

function onDelete() {
  menuOpen.value = false
  if (!stored.value) return
  if (!confirm(t('sessionDetail.deleteConfirm'))) return
  sessions.remove(stored.value.id)
  router.replace('/sessions')
}
</script>

<template>
  <AppPage :title="result?.ok ? result.session.name : t('sessionDetail.fallbackTitle')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('sessionDetail.backAria')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="stored" #actions>
      <div class="menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('sessionDetail.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="18" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item menu__item--danger" @click="onDelete">
            {{ t('sessionDetail.deleteSession') }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="!stored" class="msg">{{ t('sessionDetail.notFound') }}</p>

    <template v-else-if="result">
      <div v-if="result.ok" class="stack">
        <p class="date">{{ result.session.date }}</p>
        <p v-if="result.session.notes" class="notes">{{ result.session.notes }}</p>

        <div class="summary">
          <span class="chip">{{ t('sessionDetail.exercises', { count: result.session.exerciseCount }) }}</span>
          <span class="chip">{{ t('sessionDetail.sets', { count: result.session.totalWorkingSets }) }}</span>
          <span v-if="result.session.totalVolume > 0" class="chip">
            {{
              t('sessionDetail.volume', {
                amount: `${formatNumber(result.session.totalVolume)} ${result.session.unit ?? ''}`.trim(),
              })
            }}
          </span>
          <span class="chip" :class="{ 'chip--done': result.session.isComplete }">
            {{ result.session.isComplete ? t('sessionDetail.complete') : t('sessionDetail.incomplete') }}
          </span>
        </div>

        <LoggedExerciseList :exercises="result.session.exercises" :unit="result.session.unit" />
      </div>

      <div v-else class="stack">
        <p class="error">{{ result.error }}</p>
        <pre class="source">{{ stored.rawText }}</pre>
      </div>
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

.icon-btn:first-child {
  margin-left: -4px;
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

.date {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.55;
}

.notes {
  font-size: 14px;
  opacity: 0.8;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.chip--done {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.msg {
  font-size: 14px;
  opacity: 0.7;
}

.error {
  font-size: 13px;
  color: #e11d48;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
</style>
