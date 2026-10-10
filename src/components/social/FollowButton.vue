<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useProfileStore } from '@/stores/profile'
import { FollowError } from '@/stores/feed'

const props = withDefaults(
  defineProps<{
    userId: string
    name: string
    iFollow: boolean
    followsMe: boolean
    /** Compact variant for list rows. */
    small?: boolean
  }>(),
  { small: false },
)

const { t } = useI18n()
const profiles = useProfileStore()

const busy = ref(false)
const sheetOpen = ref(false)
/** The i18n key of the last failure, or '' — a throttled follow gets its own message. */
const failed = ref('')

/** Follow → Follow back (they follow you) → Following, the standard social-app states. */
const label = computed(() => {
  if (props.iFollow) return t('social.profile.following')
  return props.followsMe ? t('social.profile.followBack') : t('social.profile.follow')
})

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  failed.value = ''
  try {
    await action()
  } catch (e) {
    failed.value =
      e instanceof FollowError && e.code === 'rate_limited'
        ? 'social.follow.errors.rate_limited'
        : 'social.profile.actionFailed'
  } finally {
    busy.value = false
  }
}

function onClick() {
  if (props.iFollow) sheetOpen.value = true
  else void run(() => profiles.follow(props.userId))
}

function unfollow() {
  sheetOpen.value = false
  void run(() => profiles.unfollow(props.userId))
}
</script>

<template>
  <div class="wrap">
    <button
      type="button"
      class="follow"
      :class="{ 'follow--on': iFollow, 'follow--small': small }"
      :disabled="busy"
      :aria-haspopup="iFollow ? 'dialog' : undefined"
      @click.stop="onClick"
    >
      {{ label }}
      <ChevronDown v-if="iFollow" :size="14" :stroke-width="2.5" />
    </button>
    <span v-if="failed" class="error" role="status">{{ t(failed) }}</span>

    <BottomSheet :open="sheetOpen" :title="name" @close="sheetOpen = false">
      <div class="sheet">
        <p class="sheet__hint">{{ t('social.profile.unfollowHint', { name }) }}</p>
        <button type="button" class="sheet__danger" @click="unfollow">
          {{ t('social.profile.unfollow') }}
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.follow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-accent);
  border-radius: 14px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.follow--on {
  border-color: var(--color-border-hover);
  background: transparent;
  color: var(--color-heading);
}

.follow--small {
  min-height: 36px;
  padding: 0 12px;
  font-size: 11px;
}

.follow:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  font-size: 12px;
  color: var(--color-danger);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 12px;
}

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__danger {
  min-height: 48px;
  border: 1px solid var(--color-danger);
  border-radius: 14px;
  background: transparent;
  color: var(--color-danger);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
