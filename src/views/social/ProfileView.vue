<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Lock, Settings } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import FeedCard from '@/components/social/FeedCard.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import FollowListSheet, { type FollowListKind } from '@/components/social/FollowListSheet.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import TrainingCalendar from '@/components/session/TrainingCalendar.vue'
import { useAuthStore } from '@/stores/auth'
import { useSessionsStore } from '@/stores/sessions'
import { useSocialStore, type FeedPost } from '@/stores/social'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { sessionsThisWeek } from '@/lib/sessionStats'
import { scrollAppToTop } from '@/lib/scrollAppToTop'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sessions = useSessionsStore()
const social = useSocialStore()

const userId = computed(() => String(route.params.id))
const isMe = computed(() => userId.value === auth.user?.id)
const profile = computed(() => social.profiles.get(userId.value))

const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const postIds = ref<string[]>([])
const hasMore = ref(false)
const loadingMore = ref(false)
const PAGE = 15

const posts = computed(() =>
  postIds.value.map((id) => social.posts.get(id)).filter((p): p is FeedPost => !!p),
)

/** Their workouts are hidden from you: not following, or they've stopped sharing. */
const locked = computed(() => {
  const p = profile.value
  if (!p || isMe.value) return null
  if (!social.isFollowing(p.id)) return 'follow'
  if (!p.share_workouts) return 'private'
  return null
})

async function loadPosts() {
  const page = await social.fetchPage({ userId: userId.value, limit: PAGE })
  postIds.value = page.map((p) => p.id)
  hasMore.value = page.length === PAGE
}

async function load() {
  const id = userId.value
  scrollAppToTop()
  status.value = profile.value ? 'ready' : 'loading'
  postIds.value = []
  try {
    const [row] = await Promise.all([social.fetchProfile(id), loadPosts()])
    if (id !== userId.value) return
    status.value = row ? 'ready' : 'missing'
  } catch {
    if (id === userId.value && !profile.value) status.value = 'error'
  }
  void recheck()
}

watch(userId, () => void load(), { immediate: true })

// Following (or unfollowing) changes what you're allowed to see here — reload
// once the server has it (the button flips optimistically, before it lands).
watch(
  () => social.pendingFollows.has(userId.value),
  (pending, wasPending) => {
    if (pending || !wasPending || isMe.value) return
    void Promise.all([social.fetchProfile(userId.value), loadPosts()]).catch(() => {})
  },
)

