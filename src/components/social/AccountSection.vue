<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { isSupabaseConfigured } from '@/services/supabase'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const sync = useSyncStore()

const name = ref(auth.profile?.display_name ?? '')
watch(
  () => auth.profile?.display_name,
  (value) => {
    if (value) name.value = value
  },
)

const saving = ref(false)
const saved = ref(false)
const nameValid = computed(() => {
  const n = name.value.trim()
  return n.length >= 1 && n.length <= 24
})
const nameChanged = computed(() => name.value.trim() !== (auth.profile?.display_name ?? ''))

async function saveName() {
  if (!nameValid.value || !nameChanged.value) return
  saving.value = true
  try {
    await auth.updateDisplayName(name.value)
    saved.value = true
    setTimeout(() => (saved.value = false), 1500)
  } finally {
    saving.value = false
  }
}

const lastSynced = computed(() =>
  sync.lastSyncedAt
    ? t('account.lastSynced', {
        time: new Date(sync.lastSyncedAt).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' }),
      })
    : '',
)

async function logout() {
  if (!confirm(t('account.logoutConfirm'))) return
  await auth.signOut()
}

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
  <div v-if="isSupabaseConfigured" class="group">
    <h2 class="group__title">{{ t('account.title') }}</h2>

    <template v-if="!auth.isLoggedIn">
      <p class="group__hint">{{ t('account.loggedOutHint') }}</p>
      <button type="button" class="btn" @click="router.push({ name: 'social' })">
        {{ t('account.goToSocial') }}
      </button>
    </template>

    <template v-else>
      <p class="group__hint">{{ t('account.signedInAs', { email: auth.user?.email ?? '' }) }}</p>

      <label class="field">
        <span class="field__label">{{ t('account.displayName') }}</span>
        <span class="field__row">
          <input v-model="name" maxlength="24" autocomplete="nickname" @keydown.enter="saveName" />
          <button type="button" class="btn btn--small" :disabled="!nameValid || !nameChanged || saving" @click="saveName">
            {{ saved ? t('account.saved') : t('account.save') }}
          </button>
        </span>
      </label>

      <div class="sync">
        <span class="field__label">{{ t('account.sync') }}</span>
        <span class="sync__row">
          <span class="sync__status" :class="`sync__status--${sync.status}`">
            {{ t(`account.syncStatus.${sync.status}`) }}
          </span>
          <button type="button" class="btn btn--small" :disabled="sync.status === 'syncing'" @click="sync.syncNow()">
            {{ t('account.syncNow') }}
          </button>
        </span>
        <span v-if="lastSynced" class="sync__time">{{ lastSynced }}</span>
      </div>

      <button type="button" class="btn" @click="logout">{{ t('account.logout') }}</button>

      <p class="group__hint group__hint--spaced">{{ t('account.deleteHint') }}</p>
      <button v-if="!deleteOpen" type="button" class="danger-btn" @click="deleteOpen = true">
        {{ t('account.delete') }}
      </button>
      <div v-else class="delete">
        <label class="field">
          <span class="field__label">{{ t('account.deletePrompt') }}</span>
          <input v-model="deleteText" autocapitalize="characters" autocomplete="off" spellcheck="false" />
        </label>
        <button
          type="button"
          class="danger-btn"
          :disabled="deleting || deleteText.trim().toUpperCase() !== t('account.deleteWord')"
          @click="deleteAccount"
        >
          {{ deleting ? t('account.deleting') : t('account.delete') }}
        </button>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.group__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.group__hint {
  font-size: 12px;
  opacity: 0.7;
}

.group__hint--spaced {
  margin-top: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.field__row,
.sync__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

input {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-heading);
}

.sync {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sync__status {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}

.sync__status--error {
  color: #e11d48;
}

.sync__status--offline {
  color: #b45309;
}

.sync__time {
  font-size: 12px;
  opacity: 0.6;
}

.btn,
.danger-btn {
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: var(--color-text);
  background: var(--color-background-mute);
  cursor: pointer;
}

.btn--small {
  padding: 9px 12px;
  flex-shrink: 0;
}

.btn:disabled,
.danger-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.danger-btn {
  color: #fff;
  background: #e11d48;
  border-color: #e11d48;
}

.delete {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error {
  font-size: 12px;
  color: #e11d48;
}
</style>
