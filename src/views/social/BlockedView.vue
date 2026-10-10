<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useModerationStore, type BlockedUser } from '@/stores/moderation'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const moderation = useModerationStore()

onMounted(() => {
  void moderation.loadBlocked({ force: true })
})

// Unblock is confirmed in a sheet: it doesn't restore follows, which is worth saying first.
const unblocking = ref<BlockedUser | null>(null)
const failed = ref(false)

async function confirmUnblock() {
  const target = unblocking.value
  unblocking.value = null
  if (!target) return
  failed.value = false
  try {
    await moderation.unblock(target.id)
  } catch {
    failed.value = true
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'profile', params: { id: auth.user?.id ?? '' } })
}
</script>

<template>
  <AppPage sub :title="t('social.moderation.blockedAccounts')">
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

    <p v-if="failed" class="error">{{ t('social.moderation.failed') }}</p>

    <p v-if="moderation.loading && moderation.blocked.length === 0" class="muted">
      {{ t('social.feed.loading') }}
    </p>

    <div v-else-if="moderation.blocked.length === 0" class="empty">
      <p class="empty__title">{{ t('social.moderation.blockedEmptyTitle') }}</p>
      <p class="empty__hint">{{ t('social.moderation.blockedEmptyHint') }}</p>
    </div>

    <ul v-else class="list">
      <li v-for="user in moderation.blocked" :key="user.id" class="row">
        <UserAvatar :id="user.id" :name="user.displayName" :size="40" />
        <span class="row__name">{{ user.displayName }}</span>
        <button type="button" class="secondary" @click="unblocking = user">
          {{ t('social.moderation.unblock') }}
        </button>
      </li>
    </ul>

    <BottomSheet
      :open="!!unblocking"
      :title="unblocking?.displayName ?? ''"
      @close="unblocking = null"
    >
      <div class="sheet">
        <p class="sheet__hint">
          {{ t('social.moderation.unblockHint', { name: unblocking?.displayName ?? '' }) }}
        </p>
        <button type="button" class="sheet__primary" @click="confirmUnblock">
          {{ t('social.moderation.unblock') }}
        </button>
      </div>
    </BottomSheet>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
  margin-left: -10px;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.row__name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secondary {
  min-height: 44px;
  padding: 0 14px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.secondary:active {
  background: var(--color-background-mute);
}

.muted {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}

.error {
  font-size: 13px;
  color: var(--color-danger);
  margin-bottom: 8px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
}

.empty__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 34ch;
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

.sheet__primary {
  min-height: 48px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
