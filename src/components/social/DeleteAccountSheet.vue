<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Deleting the account from your profile's ⋯ menu — the same delete as
 * Configuration's Danger zone. Asks for the confirm word to be typed, then
 * says the account is gone before letting go.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; deleted: [] }>()

const { t } = useI18n()
const auth = useAuthStore()

const text = ref('')
const deleting = ref(false)
const failed = ref(false)
const done = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    text.value = ''
    failed.value = false
    done.value = false
  },
)

const matches = () => text.value.trim().toUpperCase() === t('account.deleteWord')

async function confirm() {
  if (deleting.value || !matches()) return
  deleting.value = true
  failed.value = false
  try {
    await auth.deleteAccount()
    done.value = true
  } catch {
    failed.value = true
  } finally {
    deleting.value = false
  }
}

function close() {
  if (deleting.value) return
  if (done.value) emit('deleted')
  emit('close')
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="done ? t('account.deletedTitle') : t('account.delete')"
    @close="close"
  >
    <div v-if="done" class="sheet" data-test="delete-account-done">
      <p class="sheet__hint">{{ t('account.deletedHint') }}</p>
      <button type="button" class="sheet__secondary" @click="close">
        {{ t('account.deletedDone') }}
      </button>
    </div>

    <div v-else class="sheet" data-test="delete-account-sheet">
      <p class="sheet__hint">{{ t('account.deleteHint') }}</p>
      <label class="sheet__field">
        <span class="sheet__label">{{ t('account.deletePrompt') }}</span>
        <input
          v-model="text"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          data-test="delete-account-input"
          @keydown.enter="confirm"
        />
      </label>
      <p v-if="failed" class="sheet__error">{{ t('account.deleteError') }}</p>
      <button
        type="button"
        class="sheet__danger"
        data-test="delete-account-confirm"
        :disabled="deleting || !matches()"
        @click="confirm"
      >
        {{ deleting ? t('account.deleting') : t('account.delete') }}
      </button>
      <button type="button" class="sheet__secondary" :disabled="deleting" @click="close">
        {{ t('common.cancel') }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 12px;
}

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet__label {
  font-size: 13px;
  line-height: 1.4;
}

.sheet__field input {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  font: inherit;
  font-size: 16px;
  color: var(--color-heading);
  background: var(--color-background);
}

.sheet__error {
  font-size: 13px;
  color: var(--color-danger);
}

.sheet__danger,
.sheet__secondary {
  min-height: 48px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.sheet__danger {
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);
}

.sheet__danger:disabled,
.sheet__secondary:disabled {
  opacity: 0.5;
  cursor: default;
}

.sheet__secondary {
  border: 1px solid var(--color-border-hover);
  background: transparent;
  color: var(--color-heading);
}
</style>
