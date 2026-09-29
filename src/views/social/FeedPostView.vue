<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import FeedPostSummary from '@/components/social/FeedPostSummary.vue'
import FeedKudosButton from '@/components/social/FeedKudosButton.vue'
import { useFeedStore } from '@/stores/feed'
import { formatPostedAt } from '@/lib/format'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const feed = useFeedStore()

const id = computed(() => String(route.params.id))
const post = computed(() => feed.getPost(id.value))
const loading = ref(false)

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
  <AppPage :title="post?.session.name ?? t('social.feed.postTitle')">
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

    <p v-if="loading" class="msg">{{ t('social.feed.loading') }}</p>
    <p v-else-if="!post" class="msg">{{ t('social.feed.notFound') }}</p>

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
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  margin-left: -4px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn:active {
  background: var(--color-background-mute);
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
