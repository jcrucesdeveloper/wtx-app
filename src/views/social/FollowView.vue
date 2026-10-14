<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import FollowMeCard from '@/components/social/FollowMeCard.vue'
import { FollowError, useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import { HapticsService } from '@/services/haptics'
import {
  FOLLOW_CODE_LENGTH,
  buildFollowUrl,
  isValidFollowCode,
  normalizeFollowCode,
} from '@/lib/followCode'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const feed = useFeedStore()
const auth = useAuthStore()

const myCode = computed(() => auth.inviteCode ?? '')
const followUrl = computed(() =>
  myCode.value ? buildFollowUrl(myCode.value, router.resolve({ name: 'follow' }).href) : '',
)

const code = ref('')
const following = ref(false)
const error = ref('')
/**
 * Who was just followed. Following is one tap with no preview, so the answer
 * has to be impossible to miss and has to say who: it opens over the screen
 * and stays until it is dismissed.
 */
const followed = ref<{ id: string; name: string } | null>(null)

const normalized = computed(() => normalizeFollowCode(code.value))
const canFollow = computed(() => isValidFollowCode(normalized.value) && !following.value)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  code.value = normalizeFollowCode(input.value).slice(0, FOLLOW_CODE_LENGTH)
  input.value = code.value
  error.value = ''
}

async function follow(value = normalized.value) {
  if (!isValidFollowCode(value) || following.value) return
  following.value = true
  error.value = ''
  try {
    const profile = await feed.followByCode(value)
    followed.value = { id: profile.id, name: profile.display_name }
    code.value = ''
    void HapticsService.success()
  } catch (e) {
    error.value = t(`social.follow.errors.${e instanceof FollowError ? e.code : 'unknown'}`)
  } finally {
    following.value = false
  }
}

onMounted(() => {
  const fromLink = typeof route.query.follow === 'string' ? normalizeFollowCode(route.query.follow) : ''
  if (isValidFollowCode(fromLink)) {
    code.value = fromLink
    void follow(fromLink)
  }
})

function viewFollowed() {
  const id = followed.value?.id
  followed.value = null
  if (id) void router.push({ name: 'profile', params: { id } })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage sub :title="t('social.follow.title')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <div class="stack">
      <FollowMeCard v-if="myCode" :code="myCode" :follow-url="followUrl" />

      <form class="form" @submit.prevent="follow()">
        <p class="hint">{{ t('social.follow.enterHint') }}</p>

        <label class="code">
          <span class="sr-only">{{ t('social.follow.codeLabel') }}</span>
          <input
            :value="code"
            class="code__input"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            inputmode="text"
            :maxlength="FOLLOW_CODE_LENGTH + 2"
            placeholder="K7QM 3X9P"
            @input="onInput"
          />
        </label>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button type="submit" class="primary" :disabled="!canFollow">
          {{ following ? t('social.follow.following') : t('social.follow.follow') }}
        </button>
      </form>

    </div>

    <!-- Unfollowing is deliberately not on this screen: it lives on the
         person's profile and in your connections, behind a confirmation. -->
    <BottomSheet
      :open="followed !== null"
      :title="t('social.follow.followedTitle')"
      @close="followed = null"
    >
      <div v-if="followed" class="followed" role="status">
        <UserAvatar :id="followed.id" :name="followed.name" :size="72" />
        <p class="followed__name">{{ followed.name }}</p>
        <p class="followed__hint">{{ t('social.follow.followedHint', { name: followed.name }) }}</p>
      </div>
      <AppButton variant="primary" size="lg" block @click="followed = null">
        {{ t('social.follow.followedDone') }}
      </AppButton>
      <AppButton block @click="viewFollowed">{{ t('social.follow.viewProfile') }}</AppButton>
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

.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  font-size: 13px;
  opacity: 0.75;
}

.code__input {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
  padding: 14px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-heading);
}

.code__input::placeholder {
  opacity: 0.25;
}

.code__input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.error {
  font-size: 13px;
  color: var(--color-danger);
  text-align: center;
}

.followed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0 var(--space-3);
  text-align: center;
}

.followed__name {
  margin-top: var(--space-2);
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.followed__hint {
  font-size: var(--text-small);
}

.primary {
  border: none;
  border-radius: 14px;
  padding: 13px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-on-accent);
  background: var(--color-accent);
  cursor: pointer;
  min-height: var(--size-control);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
