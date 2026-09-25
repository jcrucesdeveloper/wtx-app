<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, UserPlus } from '@lucide/vue'
import { useSocialStore } from '@/stores/social'
import { HapticsService } from '@/services/haptics'

const props = withDefaults(
  defineProps<{
    userId: string
    /** They follow you — an unfollowed button reads "Follow back". */
    followsMe?: boolean
    size?: 'small' | 'large'
  }>(),
  { followsMe: false, size: 'small' },
)

const { t } = useI18n()
const social = useSocialStore()

const isFollowing = computed(() => social.isFollowing(props.userId))
const busy = computed(() => social.pendingFollows.has(props.userId))
const failed = ref(false)

const label = computed(() => {
  if (isFollowing.value) return t('social.following')
  return props.followsMe ? t('social.followBack') : t('social.follow')
})

async function toggle() {
  failed.value = false
  const follow = !isFollowing.value
  if (follow) void HapticsService.light()
  try {
    await social.setFollowing(props.userId, follow)
  } catch {
    failed.value = true
  }
}
</script>

<template>
  <button
    type="button"
    class="follow"
    :class="[`follow--${size}`, { 'follow--on': isFollowing, 'follow--failed': failed }]"
    :disabled="busy"
    :aria-pressed="isFollowing"
    @click.stop.prevent="toggle"
  >
    <Check v-if="isFollowing" :size="size === 'large' ? 16 : 14" :stroke-width="2.75" />
    <UserPlus v-else :size="size === 'large' ? 16 : 14" :stroke-width="2.5" />
    {{ label }}
  </button>
</template>

<style scoped>
.follow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.follow--small {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.follow--large {
  height: 40px;
  padding: 0 18px;
  font-size: 14px;
}

.follow--on {
  background: transparent;
  color: var(--color-heading);
  border-color: var(--color-border);
}

.follow--failed {
  animation: shake 0.3s ease;
}

.follow:disabled {
  opacity: 0.6;
  cursor: default;
}

@keyframes shake {
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}
</style>
