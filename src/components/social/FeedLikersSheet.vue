<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore, type Liker, type LikersCursor } from '@/stores/feed'

const props = defineProps<{
  /** The post whose likers to list; `null` keeps the sheet closed. */
  sessionId: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const feed = useFeedStore()

const likers = ref<Liker[]>([])
const next = ref<LikersCursor | null>(null)
const loading = ref(false)
const failed = ref(false)

/**
 * Follows and unfollows made from this list land in feed.following, so once
 * that's loaded it's the truth; until then, the row's flag from the server.
 */
const followingIds = computed(() => new Set(feed.following.map((f) => f.id)))
const followingReady = ref(false)

/** Bumped on every (re)open so a late page for a previous post is thrown away. */
let generation = 0

async function loadPage(reset: boolean) {
  const sessionId = props.sessionId
  if (!sessionId || (loading.value && !reset)) return
  const mine = reset ? ++generation : generation
  loading.value = true
  failed.value = false
  try {
    const page = await feed.fetchLikers(sessionId, reset ? null : next.value)
    if (mine !== generation) return
    likers.value = reset ? page.likers : [...likers.value, ...page.likers]
    next.value = page.next
  } catch {
    if (mine === generation) failed.value = true
  } finally {
    if (mine === generation) loading.value = false
  }
}

watch(
  () => props.sessionId,
  (id) => {
    likers.value = []
    next.value = null
    if (id) {
      followingReady.value = false
      void feed.loadFollowing().finally(() => (followingReady.value = true))
      void loadPage(true)
    }
  },
  { immediate: true },
)

function iFollow(liker: Liker): boolean {
  return followingReady.value ? followingIds.value.has(liker.id) : liker.iFollow
}

function openProfile(id: string) {
  emit('close')
  router.push({ name: 'profile', params: { id } })
}

/** Loads the next page once the list is scrolled near its end. */
function onScroll(event: Event) {
  const el = event.target as HTMLElement
  if (next.value && !loading.value && el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    void loadPage(false)
  }
}
</script>

<template>
  <BottomSheet :open="!!sessionId" :title="t('social.likers.title')" @close="emit('close')">
    <div class="likers" @scroll.passive="onScroll">
      <p v-if="failed && likers.length === 0" class="muted">
        {{ t('social.likers.error') }}
        <button type="button" class="retry" @click="loadPage(true)">{{ t('social.likers.retry') }}</button>
      </p>
      <p v-else-if="loading && likers.length === 0" class="muted">{{ t('social.feed.loading') }}</p>
      <p v-else-if="likers.length === 0" class="muted">{{ t('social.likers.empty') }}</p>

      <ul v-else class="list">
        <li v-for="liker in likers" :key="liker.id" class="row">
          <button type="button" class="row__who" @click="openProfile(liker.id)">
            <UserAvatar :id="liker.id" :name="liker.displayName" :size="40" />
            <span class="row__text">
              <span class="row__name">{{
                liker.id === auth.user?.id ? t('social.likers.you') : liker.displayName
              }}</span>
              <span v-if="liker.followsMe && liker.id !== auth.user?.id" class="row__sub">
                {{ t('social.profile.followsYou') }}
              </span>
            </span>
          </button>
          <FollowButton
            v-if="liker.id !== auth.user?.id"
            small
            :user-id="liker.id"
            :name="liker.displayName"
            :i-follow="iFollow(liker)"
            :follows-me="liker.followsMe"
          />
        </li>
      </ul>

      <button
        v-if="next && likers.length"
        type="button"
        class="more"
        :disabled="loading"
        @click="loadPage(false)"
      >
        {{ loading ? t('social.feed.loading') : t('social.feed.loadMore') }}
      </button>
      <p v-if="failed && likers.length" class="muted">{{ t('social.likers.error') }}</p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.likers {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
  padding-bottom: 12px;
}

.muted {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}

.retry {
  margin-left: 6px;
  border: none;
  background: none;
  color: var(--color-heading);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row__who {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  min-height: 52px;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.row__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__sub {
  font-size: 12px;
  opacity: 0.7;
}

.more {
  align-self: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-weight: 700;
  cursor: pointer;
}
</style>
