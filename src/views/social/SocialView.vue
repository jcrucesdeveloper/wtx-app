<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, QrCode, RefreshCw, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AuthForm from '@/components/social/AuthForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import { useSyncStore } from '@/stores/sync'
import { useUiStore } from '@/stores/ui'
import { isSupabaseConfigured } from '@/services/supabase'
import type { RoomRow } from '@/lib/supabase/database.types'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const room = useRoomStore()
const sync = useSyncStore()
const ui = useUiStore()

const history = ref<RoomRow[]>([])
const historyError = ref(false)

async function loadHistory() {
  historyError.value = false
  try {
    history.value = await room.history()
  } catch {
    historyError.value = true
  }
}

onMounted(async () => {
  await auth.whenReady()
  if (auth.isLoggedIn) void loadHistory()
})

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) void loadHistory()
    else history.value = []
  },
)

/** After logging in, return to wherever sent us here (e.g. a join link), else stay on Social. */
function onAuthDone() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) router.replace(redirect)
}

function roomDate(row: RoomRow): string {
  return new Date(row.created_at).toLocaleDateString(locale.value, { weekday: 'short', month: 'short', day: 'numeric' })
}

function openRoom(row: RoomRow) {
  if (row.status === 'finished') router.push({ name: 'room-recap', params: { id: row.id } })
  else router.push({ name: 'room-lobby', params: { id: row.id } })
}
</script>

<template>
  <AppPage :title="t('nav.social')">
    <!-- No backend configured: the app is local-only. -->
    <div v-if="!isSupabaseConfigured" class="empty">
      <p class="empty__title">{{ t('social.notConfiguredTitle') }}</p>
      <p class="empty__hint">{{ t('social.notConfiguredHint') }}</p>
    </div>

    <div v-else-if="!auth.ready" class="empty" />

    <!-- Logged out: log in, or switch to sign up. -->
    <AuthForm v-else-if="!auth.isLoggedIn" @done="onAuthDone" />

    <!-- Logged in. -->
    <div v-else class="stack">
      <div class="hello">
        <p class="hello__name">{{ t('social.hello', { name: auth.profile?.display_name ?? '' }) }}</p>
        <span class="hello__sync" :class="`hello__sync--${sync.status}`">
          <RefreshCw :size="12" :stroke-width="2.5" :class="{ spin: sync.status === 'syncing' }" />
          {{ t(`account.syncStatus.${sync.status}`) }}
        </span>
      </div>

      <button v-if="room.room && room.room.status !== 'finished'" type="button" class="current" @click="openRoom(room.room)">
        <span class="current__body">
          <span class="current__label">{{ t('social.currentRoom') }}</span>
          <span class="current__name">{{ room.room.routine_name }}</span>
          <span class="current__meta">{{ t(`social.status.${room.room.status}`) }} · {{ room.room.code }}</span>
        </span>
        <span class="current__open">{{ t('social.openRoom') }}</span>
      </button>

      <div class="actions">
        <button type="button" class="action" @click="ui.open('group')">
          <span class="action__icon"><Users :size="20" :stroke-width="2.25" /></span>
          <span class="action__body">
            <span class="action__title">{{ t('social.trainWithFriends') }}</span>
            <span class="action__hint">{{ t('social.trainWithFriendsHint') }}</span>
          </span>
          <ChevronRight :size="18" class="action__chevron" />
        </button>
        <button type="button" class="action" @click="router.push({ name: 'room-join' })">
          <span class="action__icon"><QrCode :size="20" :stroke-width="2.25" /></span>
          <span class="action__body">
            <span class="action__title">{{ t('social.joinWithCode') }}</span>
            <span class="action__hint">{{ t('social.joinWithCodeHint') }}</span>
          </span>
          <ChevronRight :size="18" class="action__chevron" />
        </button>
      </div>

      <section class="history">
        <h2 class="history__title">{{ t('social.historyTitle') }}</h2>
        <p v-if="historyError" class="history__empty">{{ t('social.historyError') }}</p>
        <p v-else-if="!history.length" class="history__empty">{{ t('social.historyEmpty') }}</p>
        <ul v-else class="history__list">
          <li v-for="row in history" :key="row.id">
            <button type="button" class="history__row" @click="openRoom(row)">
              <span class="history__body">
                <span class="history__name">{{ row.routine_name }}</span>
                <span class="history__meta">{{ roomDate(row) }}</span>
              </span>
              <span class="status" :class="`status--${row.status}`">{{ t(`social.status.${row.status}`) }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </AppPage>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 64px 24px;
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

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hello {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hello__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hello__sync {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
}

.hello__sync--error {
  color: #e11d48;
  opacity: 1;
}

.hello__sync--offline {
  color: #b45309;
  opacity: 1;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.current {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.current__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.current__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.85;
}

.current__name {
  font-size: 16px;
  font-weight: 700;
}

.current__meta {
  font-size: 12px;
  opacity: 0.9;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.current__open {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.action__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-accent);
}

.action__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action__title {
  font-weight: 600;
  color: var(--color-heading);
}

.action__hint {
  font-size: 12px;
  opacity: 0.7;
}

.action__chevron {
  opacity: 0.4;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history__title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.history__empty {
  font-size: 13px;
  opacity: 0.6;
}

.history__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.history__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.history__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history__name {
  font-weight: 600;
  color: var(--color-heading);
}

.history__meta {
  font-size: 12px;
  opacity: 0.6;
}

.status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  padding: 3px 7px;
  border-radius: var(--radius-xs);
  background: var(--color-background-mute);
}

.status--active {
  background: var(--color-accent);
  color: #fff;
}
</style>
