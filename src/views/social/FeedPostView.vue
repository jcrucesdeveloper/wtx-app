<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Ban, EllipsisVertical, Flag } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import QuietState from '@/components/ui/QuietState.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import FeedPostSummary from '@/components/social/FeedPostSummary.vue'
import FeedKudosButton from '@/components/social/FeedKudosButton.vue'
import ReportSheet from '@/components/social/ReportSheet.vue'
import BlockConfirmSheet from '@/components/social/BlockConfirmSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { formatPostedAt } from '@/lib/format'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const feed = useFeedStore()

const id = computed(() => String(route.params.id))
const post = computed(() => feed.getPost(id.value))
const loading = ref(false)

// ⋯ on someone else's post → report it, or block its author. Kept here rather
// than on every feed card so the feed stays uncluttered; every card opens this page.
const isMine = computed(() => post.value?.posterId === auth.user?.id)
const menuOpen = ref(false)
const reportOpen = ref(false)
const blockOpen = ref(false)
/** Captured when the menu opens — blocking removes the post from the store. */
const author = ref({ id: '', name: '' })

function openMenu() {
  if (!post.value) return
  author.value = { id: post.value.posterId, name: post.value.posterName }
  menuOpen.value = true
}

function openReport() {
  menuOpen.value = false
  reportOpen.value = true
}

function openBlock() {
  menuOpen.value = false
  reportOpen.value = false
  blockOpen.value = true
}

// Opened from the feed the post is already loaded; on a deep link or reload, fetch it.
watch(
  id,
  async (sessionId) => {
    if (feed.getPost(sessionId)) return
    loading.value = true
    try {
      await feed.loadPost(sessionId)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage sub :title="post?.session.name ?? t('social.feed.postTitle')">
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
    <template v-if="post && !isMine" #actions>
      <button
        type="button"
        class="icon-btn icon-btn--action"
        :aria-label="t('social.moderation.postMoreAria')"
        @click="openMenu"
      >
        <EllipsisVertical :size="18" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="loading" class="msg">{{ t('social.feed.loading') }}</p>
    <QuietState
      v-else-if="!post"
      :title="t('social.feed.notFoundTitle')"
      :hint="t('social.feed.notFound')"
    />

    <div v-else class="stack">
      <div class="byline">
        <span class="byline__name">{{ post.posterName }}</span>
        <span class="byline__date">{{ formatPostedAt(post.createdAt, locale) }}</span>
      </div>

      <FeedPostSummary :post="post" />

      <p v-if="post.session.notes" class="notes">{{ post.session.notes }}</p>

      <LoggedExerciseList :exercises="post.session.exercises" :unit="post.session.unit" />

      <FeedKudosButton :post="post" />
    </div>

    <BottomSheet :open="menuOpen" :title="author.name" @close="menuOpen = false">
      <div class="sheet">
        <button type="button" class="sheet__row" @click="openReport">
          <Flag :size="18" :stroke-width="2.25" />
          {{ t('social.moderation.reportPost') }}
        </button>
        <button type="button" class="sheet__row sheet__row--danger" @click="openBlock">
          <Ban :size="18" :stroke-width="2.25" />
          {{ t('social.moderation.block') }}
        </button>
      </div>
    </BottomSheet>

    <ReportSheet
      :open="reportOpen"
      :user-id="author.id"
      :name="author.name"
      :session-id="id"
      can-block
      @close="reportOpen = false"
      @block="openBlock"
    />

    <BlockConfirmSheet
      :open="blockOpen"
      :user-id="author.id"
      :name="author.name"
      @close="blockOpen = false"
      @blocked="goBack"
    />
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
  margin-left: -10px;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

/* Matches ProfileView's header actions: a full 44px target, flush right. */
.icon-btn--action {
  width: 44px;
  height: 44px;
  margin-left: 0;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 12px;
}

.sheet__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.sheet__row:active {
  background: var(--color-background-mute);
}

.sheet__row--danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.msg {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
}

.byline {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.byline__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.byline__date {
  font-size: 12px;
  opacity: 0.6;
}

.notes {
  font-size: 13px;
  white-space: pre-wrap;
  opacity: 0.8;
}
</style>
