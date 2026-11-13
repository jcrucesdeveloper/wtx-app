<script setup lang="ts">
// Deleting the account lives in Configuration's Danger zone (DeleteAccountRow.vue).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useAuthStore } from '@/stores/auth'
import { useLogout } from '@/composables/useLogout'
import { useSyncStore } from '@/stores/sync'
import { isSupabaseConfigured } from '@/services/supabase'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const sync = useSyncStore()

/** "Up to date · Last synced 14:05" — the state, then when. */
const syncLine = computed(() => {
  const status = t(`account.syncStatus.${sync.status}`)
  if (!sync.lastSyncedAt) return status
  const time = new Date(sync.lastSyncedAt).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${status} · ${t('account.lastSynced', { time })}`
})

/** Your name and bio are edited on your profile, where people see them. */
function openProfile() {
  if (auth.user) router.push({ name: 'profile', params: { id: auth.user.id } })
}

const { logout, loggingOut } = useLogout()
</script>

<template>
  <SettingsGroup v-if="isSupabaseConfigured" :title="t('account.title')">
    <SettingsRow
      v-if="!auth.isLoggedIn"
      :label="t('account.goToSocial')"
      :hint="t('account.loggedOutHint')"
      action
      @click="router.push({ name: 'social' })"
    />

    <template v-else>
      <SettingsRow
        :label="auth.profile?.display_name ?? t('social.profile.openMine')"
        :hint="auth.user?.email ?? ''"
        action
        @click="openProfile"
      />

      <SettingsRow :label="t('account.sync')" :hint="syncLine">
        <button
          type="button"
          class="pill"
          :disabled="sync.status === 'syncing'"
          @click="sync.syncNow({ force: true })"
        >
          {{ t('account.syncNow') }}
        </button>
      </SettingsRow>

      <SettingsRow
        :label="loggingOut ? t('account.logoutChecking') : t('account.logout')"
        :disabled="loggingOut"
        action
        @click="logout"
      />
    </template>
  </SettingsGroup>
</template>

<style scoped>
.pill {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 999px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}

.pill:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
