<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

/**
 * Deleting the account, for Configuration's Danger zone. Only there when an
 * account exists to delete. Asks for the confirm word to be typed, never a
 * single tap.
 */
const { t } = useI18n()
const auth = useAuthStore()

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
  <template v-if="isSupabaseConfigured && auth.isLoggedIn">
    <SettingsRow
      v-if="!deleteOpen"
      :label="t('account.delete')"
      :hint="t('account.deleteHint')"
      action
      danger
      data-test="delete-account"
      @click="deleteOpen = true"
    />
    <div v-else class="delete" data-test="delete-account-form">
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
          data-test="delete-account-confirm"
          :disabled="deleting || deleteText.trim().toUpperCase() !== t('account.deleteWord')"
          @click="deleteAccount"
        >
          {{ deleting ? t('account.deleting') : t('account.delete') }}
        </button>
      </div>
    </div>
  </template>
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
  border-color: var(--color-danger);
  color: var(--color-danger);
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
  color: var(--color-danger);
}

.delete__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
