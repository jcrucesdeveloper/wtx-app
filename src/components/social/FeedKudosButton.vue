<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FeedLikersSheet from '@/components/social/FeedLikersSheet.vue'
import { useFeedStore, type FeedPost } from '@/stores/feed'

const props = defineProps<{ post: FeedPost }>()

const { t } = useI18n()
const feed = useFeedStore()

/** The post whose likers sheet is open, or null — tapping the count opens it, like Instagram. */
const likersOf = ref<string | null>(null)

function toggleKudos() {
  void feed.toggleKudos(props.post.sessionId)
}
</script>

<template>
  <div class="kudos">
    <button
      type="button"
      class="kudos__give"
      :class="{ 'kudos__give--on': post.kudosByMe }"
      :aria-pressed="post.kudosByMe"
      :aria-label="t('social.feed.kudosAria')"
      @click="toggleKudos"
    >
      💪
    </button>
    <button
      v-if="post.kudosCount > 0"
      type="button"
      class="kudos__count"
      :aria-label="t('social.likers.openAria', { count: post.kudosCount }, post.kudosCount)"
      @click="likersOf = post.sessionId"
    >
      {{ post.kudosCount }}
    </button>
    <FeedLikersSheet :session-id="likersOf" @close="likersOf = null" />
  </div>
</template>

<style scoped>
.kudos {
  display: flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
}

.kudos__give {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 14px;
  background: var(--color-background-mute);
  cursor: pointer;
}

.kudos__give--on {
  box-shadow: inset 0 0 0 1.5px var(--color-heading);
}

.kudos__count {
  min-width: 40px;
  min-height: 40px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  font-size: 14px;
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.kudos__count:active {
  background: var(--color-background-mute);
}
</style>
