<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MonitorSmartphone, RefreshCw, Share2, Timer, Users } from '@lucide/vue'
import AuthForm, { openAuthMode } from '@/components/social/AuthForm.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import FeedPostCard from '@/components/social/FeedPostCard.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useModerationStore } from '@/stores/moderation'
import { useRoomStore } from '@/stores/room'
import { useSyncStore } from '@/stores/sync'
import { useUiStore } from '@/stores/ui'

/**
 * The Friends tab.
 *
 * Logged out, it says what an account is for before asking for one, and the
 * form only appears once you've chosen to continue. Logged in, it reads top
 * to bottom as: train with someone (the one thing to do), the people you
 * follow, then what they have been doing. With nobody followed yet, the
 * screen's job is getting the first person in, so your code is right there.
 */
const emit = defineEmits<{
  /** Logged in (or signed up) and the first sync has run. */
  authDone: []
}>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const feed = useFeedStore()
const moderation = useModerationStore()
const room = useRoomStore()
const sync = useSyncStore()
const ui = useUiStore()

// ----- logged out -----
// Arriving from a link that needs an account (a room or follow invite) goes straight to the form.
const formOpen = ref(typeof route.query.redirect === 'string')

function openForm(mode: 'login' | 'signup') {
  openAuthMode(mode)
  formOpen.value = true
}

const benefits = computed(() => [
  { icon: Timer, text: t('friends.benefitTogether') },
  { icon: Users, text: t('friends.benefitFeed') },
  { icon: MonitorSmartphone, text: t('friends.benefitSync') },
])

// ----- logged in -----
function load() {
  if (!auth.isLoggedIn) return
  void feed.loadFollowing()
  void feed.loadFeed()
  // Once per account: fills the feed's hidden set in case a blocked account slips through.
  void moderation.loadBlocked()
}
onMounted(load)

function onAuthDone() {
  formOpen.value = false
  load()
  emit('authDone')
}

const currentRoom = computed(() =>
  room.room && room.room.status !== 'finished' ? room.room : null,
)

const noFriendsYet = computed(() => !feed.followingLoading && feed.following.length === 0)

const myCode = computed(() => auth.inviteCode ?? '')
</script>

