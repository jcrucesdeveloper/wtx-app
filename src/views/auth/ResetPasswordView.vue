<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import { openForgotPassword } from '@/components/social/AuthForm.vue'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

/** Same rule as sign-up (`AuthForm`) — and Supabase's default minimum. */
const MIN_PASSWORD_LENGTH = 6

/**
 * Where the password recovery email lands (`resetPasswordForEmail`'s
 * `redirectTo`). The link logs the account in with a recovery session; this
 * page then sets the new password.
 */
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const state = ref<'checking' | 'form' | 'saving' | 'done' | 'expired' | 'invalid'>('checking')
const password = ref('')
const confirm = ref('')
const error = ref('')

onMounted(async () => {
  if (!isSupabaseConfigured) {
    state.value = 'invalid'
    return
  }
  const result = await auth.completeAuthRedirect(window.location.href)
  if (result.status === 'error') {
    state.value = result.reason
    return
  }
  if (result.status === 'signed-in') {
    // Drop the one-time tokens from the address bar / history.
    await router.replace({ name: 'auth-reset' })
    state.value = 'form'
    return
  }
  state.value = auth.isLoggedIn ? 'form' : 'invalid'
})

function messageFor(e: unknown): string {
  const err = e as { code?: string; name?: string; message?: string }
  if (err?.code === 'weak_password') return t('auth.errors.weakPassword')
  if (err?.code === 'same_password') return t('auth.reset.samePassword')
  if (err?.name === 'AuthSessionMissingError' || err?.code === 'session_not_found') {
    return t('auth.reset.expired')
  }
  return err?.message || t('auth.errors.generic')
}

async function save() {
  error.value = ''
  if (password.value.length < MIN_PASSWORD_LENGTH) {
    error.value = t('auth.errors.weakPassword')
    return
  }
  if (password.value !== confirm.value) {
    error.value = t('auth.reset.mismatch')
    return
  }
  state.value = 'saving'
  try {
    await auth.updatePassword(password.value)
    password.value = ''
    confirm.value = ''
    state.value = 'done'
  } catch (e) {
    error.value = messageFor(e)
    state.value = 'form'
  }
}

function requestNewLink() {
  openForgotPassword()
  router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage :title="t('auth.reset.title')">
    <p v-if="state === 'checking'" class="notice">{{ t('auth.reset.checking') }}</p>

    <div v-else-if="state === 'expired' || state === 'invalid'" class="notice">
      <p>{{ state === 'expired' ? t('auth.reset.expired') : t('auth.reset.invalid') }}</p>
      <button type="button" class="primary" @click="requestNewLink">
        {{ t('auth.reset.requestNew') }}
      </button>
    </div>

    <div v-else-if="state === 'done'" class="notice">
      <p>{{ t('auth.reset.done') }}</p>
      <button type="button" class="primary" @click="router.replace({ name: 'social' })">
        {{ t('auth.reset.continue') }}
      </button>
    </div>

    <form v-else class="form" novalidate @submit.prevent="save">
      <p class="hint">{{ t('auth.reset.hint') }}</p>

      <label class="field">
        <span class="field__label">{{ t('auth.reset.newPassword') }}</span>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.passwordHint')"
        />
      </label>

      <label class="field">
        <span class="field__label">{{ t('auth.reset.confirmPassword') }}</span>
        <input v-model="confirm" type="password" autocomplete="new-password" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="primary" :disabled="state === 'saving'">
        {{ state === 'saving' ? t('auth.working') : t('auth.reset.save') }}
      </button>
    </form>
  </AppPage>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  font-size: 13px;
  opacity: 0.75;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field__label {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.7;
}

input {
  width: 100%;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.error {
  font-size: 13px;
  color: #e11d48;
}

.primary {
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.notice {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 48px 8px;
  text-align: center;
  font-size: 14px;
  color: var(--color-heading);
}
</style>
