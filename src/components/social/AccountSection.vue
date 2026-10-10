<script setup lang="ts">
import { computed, ref } from 'vue'
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

const deleting = ref(false)
const deleteOpen = ref(false)
const deleteText = ref('')
const deleteError = ref('')

async function deleteAccount() {
  if (deleteText.value.trim().toUpperCase() !== t('account.deleteWord')) return
  deleting.value = true
  deleteError.value = ''
  try {
    await auth.deleteAccount()
    deleteOpen.value = false
  } catch {
    deleteError.value = t('account.deleteError')
  } finally {
    deleting.value = false
  }
}
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

      <SettingsRow
        v-if="!deleteOpen"
        :label="t('account.delete')"
        :hint="t('account.deleteHint')"
        action
        danger
        @click="deleteOpen = true"
      />
      <div v-else class="delete">
        <label class="delete__field">
          <span class="delete__label">{{ t('account.deletePrompt') }}</span>
          <input v-model="deleteText" autocapitalize="characters" autocomplete="off" spellcheck="false" />
        </label>
        <p v-if="deleteError" class="delete__error">{{ deleteError }}</p>
        <div class="delete__actions">
          <button type="button" class="pill" @click="deleteOpen = false">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="pill pill--danger"
            :disabled="deleting || deleteText.trim().toUpperCase() !== t('account.deleteWord')"
            @click="deleteAccount"
          >
            {{ deleting ? t('account.deleting') : t('account.delete') }}
          </button>
        </div>
      </div>
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

.pill--danger {
  border-color: #e11d48;
  color: #e11d48;
}

.delete {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.delete__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete__label {
  font-size: 13px;
  line-height: 1.4;
}

.delete__field input {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  font: inherit;
  font-size: 16px;
  color: var(--color-heading);
  background: var(--color-background);
}

.delete__error {
  font-size: 13px;
  color: #e11d48;
}

.delete__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