<template>
  <!-- Logged out. -->
  <div v-if="!auth.isLoggedIn" class="friends">
    <div v-if="formOpen" class="friends-auth">
      <button type="button" class="back" @click="formOpen = false">
        <ArrowLeft :size="18" :stroke-width="2.25" /> {{ t('legal.back') }}
      </button>
      <AuthForm @done="onAuthDone" />
    </div>

    <template v-else>
      <section class="pitch">
        <h2 class="pitch__title">{{ t('friends.pitchTitle') }}</h2>
        <p class="pitch__body">{{ t('friends.pitchBody') }}</p>
        <ul class="pitch__list">
          <li v-for="benefit in benefits" :key="benefit.text">
            <span class="pitch__icon"><component :is="benefit.icon" :size="20" :stroke-width="2" /></span>
            {{ benefit.text }}
          </li>
        </ul>
      </section>

      <div class="choose">
        <button type="button" class="button button--primary" @click="openForm('signup')">
          {{ t('friends.createAccount') }}
        </button>
        <button type="button" class="button" @click="openForm('login')">
          {{ t('friends.haveAccount') }}
        </button>
        <p class="note">{{ t('friends.localNote') }}</p>
      </div>
    </template>
  </div>

  <!-- Logged in. -->
  <div v-else class="friends">
    <!-- Nothing is lost while offline; say so before anything looks broken. -->
    <p v-if="sync.status === 'offline'" class="offline" role="status">{{ t('friends.offline') }}</p>

    <button
      v-if="currentRoom"
      type="button"
      class="hero"
      @click="router.push({ name: 'room-lobby', params: { id: currentRoom.id } })"
    >
      <span class="hero__label"><i class="hero__dot" />{{ t('social.currentRoom') }}</span>
      <span class="hero__name">{{ currentRoom.routine_name }}</span>
      <span class="hero__meta">
        {{ t(`social.status.${currentRoom.status}`) }} · {{ currentRoom.code }}
      </span>
      <span class="button button--primary hero__action">{{ t('social.openRoom') }}</span>
    </button>

    <section v-else class="hero">
      <span class="hero__name">{{ t('friends.trainTogether') }}</span>
      <span class="hero__meta">{{ t('friends.trainTogetherHint') }}</span>
      <button type="button" class="button button--primary hero__action" @click="ui.open('group')">
        {{ t('friends.startGroup') }}
      </button>
      <button type="button" class="button hero__second" @click="router.push({ name: 'room-join' })">
        {{ t('social.joinWithCode') }}
      </button>
    </section>

    <section>
      <div class="heading-row">
        <h2 class="heading">{{ t('social.follow.followingTitle') }}</h2>
        <button type="button" class="text-btn" @click="ui.open('shareProfile')">
          {{ t('friends.add') }}
        </button>
      </div>

      <div v-if="noFriendsYet" class="invite">
        <p class="invite__title">{{ t('friends.firstPartner') }}</p>
        <p class="invite__hint">{{ t('friends.firstPartnerHint') }}</p>
        <p v-if="myCode" class="invite__code">{{ myCode.slice(0, 4) }} {{ myCode.slice(4) }}</p>
        <div class="invite__actions">
          <button type="button" class="button" :disabled="!myCode" @click="ui.open('shareProfile')">
            <Share2 :size="18" :stroke-width="2.25" />
            {{ t('friends.shareCode') }}
          </button>
          <button type="button" class="button" @click="router.push({ name: 'follow' })">
            {{ t('friends.enterCode') }}
          </button>
        </div>
      </div>

      <ul v-else class="people">
        <li v-for="user in feed.following" :key="user.id">
          <button
            type="button"
            class="person"
            @click="router.push({ name: 'profile', params: { id: user.id } })"
          >
            <UserAvatar :id="user.id" :name="user.displayName" :size="52" />
            <span class="person__name">{{ user.displayName }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="heading heading--spaced">{{ t('friends.activity') }}</h2>
      <p v-if="feed.postsError" class="quiet quiet--action">
        {{ t('social.feed.error') }}
        <button type="button" class="text-btn" @click="feed.loadFeed({ force: true })">
          {{ t('social.profile.retry') }}
        </button>
      </p>
      <div
        v-else-if="feed.loadingPosts && feed.posts.length === 0"
        class="feed"
        role="status"
        :aria-label="t('social.feed.loading')"
      >
        <SkeletonBlock v-for="n in 2" :key="n" height="132px" radius="lg" />
      </div>
      <p v-else-if="feed.posts.length === 0" class="quiet">{{ t('friends.feedEmpty') }}</p>
      <div v-else class="feed">
        <FeedPostCard v-for="post in feed.posts" :key="post.sessionId" :post="post" />
        <button
          v-if="feed.hasMore"
          type="button"
          class="button"
          :disabled="feed.loadingPosts"
          @click="feed.loadMore()"
        >
          {{ feed.loadingPosts ? t('social.feed.loading') : t('social.feed.loadMore') }}
        </button>
      </div>
    </section>

    <p class="sync">
      <RefreshCw :size="12" :stroke-width="2.5" />
      {{ t(`account.syncStatus.${sync.status}`) }}
    </p>
  </div>
</template>

<style scoped>
/* Three text sizes, as on Train: 28 (the one thing), 16, 13. */
.friends {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Shared button shape: neutral and outlined by default, one accent per screen. */
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 8px 14px;
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

.button:active {
  transform: scale(0.98);
}

.button:disabled {
  opacity: 0.5;
}

.button--primary {
  min-height: 56px;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

/* Logged out: the reasons first, the form second. */
.pitch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.pitch__title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.pitch__body {
  font-size: 16px;
  line-height: 1.4;
}

.pitch__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 4px;
  padding: 0;
}

.pitch__list li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 16px;
  line-height: 1.35;
  color: var(--color-heading);
}

.pitch__icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-background-soft);
}

.choose {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note {
  margin-top: 4px;
  text-align: center;
  font-size: 13px;
}

.back {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  margin-bottom: 4px;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

/* Logged in: the one container on the screen. */
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
}

button.hero {
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
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
}

.hero__meta {
  margin-top: 6px;
  font-size: 16px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.hero__action {
  margin-top: 18px;
}

.hero__second {
  margin-top: 10px;
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

.heading--spaced {
  margin-bottom: 12px;
}

.text-btn {
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

/* Nobody followed yet: the way to get the first person in, on the screen itself. */
.invite {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.invite__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.invite__hint {
  font-size: 13px;
  line-height: 1.45;
}

.invite__code {
  margin: 10px 0 6px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  user-select: text;
  -webkit-user-select: text;
}

.invite__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.people {
  list-style: none;
  display: flex;
  gap: 4px;
  margin: 4px -20px 0;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 72px;
  border: none;
  padding: 4px 0;
  font: inherit;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.person__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiet {
  font-size: 13px;
  line-height: 1.45;
}

.quiet--action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.offline {
  padding: var(--space-3) 14px;
  border-radius: 14px;
  font-size: var(--text-small);
  line-height: 1.4;
  color: var(--color-heading);
  background: var(--color-background-soft);
}

.sync {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.7;
}
</style>
