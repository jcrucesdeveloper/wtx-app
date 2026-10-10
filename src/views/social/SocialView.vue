<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, QrCode, RefreshCw, UserPlus, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
// PROTO (redesign Phase 1): the page is titled like its tab.
import { protoDirection } from '@/proto/direction'
import ProtoFriends from '@/proto/ProtoFriends.vue'
import AuthForm from '@/components/social/AuthForm.vue'
import FeedList from '@/components/social/FeedList.vue'
import FollowingStrip from '@/components/social/FollowingStrip.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import { useSyncStore } from '@/stores/sync'
import { useUiStore } from '@/stores/ui'
import { isSupabaseConfigured } from '@/services/supabase'
import type { RoomRow } from '@/lib/supabase/database.types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const room = useRoomStore()
const sync = useSyncStore()
const ui = useUiStore()

/** After logging in, return to wherever sent us here (e.g. a join link), else stay on Social. */
function onAuthDone() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) router.replace(redirect)
}

function openRoom(row: RoomRow) {
  if (row.status === 'finished') router.push({ name: 'room-recap', params: { id: row.id } })
  else router.push({ name: 'room-lobby', params: { id: row.id } })
}
</script>

<template>
  <AppPage :title="protoDirection === 'focus' ? t('proto.tabFriends') : t('nav.social')">
    <!-- Your profile, top right — where social apps put "you". -->
    <template v-if="isSupabaseConfigured && auth.isLoggedIn && auth.user" #actions>
      <button
        type="button"
        class="me"
        :aria-label="t('social.profile.openMine')"
        @click="router.push({ name: 'profile', params: { id: auth.user.id } })"
      >
        <UserAvatar :id="auth.user.id" :name="auth.profile?.display_name ?? '?'" :size="36" />
      </button>
    </template>

    <!-- No backend configured: the app is local-only. -->
    <div v-if="!isSupabaseConfigured" class="empty">
      <p class="empty__title">{{ t('social.notConfiguredTitle') }}</p>
      <p class="empty__hint">{{ t('social.notConfiguredHint') }}</p>
    </div>

    <div v-else-if="!auth.ready" class="empty" />

    <ProtoFriends v-else-if="protoDirection === 'focus'" @auth-done="onAuthDone" />

    <!-- Logged out: log in, or switch to sign up. -->
    <AuthForm v-else-if="!auth.isLoggedIn" @done="onAuthDone" />

    <!-- Logged in. -->
    <div v-else class="stack">
      <div class="hello">
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

      <FeedList />

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
        <button type="button" class="action" @click="router.push({ name: 'follow' })">
          <span class="action__icon"><UserPlus :size="20" :stroke-width="2.25" /></span>
          <span class="action__body">
            <span class="action__title">{{ t('social.findPartners') }}</span>
            <span class="action__hint">{{ t('social.findPartnersHint') }}</span>
          </span>
          <ChevronRight :size="18" class="action__chevron" />
        </button>
      </div>

      <FollowingStrip />
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

.me {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-right: -4px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.me:active {
  opacity: 0.8;
}

.hello {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: -8px;
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
</style>
