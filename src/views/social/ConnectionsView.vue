<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, EllipsisVertical } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useProfileStore, type Connection } from '@/stores/profile'

type Tab = 'followers' | 'following'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const feed = useFeedStore()
const profiles = useProfileStore()

const tab = computed<Tab>(() => (route.query.tab === 'following' ? 'following' : 'followers'))

function setTab(next: Tab) {
  router.replace({ query: { ...route.query, tab: next } })
}

onMounted(() => {
  void profiles.loadFollowers()
  void feed.loadFollowing({ force: true })
})

const followingIds = computed(() => new Set(feed.following.map((f) => f.id)))
const followerIds = computed(() => new Set(profiles.followers.map((f) => f.id)))

const rows = computed<Connection[]>(() =>
  tab.value === 'followers' ? profiles.followers : feed.following,
)
const loading = computed(() =>
  tab.value === 'followers' ? profiles.followersLoading : feed.followingLoading,
)

function openProfile(id: string) {
  router.push({ name: 'profile', params: { id } })
}

// ⋯ on a follower → remove (silent, confirmed in a sheet).
const removing = ref<Connection | null>(null)
const removeFailed = ref(false)

async function confirmRemove() {
  const target = removing.value
  removing.value = null
  if (!target) return
  removeFailed.value = false
  try {
    await profiles.removeFollower(target.id)
  } catch {
    removeFailed.value = true
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'profile', params: { id: auth.user?.id ?? '' } })
}
</script>

<template>
  <AppPage :title="auth.profile?.display_name ?? ''">
    <template #leading>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('social.feed.backAria')"
        @click="goBack"
      >
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <div class="tabs" role="tablist">
      <button
        v-for="name in ['followers', 'following'] as const"
        :key="name"
        type="button"
        role="tab"
        class="tabs__tab"
        :class="{ 'tabs__tab--on': tab === name }"
        :aria-selected="tab === name"
        @click="setTab(name)"
      >
        {{ t(`social.profile.tabs.${name}`) }}
      </button>
    </div>

    <p v-if="removeFailed" class="error">{{ t('social.profile.actionFailed') }}</p>

    <p v-if="loading && rows.length === 0" class="muted">{{ t('social.feed.loading') }}</p>

    <div v-else-if="rows.length === 0" class="empty">
      <p class="empty__title">{{ t(`social.profile.empty.${tab}Title`) }}</p>
      <p class="empty__hint">{{ t(`social.profile.empty.${tab}Hint`) }}</p>
      <button type="button" class="secondary" @click="router.push({ name: 'follow' })">
        {{ t('social.feed.emptyCta') }}
      </button>
    </div>

    <ul v-else class="list">
      <li v-for="user in rows" :key="user.id" class="row">
        <button type="button" class="row__who" @click="openProfile(user.id)">
          <UserAvatar :id="user.id" :name="user.displayName" :size="40" />
          <span class="row__text">
            <span class="row__name">{{ user.displayName }}</span>
            <span v-if="tab === 'following' && followerIds.has(user.id)" class="row__sub">
              {{ t('social.profile.followsYou') }}
            </span>
          </span>
        </button>
        <FollowButton
          small
          :user-id="user.id"
          :name="user.displayName"
          :i-follow="followingIds.has(user.id)"
          :follows-me="tab === 'followers' || followerIds.has(user.id)"
        />
        <button
          v-if="tab === 'followers'"
          type="button"
          class="row__more"
          :aria-label="t('social.profile.moreAria')"
          @click="removing = user"
        >
          <EllipsisVertical :size="18" :stroke-width="2.25" />
        </button>
      </li>
    </ul>

    <BottomSheet :open="!!removing" :title="removing?.displayName ?? ''" @close="removing = null">
      <div class="sheet">
        <p class="sheet__hint">
          {{ t('social.profile.removeFollowerHint', { name: removing?.displayName ?? '' }) }}
        </p>
        <button type="button" class="sheet__danger" @click="confirmRemove">
          {{ t('social.profile.removeFollower') }}
        </button>
      </div>
    </BottomSheet>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  margin-left: -4px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.tabs__tab {
  min-height: 44px;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
  cursor: pointer;
}

.tabs__tab--on {
  border-bottom-color: var(--color-heading);
  color: var(--color-heading);
  opacity: 1;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.row__who {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: none;
  background: none;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.row__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row__name {
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__sub {
  font-size: 12px;
  opacity: 0.6;
}

.row__more {
  display: grid;
  place-items: center;
  width: 36px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
}

.muted {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}

.error {
  font-size: 13px;
  color: #e11d48;
  margin-bottom: 8px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
}

.empty__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 34ch;
}

.secondary {
  min-height: 44px;
  margin-top: 6px;
  padding: 0 16px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 12px;
}

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__danger {
  min-height: 48px;
  border: 1px solid #e11d48;
  border-radius: var(--radius-md);
  background: transparent;
  color: #e11d48;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}
</style>
