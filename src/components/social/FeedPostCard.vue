<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import FeedPostSummary from '@/components/social/FeedPostSummary.vue'
import FeedKudosButton from '@/components/social/FeedKudosButton.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import type { FeedPost } from '@/stores/feed'
import { formatPostedAt } from '@/lib/format'

const props = defineProps<{ post: FeedPost }>()

const { locale } = useI18n()
const router = useRouter()

const postedAt = formatPostedAt(props.post.createdAt, locale.value)

function open() {
  router.push({ name: 'feed-post', params: { id: props.post.sessionId } })
}

function openProfile() {
  router.push({ name: 'profile', params: { id: props.post.posterId } })
}
</script>

<template>
  <article class="card" role="link" tabindex="0" @click="open" @keydown.enter="open">
    <header class="head">
      <button type="button" class="head__who" @click.stop="openProfile">
        <UserAvatar :id="post.posterId" :name="post.posterName" :size="36" />
        <span class="head__body">
          <span class="head__name">{{ post.posterName }}</span>
          <span class="head__meta">{{ post.session.name }} · {{ postedAt }}</span>
        </span>
      </button>
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
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: none;
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

.head__who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.head__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.head__name {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.head__meta {
  font-size: var(--text-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}
</style>
