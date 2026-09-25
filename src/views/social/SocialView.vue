<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronRight, QrCode, RefreshCw, UserSearch, Users, X } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AuthForm from '@/components/social/AuthForm.vue'
import FeedCard from '@/components/social/FeedCard.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import { useSocialStore } from '@/stores/social'
import { useSyncStore } from '@/stores/sync'
import { useUiStore } from '@/stores/ui'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { isSupabaseConfigured } from '@/services/supabase'
import type { RoomRow } from '@/lib/supabase/database.types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const room = useRoomStore()
const social = useSocialStore()
const sync = useSyncStore()
const ui = useUiStore()

const refreshing = ref(false)

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    // A workout finished moments ago may still be waiting to upload.
    if (sync.status !== 'off') await sync.syncNow().catch(() => {})
    await social.refresh()
  } finally {
    refreshing.value = false
    void recheck()
  }
}

onMounted(async () => {
  await auth.whenReady()
  if (auth.isLoggedIn) void refresh()
})

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) void refresh()
  },
)

const me = computed(() => (auth.user ? social.profiles.get(auth.user.id) : undefined))

const sentinel = ref<HTMLElement | null>(null)
const loadMoreFailed = ref(false)

async function loadMore() {
  loadMoreFailed.value = false
  try {
    await social.loadMoreFeed()
  } catch {
    loadMoreFailed.value = true
    return
  }
  void recheck()
}

const { recheck } = useInfiniteScroll(sentinel, () => {
  if (!loadMoreFailed.value) void loadMore()
})

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
  <AppPage :title="t('nav.social')">
    <template v-if="isSupabaseConfigured && auth.isLoggedIn" #actions>
      <RouterLink :to="{ name: 'social-people' }" class="icon-btn" :aria-label="t('social.findPeople')">
        <UserSearch :size="20" :stroke-width="2.25" />
      </RouterLink>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('social.refresh')"
        :disabled="refreshing"
        @click="refresh"
      >
        <RefreshCw :size="19" :stroke-width="2.25" :class="{ spin: refreshing }" />
      </button>
    </template>

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
      <RouterLink :to="{ name: 'social-profile', params: { id: auth.user!.id } }" class="me">
        <UserAvatar :id="auth.user!.id" :name="auth.profile?.display_name ?? ''" :size="52" />
        <span class="me__body">
          <span class="me__name">{{ auth.profile?.display_name ?? '' }}</span>
          <span class="me__stats">
            <template v-if="me">
              <span><strong>{{ me.workouts_count }}</strong> {{ t('social.profile.workouts', me.workouts_count) }}</span>
              <span><strong>{{ me.followers_count }}</strong> {{ t('social.profile.followersShort', me.followers_count) }}</span>
              <span><strong>{{ me.following_count }}</strong> {{ t('social.profile.followingShort') }}</span>
            </template>
            <template v-else>{{ t('social.viewProfile') }}</template>
          </span>
        </span>
        <ChevronRight :size="18" class="me__chevron" />
      </RouterLink>

      <button
        v-if="room.room && room.room.status !== 'finished'"
        type="button"
        class="current"
        @click="openRoom(room.room)"
      >
        <span class="current__body">
          <span class="current__label">{{ t('social.currentRoom') }}</span>
          <span class="current__name">{{ room.room.routine_name }}</span>
          <span class="current__meta">{{ t(`social.status.${room.room.status}`) }} · {{ room.room.code }}</span>
        </span>
        <span class="current__open">{{ t('social.openRoom') }}</span>
      </button>

      <div class="together">
        <button type="button" class="chip" @click="ui.open('group')">
          <Users :size="16" :stroke-width="2.5" />
          {{ t('social.trainWithFriends') }}
        </button>
        <button type="button" class="chip" @click="router.push({ name: 'room-join' })">
          <QrCode :size="16" :stroke-width="2.5" />
          {{ t('social.joinWithCode') }}
        </button>
      </div>

      <section v-if="social.suggestions.length" class="suggest">
        <div class="section-head">
          <h2 class="section-title">{{ t('social.suggestedTitle') }}</h2>
          <RouterLink :to="{ name: 'social-people' }" class="section-link">{{ t('social.seeAll') }}</RouterLink>
        </div>
        <ul class="suggest__row">
          <li v-for="person in social.suggestions" :key="person.id" class="suggest__card">
            <button
              type="button"
              class="suggest__dismiss"
              :aria-label="t('social.dismissAria', { name: person.display_name })"
              @click="social.dismissSuggestion(person.id)"
            >
              <X :size="14" :stroke-width="2.5" />
            </button>
            <RouterLink :to="{ name: 'social-profile', params: { id: person.id } }" class="suggest__who">
              <UserAvatar :id="person.id" :name="person.display_name" :size="56" />
              <span class="suggest__name">{{ person.display_name }}</span>
              <span class="suggest__reason">{{ t(`social.reason.${person.reason}`) }}</span>
            </RouterLink>
            <FollowButton :user-id="person.id" :follows-me="person.follows_me" />
          </li>
        </ul>
      </section>

      <section class="feed" :aria-label="t('social.feedTitle')">
        <h2 class="section-title">{{ t('social.feedTitle') }}</h2>

        <div v-if="social.feedStatus === 'loading' || social.feedStatus === 'idle'" class="skeletons" aria-hidden="true">
          <div v-for="n in 2" :key="n" class="skeleton">
            <div class="skeleton__head">
              <span class="skeleton__avatar" />
              <span class="skeleton__line skeleton__line--short" />
            </div>
            <span class="skeleton__line" />
            <span class="skeleton__block" />
          </div>
        </div>

        <div v-else-if="social.feedStatus === 'error'" class="empty empty--inline">
          <p class="empty__title">{{ t('social.feedError') }}</p>
          <button type="button" class="btn" @click="refresh">{{ t('social.retry') }}</button>
        </div>

        <div v-else-if="!social.feed.length" class="empty empty--inline">
          <p class="empty__title">{{ t('social.feedEmptyTitle') }}</p>
          <p class="empty__hint">{{ t('social.feedEmptyHint') }}</p>
          <RouterLink :to="{ name: 'social-people' }" class="btn">
            <UserSearch :size="16" :stroke-width="2.5" />
            {{ t('social.findPeople') }}
          </RouterLink>
        </div>

        <template v-else>
          <ul class="feed__list">
            <li v-for="post in social.feed" :key="post.id">
              <FeedCard :post="post" />
            </li>
          </ul>
          <div ref="sentinel" class="feed__end">
            <template v-if="social.loadingMore">{{ t('social.loading') }}</template>
            <button v-else-if="loadMoreFailed" type="button" class="btn btn--ghost" @click="loadMore">
              {{ t('social.loadMore') }}
            </button>
            <template v-else-if="!social.feedHasMore">{{ t('social.caughtUp') }}</template>
          </div>
        </template>
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

