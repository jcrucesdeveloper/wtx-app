<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CloudUpload, EllipsisVertical, Smartphone } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import QuietState from '@/components/ui/QuietState.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'
import { formatNumber } from '@/lib/format'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()
const auth = useAuthStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : null))

/** Accounts exist in this build and the session was kept off them on finish. */
const isDeviceOnly = computed(() => isSupabaseConfigured && !!stored.value?.localOnly)

/** "Friday, October 2" from the session's `YYYY-MM-DD`; the raw text if it isn't one. */
const dateLabel = computed(() => {
  if (!result.value?.ok) return ''
  const raw = result.value.session.date
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return raw
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: y === new Date().getFullYear() ? undefined : 'numeric',
  })
})

function onSaveToProfile() {
  if (stored.value) sessions.saveToProfile(stored.value.id)
}

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
  <AppPage sub :title="t('sessionDetail.title')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('sessionDetail.backAria')" @click="goBack">
        <ArrowLeft :size="22" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="stored" #actions>
      <div class="menu">
        <button
          type="button"
          class="icon-btn icon-btn--end"
          :aria-label="t('sessionDetail.optionsAria')"
          @click.stop="menuOpen = !menuOpen"
        >
          <EllipsisVertical :size="20" :stroke-width="2.25" />
        </button>
        <div v-if="menuOpen" class="menu__panel" @click.stop>
          <button type="button" class="menu__item menu__item--danger" @click="onDelete">
            {{ t('sessionDetail.deleteSession') }}
          </button>
        </div>
      </div>
    </template>

    <QuietState
      v-if="!stored"
      :title="t('sessionDetail.notFoundTitle')"
      :hint="t('sessionDetail.notFound')"
    >
      <AppButton @click="router.replace('/sessions')">{{ t('sessionDetail.backToHistory') }}</AppButton>
    </QuietState>

    <template v-else-if="result">
      <div v-if="result.ok" class="stack">
        <header class="head">
          <h2 class="head__name">{{ result.session.name }}</h2>
          <p class="head__date">
            {{ dateLabel }}
            <template v-if="!result.session.isComplete"> · {{ t('sessionDetail.incomplete') }}</template>
          </p>
          <p v-if="result.session.notes" class="head__notes">{{ result.session.notes }}</p>
        </header>

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
        </div>

        <div v-if="isDeviceOnly" class="local">
          <Smartphone :size="20" :stroke-width="2" class="local__icon" />
          <div class="local__text">
            <span class="local__title">{{ t('sessionDetail.deviceOnly') }}</span>
            <span class="local__hint">{{ t('sessionDetail.deviceOnlyHint') }}</span>
          </div>
          <AppButton v-if="auth.isLoggedIn" variant="quiet" size="sm" @click="onSaveToProfile">
            <CloudUpload :size="15" :stroke-width="2.5" />
            {{ t('sessionDetail.saveToProfile') }}
          </AppButton>
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
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  margin-left: -10px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.icon-btn--end {
  margin: 0 -10px 0 0;
}

.icon-btn:active {
  background: var(--color-background-mute);
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
  min-width: 180px;
  padding: var(--space-1);
  border-radius: 14px;
  border: 1px solid var(--color-border-hover);
  background: var(--color-background-soft);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
}

.menu__item {
  min-height: var(--size-touch);
  border: none;
  background: transparent;
  color: var(--color-heading);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  text-align: left;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--color-background-mute);
}

.menu__item--danger {
  color: var(--color-danger);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head__name {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.head__date::first-letter {
  text-transform: capitalize;
}

.head__date,
.head__notes {
  font-size: var(--text-body);
  line-height: 1.4;
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.local {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 14px;
  border-radius: 14px;
  background: var(--color-background-soft);
}

.local__icon {
  flex-shrink: 0;
}

.local__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.local__title {
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.local__hint {
  font-size: var(--text-small);
  line-height: 1.35;
}

.error {
  font-size: var(--text-small);
  color: var(--color-danger);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.source {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  overflow-x: auto;
  white-space: pre;
}
</style>
