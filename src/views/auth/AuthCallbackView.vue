<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

/**
 * Landing page for the sign-up confirmation email (`emailRedirectTo`). On the
 * web the link opens it directly; on a phone the deep-link handler routes the
 * universal/app link here. Either way the URL carries the session, which is
 * handed to Supabase before moving on to Social.
 */
const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const state = ref<'working' | 'expired' | 'invalid'>('working')

onMounted(async () => {
  if (!isSupabaseConfigured) {
    state.value = 'invalid'
    return
  }
  const result = await auth.completeAuthRedirect(window.location.href)
  if (result.status === 'signed-in') {
    router.replace(result.recovery ? { name: 'auth-reset' } : { name: 'social' })
  } else if (result.status === 'none') {
    // Nothing in the URL — e.g. a reload after the session was already taken.
    if (auth.isLoggedIn) router.replace({ name: 'social' })
    else state.value = 'invalid'
  } else {
    state.value = result.reason
  }
})
</script>

<template>
  <AppPage :title="t('auth.callback.title')">
    <p v-if="state === 'working'" class="notice">{{ t('auth.callback.working') }}</p>
    <div v-else class="notice">
      <p>{{ state === 'expired' ? t('auth.callback.expired') : t('auth.callback.invalid') }}</p>
      <button type="button" class="primary" @click="router.replace({ name: 'social' })">
        {{ t('auth.callback.goToSocial') }}
      </button>
    </div>
  </AppPage>
</template>

<style scoped>
.notice {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 48px 8px;
  text-align: center;
  font-size: 14px;
  color: var(--color-heading);
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
</style>