.empty--inline {
  padding: 32px 16px;
  gap: 8px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 300px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.6;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.me {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  color: inherit;
  text-decoration: none;
}

.me:hover {
  background: var(--color-background-soft);
}

.me__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.me__name {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  opacity: 0.8;
}

.me__stats strong {
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.me__chevron {
  opacity: 0.4;
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

.together {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.chip svg {
  color: var(--color-accent);
  flex-shrink: 0;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.section-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
  text-decoration: none;
}

.section-link:hover {
  background: transparent;
}

.suggest {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Bleeds to the screen edges so cards scroll out from under the page padding. */
.suggest__row {
  list-style: none;
  display: flex;
  gap: 10px;
  margin: 0 -20px;
  padding: 2px 20px 4px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 20px; /* snap to the padding, not the screen edge */
  scrollbar-width: none;
}

.suggest__row::-webkit-scrollbar {
  display: none;
}

.suggest__card {
  position: relative;
  flex: 0 0 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  scroll-snap-align: start;
}

.suggest__dismiss {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-text);
  opacity: 0.55;
  cursor: pointer;
}

.suggest__who {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  color: inherit;
  text-decoration: none;
  text-align: center;
}

.suggest__who:hover {
  background: transparent;
}

.suggest__name {
  max-width: 100%;
  margin-top: 4px;
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggest__reason {
  font-size: 11px;
  opacity: 0.65;
  min-height: 2.6em;
  line-height: 1.3;
}

.suggest__card :deep(.follow) {
  width: 100%;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feed__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed__end {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
  font-size: 12px;
  opacity: 0.6;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  margin-top: 6px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}

.btn:hover {
  background: var(--color-accent);
  filter: brightness(1.08);
}

.btn--ghost {
  background: transparent;
  color: var(--color-heading);
  border: 1px solid var(--color-border);
}

.skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.skeleton__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skeleton__avatar,
.skeleton__line,
.skeleton__block {
  background: var(--color-background-mute);
  animation: shimmer 1.2s ease-in-out infinite alternate;
}

.skeleton__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.skeleton__line {
  display: block;
  height: 14px;
  width: 60%;
  border-radius: var(--radius-sm);
}

.skeleton__line--short {
  width: 35%;
}

.skeleton__block {
  display: block;
  height: 64px;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  to {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton__avatar,
  .skeleton__line,
  .skeleton__block,
  .spin {
    animation: none;
  }
}
</style>