async function loadMore() {
  const last = posts.value[posts.value.length - 1]
  if (loadingMore.value || !hasMore.value || !last) return
  loadingMore.value = true
  try {
    const page = await social.fetchPage({ userId: userId.value, after: last, limit: PAGE })
    postIds.value.push(...page.map((p) => p.id))
    hasMore.value = page.length === PAGE
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
  void recheck()
}

const sentinel = ref<HTMLElement | null>(null)
const { recheck } = useInfiniteScroll(sentinel, () => void loadMore())

/** Your own calendar comes from this device's log — complete, and works offline. */
const myDates = computed(() =>
  isMe.value
    ? sessions.list
        .map((s) => sessions.parsed(s.id))
        .map((r) => (r?.ok ? r.session.date : undefined))
        .filter((d): d is string => d !== undefined)
    : [],
)
const thisWeek = computed(() => sessionsThisWeek(myDates.value))

const memberSince = computed(() =>
  profile.value
    ? new Date(profile.value.created_at).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
    : '',
)

const listKind = ref<FollowListKind | null>(null)

const sharing = ref(false)
const shareError = ref(false)

async function toggleShare() {
  const next = !(auth.profile?.share_workouts ?? true)
  sharing.value = true
  shareError.value = false
  try {
    await auth.updateShareWorkouts(next)
    const p = profile.value
    if (p) p.share_workouts = next
  } catch {
    shareError.value = true
  } finally {
    sharing.value = false
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage :title="isMe ? t('social.profile.myTitle') : (profile?.display_name ?? '')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('social.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="isMe" #actions>
      <RouterLink :to="{ name: 'settings' }" class="icon-btn" :aria-label="t('social.profile.settingsAria')">
        <Settings :size="19" :stroke-width="2.25" />
      </RouterLink>
    </template>

    <p v-if="status === 'loading'" class="note">{{ t('social.loading') }}</p>
    <div v-else-if="status === 'missing' || status === 'error'" class="note">
      <p>{{ status === 'missing' ? t('social.profile.missing') : t('social.loadError') }}</p>
      <button v-if="status === 'error'" type="button" class="btn btn--ghost" @click="load">{{ t('social.retry') }}</button>
    </div>

    <div v-else-if="profile" class="stack">
      <header class="hero">
        <UserAvatar :id="profile.id" :name="profile.display_name" :size="76" />
        <div class="hero__body">
          <h2 class="hero__name">{{ profile.display_name }}</h2>
          <p class="hero__since">
            {{ t('social.profile.memberSince', { date: memberSince }) }}
            <template v-if="!isMe && profile.follows_me"> · <span class="hero__badge">{{ t('social.followsYou') }}</span></template>
          </p>
        </div>
      </header>

      <div class="counts">
        <div class="count">
          <strong>{{ locked ? '–' : profile.workouts_count }}</strong>
          <span>{{ t('social.profile.workouts', profile.workouts_count) }}</span>
        </div>
        <button type="button" class="count" @click="listKind = 'followers'">
          <strong>{{ profile.followers_count }}</strong>
          <span>{{ t('social.profile.followersShort', profile.followers_count) }}</span>
        </button>
        <button type="button" class="count" @click="listKind = 'following'">
          <strong>{{ profile.following_count }}</strong>
          <span>{{ t('social.profile.followingShort') }}</span>
        </button>
      </div>

      <FollowButton v-if="!isMe" :user-id="profile.id" :follows-me="profile.follows_me" size="large" class="hero__follow" />

      <template v-if="isMe">
        <button
          type="button"
          class="toggle"
          role="switch"
          :aria-checked="auth.profile?.share_workouts ?? true"
          :disabled="sharing"
          @click="toggleShare"
        >
          <span class="toggle__body">
            <span class="toggle__title">{{ t('social.profile.shareTitle') }}</span>
            <span class="toggle__hint">
              {{ (auth.profile?.share_workouts ?? true) ? t('social.profile.shareOnHint') : t('social.profile.shareOffHint') }}
            </span>
            <span v-if="shareError" class="toggle__error">{{ t('social.profile.shareError') }}</span>
          </span>
          <span class="switch" :class="{ 'switch--on': auth.profile?.share_workouts ?? true }" aria-hidden="true" />
        </button>

        <section v-if="myDates.length" class="block">
          <div class="block__head">
            <h3 class="section-title">{{ t('social.profile.activity') }}</h3>
            <span class="block__meta">{{ t('social.profile.thisWeek', { count: thisWeek }, thisWeek) }}</span>
          </div>
          <TrainingCalendar :dates="myDates" :selected="null" @select="() => {}" />
        </section>
      </template>

      <section class="block">
        <h3 class="section-title">{{ isMe ? t('social.profile.myWorkouts') : t('social.profile.workoutsTitle') }}</h3>

        <div v-if="locked" class="locked">
          <Lock :size="20" :stroke-width="2.25" />
          <p v-if="locked === 'follow'">{{ t('social.profile.lockedFollow', { name: profile.display_name }) }}</p>
          <p v-else>{{ t('social.profile.lockedPrivate', { name: profile.display_name }) }}</p>
        </div>

        <p v-else-if="!posts.length" class="note note--left">
          {{ isMe ? t('social.profile.noWorkoutsMine') : t('social.profile.noWorkouts') }}
        </p>

        <template v-else>
          <ul class="posts">
            <li v-for="post in posts" :key="post.id">
              <FeedCard :post="post" />
            </li>
          </ul>
          <div ref="sentinel" class="posts__end">
            <template v-if="loadingMore">{{ t('social.loading') }}</template>
          </div>
        </template>
      </section>
    </div>

    <FollowListSheet
      v-if="profile"
      v-model:kind="listKind"
      :user-id="profile.id"
      @close="listKind = null"
    />
  </AppPage>
</template>

<style scoped>
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

.note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
  font-size: 13px;
  opacity: 0.7;
  text-align: center;
}

.note--left {
  align-items: flex-start;
  padding: 8px 0;
  text-align: left;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero__name {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.hero__since {
  font-size: 12px;
  opacity: 0.7;
}

.hero__badge {
  font-weight: 700;
  color: var(--color-accent);
}

.hero__follow {
  width: 100%;
}

.counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 4px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.count + .count {
  border-left: 1px solid var(--color-border);
}

div.count {
  cursor: default;
}

.count strong {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

.count span {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.toggle__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle__title {
  font-weight: 700;
  color: var(--color-heading);
}

.toggle__hint {
  font-size: 12px;
  opacity: 0.7;
}

.toggle__error {
  font-size: 12px;
  color: #e11d48;
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  transition: background 0.15s ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch--on {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.switch--on::after {
  transform: translateX(18px);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.block__meta {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
}

.section-title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 13px;
  text-align: center;
  opacity: 0.8;
}

.posts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.posts__end {
  display: flex;
  justify-content: center;
  min-height: 1px;
  font-size: 12px;
  opacity: 0.6;
}

.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
}

.btn--ghost {
  background: transparent;
  color: var(--color-heading);
  border: 1px solid var(--color-border);
}
</style>
