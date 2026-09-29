<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import FeedPostSummary from '@/components/social/FeedPostSummary.vue'
import FeedKudosButton from '@/components/social/FeedKudosButton.vue'
import type { FeedPost } from '@/stores/feed'
import { formatPostedAt } from '@/lib/format'

const props = defineProps<{ post: FeedPost }>()

const { locale } = useI18n()
const router = useRouter()

const postedAt = formatPostedAt(props.post.createdAt, locale.value)

function open() {
  router.push({ name: 'feed-post', params: { id: props.post.sessionId } })
}
</script>

<template>
  <article class="card" role="link" tabindex="0" @click="open" @keydown.enter="open">
    <header class="head">
      <div class="head__body">
        <span class="head__name">{{ post.posterName }}</span>
        <span class="head__meta">{{ post.session.name }} · {{ postedAt }}</span>
      </div>
      <ChevronRight :size="18" :stroke-width="2.25" class="head__chevron" />
    </header>

    <FeedPostSummary :post="post" />

    <FeedKudosButton :post="post" @click.stop />
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: pointer;
}

.card:active {
  background: var(--color-background-mute);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.head__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-heading);
}

.head__meta {
  font-size: 12px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}
</style>
