<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFeedStore, type FeedPost } from '@/stores/feed'

const props = defineProps<{ post: FeedPost }>()

const { t } = useI18n()
const feed = useFeedStore()

function toggleKudos() {
  void feed.toggleKudos(props.post.sessionId)
}
</script>

<template>
  <button
    type="button"
    class="kudos"
    :class="{ 'kudos--on': post.kudosByMe }"
    :aria-pressed="post.kudosByMe"
    :aria-label="t('social.feed.kudosAria')"
    @click="toggleKudos"
  >
    💪 <span v-if="post.kudosCount > 0">{{ post.kudosCount }}</span>
  </button>
</template>

<style scoped>
.kudos {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  font-size: 14px;
  background: var(--color-background-mute);
  cursor: pointer;
}

.kudos--on {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 15%, var(--color-background-mute));
}
</style>
