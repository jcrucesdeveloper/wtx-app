<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import FriendsHome from '@/components/social/FriendsHome.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { isSupabaseConfigured } from '@/services/supabase'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** After logging in, return to wherever sent us here (e.g. a join link), else stay on Friends. */
function onAuthDone() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) router.replace(redirect)
}
</script>

<template>
  <AppPage :title="t('nav.friends')">
    <!-- Your profile, top right — where social apps put "you". -->
    <template v-if="isSupabaseConfigured && auth.isLoggedIn && auth.user" #actions>
      <button
        type="button"
        class="me"
        :aria-label="t('social.profile.openMine')"
        @click="router.push({ name: 'profile', params: { id: auth.user.id } })"
      >
        <UserAvatar :id="auth.user.id" :name="auth.profile?.display_name ?? '?'" :size="36" />
      </button>
    </template>

    <!-- No backend configured: the app is local-only. -->
    <div v-if="!isSupabaseConfigured" class="empty">
      <p class="empty__title">{{ t('social.notConfiguredTitle') }}</p>
      <p class="empty__hint">{{ t('social.notConfiguredHint') }}</p>
    </div>

    <div v-else-if="!auth.ready" class="loading" aria-busy="true">
      <SkeletonBlock height="196px" radius="xl" />
      <SkeletonBlock width="40%" height="20px" />
      <SkeletonBlock height="64px" radius="lg" />
    </div>

    <FriendsHome v-else @auth-done="onAuthDone" />
  </AppPage>
</template>

<style scoped>
.me {
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  margin-right: -4px;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-8);
}

.empty__title {
  font-size: var(--text-title);
  font-weight: var(--weight-heavy);
  color: var(--color-heading);
}

.empty__hint {
  font-size: var(--text-body);
}
</style>
