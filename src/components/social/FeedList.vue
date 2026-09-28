<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { UserPlus } from '@lucide/vue'
import FeedPostCard from '@/components/social/FeedPostCard.vue'
import { useFeedStore } from '@/stores/feed'

const { t } = useI18n()
const router = useRouter()
const feed = useFeedStore()

onMounted(() => {
  void feed.loadFeed()
})
</script>

<template>
  <section class="feed">
    <p v-if="feed.postsError" class="msg">{{ t('social.feed.error') }}</p>

    <template v-else-if="!feed.loadingPosts && feed.posts.length === 0">
      <div class="empty">
        <p class="empty__title">{{ t('social.feed.emptyTitle') }}</p>
        <p class="empty__hint">{{ t('social.feed.emptyHint') }}</p>
        <button type="button" class="empty__cta" @click="router.push({ name: 'follow' })">
          <UserPlus :size="16" :stroke-width="2.25" />
          {{ t('social.feed.emptyCta') }}
        </button>
      </div>
    </template>

    <template v-else>
      <FeedPostCard v-for="post in feed.posts" :key="post.sessionId" :post="post" />
      <button
        v-if="feed.hasMore"
        type="button"
        class="more"
        :disabled="feed.loadingPosts"
        @click="feed.loadMore()"
      >
        {{ feed.loadingPosts ? t('social.feed.loading') : t('social.feed.loadMore') }}
      </button>
    </template>

    <p v-if="feed.loadingPosts && feed.posts.length === 0" class="msg">{{ t('social.feed.loading') }}</p>
  </section>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 20px;
  text-align: center;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
}

.empty__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 32ch;
}

.empty__cta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  border: none;
  border-radius: var(--radius-md);
  padding: 11px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.more {
  align-self: center;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  padding: 9px 16px;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.more:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
