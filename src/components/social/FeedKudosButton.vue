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
  border: none;
  border-radius: var(--radius-pill);
  padding: 0 14px;
  font-size: 14px;
  background: var(--color-background-mute);
  cursor: pointer;
  min-height: 40px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.kudos--on {
  background: var(--color-background-mute);
  box-shadow: inset 0 0 0 1.5px var(--color-heading);
}
</style>
