<script lang="ts">
import { reactive } from 'vue'

/**
 * Kept outside the component so the form (and which mode it's in) survives a
 * trip to the Terms / Privacy pages and back. Never persisted.
 */
const draft = reactive({
  mode: 'login' as 'login' | 'signup',
  name: '',
  email: '',
  password: '',
  consent: false,
})
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConsentNotice from '@/components/social/ConsentNotice.vue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'

const emit = defineEmits<{
  /** Logged in (or signed up) and the first sync has run. */
  done: []
}>()

const { t } = useI18n()
const auth = useAuthStore()
const sync = useSyncStore()

const phase = ref<'form' | 'working' | 'syncing' | 'confirm-email'>('form')
const error = ref('')

function setMode(mode: 'login' | 'signup') {
  draft.mode = mode
  error.value = ''
  phase.value = 'form'
}

function messageFor(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'invalid_credentials') return t('auth.errors.invalidCredentials')
  if (code === 'user_already_exists' || code === 'email_exists') return t('auth.errors.emailTaken')
  if (code === 'weak_password') return t('auth.errors.weakPassword')
  if (code === 'email_not_confirmed') return t('auth.errors.emailNotConfirmed')
  return (e as { message?: string })?.message || t('auth.errors.generic')
}

function validate(): string {
  if (draft.mode === 'signup') {
    const name = draft.name.trim()
    if (name.length < 1 || name.length > 24) return t('auth.errors.nameRequired')
  }
  if (draft.password.length < 6) return t('auth.errors.weakPassword')
  if (draft.mode === 'signup' && !draft.consent) return t('auth.errors.consentRequired')
  return ''
}

async function submit() {
  error.value = validate()
  if (error.value) return

  phase.value = 'working'
  try {
    if (draft.mode === 'signup') {
      const result = await auth.signUp(draft.email, draft.password, draft.name)
      if (result === 'confirm-email') {
        phase.value = 'confirm-email'
        return
      }
    } else {
      await auth.signIn(draft.email, draft.password)
    }

    // First sync uploads what's on the device (and pulls what's in the account).
    phase.value = 'syncing'
    await sync.syncNow()

    Object.assign(draft, { mode: 'login', name: '', email: '', password: '', consent: false })
    phase.value = 'form'
    emit('done')
  } catch (e) {
    error.value = messageFor(e)
    phase.value = 'form'
  }
}
</script>

<template>
  <div v-if="phase === 'confirm-email'" class="notice">
    <p>{{ t('auth.confirmEmail') }}</p>
    <button type="button" class="primary" @click="setMode('login')">{{ t('auth.logIn') }}</button>
  </div>

  <p v-else-if="phase === 'syncing'" class="notice">{{ t('auth.syncing') }}</p>

  <form v-else class="form" novalidate @submit.prevent="submit">
    <h2 class="title">{{ draft.mode === 'login' ? t('auth.logIn') : t('auth.signUp') }}</h2>

    <label v-if="draft.mode === 'signup'" class="field">
      <span class="field__label">{{ t('auth.displayName') }}</span>
      <input
        v-model="draft.name"
        maxlength="24"
        autocomplete="nickname"
        :placeholder="t('auth.displayNamePlaceholder')"
      />
    </label>

    <label class="field">
      <span class="field__label">{{ t('auth.email') }}</span>
      <input
        v-model="draft.email"
        type="email"
        autocomplete="email"
        inputmode="email"
        autocapitalize="off"
        spellcheck="false"
        :placeholder="t('auth.emailPlaceholder')"
      />
    </label>

    <label class="field">
      <span class="field__label">{{ t('auth.password') }}</span>
      <input
        v-model="draft.password"
        type="password"
        :autocomplete="draft.mode === 'signup' ? 'new-password' : 'current-password'"
        :placeholder="draft.mode === 'signup' ? t('auth.passwordHint') : ''"
      />
    </label>

    <ConsentNotice v-if="draft.mode === 'signup'" v-model="draft.consent" />

    <p v-if="error" class="error">{{ error }}</p>

    <button
      type="submit"
      class="primary"
      :disabled="phase === 'working' || (draft.mode === 'signup' && !draft.consent)"
    >
      {{
        phase === 'working'
          ? t('auth.working')
          : draft.mode === 'login'
            ? t('auth.logIn')
            : t('auth.signUp')
      }}
    </button>

    <p class="switch">
      <template v-if="draft.mode === 'login'">
        {{ t('auth.noAccount') }}
        <button type="button" class="switch__link" @click="setMode('signup')">{{ t('auth.signUp') }}</button>
      </template>
      <template v-else>
        {{ t('auth.haveAccount') }}
        <button type="button" class="switch__link" @click="setMode('login')">{{ t('auth.logIn') }}</button>
      </template>
    </p>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
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

.switch {
  text-align: center;
  font-size: 13px;
  opacity: 0.85;
}

.switch__link {
  border: none;
  background: transparent;
  padding: 0 2px;
  font: inherit;
  font-weight: 700;
  color: var(--color-accent);
  cursor: pointer;
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
