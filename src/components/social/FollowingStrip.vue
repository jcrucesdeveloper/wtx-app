<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { useFeedStore } from '@/stores/feed'
import { initials, memberColor } from '@/lib/memberColors'

const { t } = useI18n()
const router = useRouter()
const feed = useFeedStore()

onMounted(() => {
  void feed.loadFollowing()
})

function openFollow() {
  router.push({ name: 'follow' })
}
</script>

<template>
  <div class="strip">
    <button type="button" class="strip__label" @click="openFollow">
      {{ t('social.follow.followingTitle') }}
    </button>

    <p v-if="!feed.followingLoading && feed.following.length === 0" class="empty">
      <button type="button" class="empty__cta" @click="openFollow">
        {{ t('social.follow.followingEmptyCta') }}
      </button>
    </p>

    <div v-else class="row">
      <button
        v-for="(user, i) in feed.following"
        :key="user.id"
        type="button"
        class="chip"
        @click="openFollow"
      >
        <span class="chip__avatar" :style="{ background: memberColor(i) }">{{ initials(user.displayName) }}</span>
        <span class="chip__name">{{ user.displayName }}</span>
      </button>
      <button type="button" class="chip chip--add" :aria-label="t('social.follow.title')" @click="openFollow">
        <Plus :size="16" :stroke-width="2.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strip__label {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.empty {
  display: flex;
}

.empty__cta {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  background: none;
  cursor: pointer;
}

.row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  min-width: 0;
}

.chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  width: 56px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
}

.chip__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.chip__name {
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip--add {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  align-self: flex-start;
  border-radius: 50%;
  border: 1px dashed var(--color-border-hover);
  color: var(--color-text);
  opacity: 0.7;
}
</style>
