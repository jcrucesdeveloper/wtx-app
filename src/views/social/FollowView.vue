<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, UserMinus } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import FollowMeCard from '@/components/social/FollowMeCard.vue'
import { FollowError, useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
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
const followedName = ref('')

const normalized = computed(() => normalizeFollowCode(code.value))
const canFollow = computed(() => isValidFollowCode(normalized.value) && !following.value)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  code.value = normalizeFollowCode(input.value).slice(0, FOLLOW_CODE_LENGTH)
  input.value = code.value
  error.value = ''
  followedName.value = ''
}

async function follow(value = normalized.value) {
  if (!isValidFollowCode(value) || following.value) return
  following.value = true
  error.value = ''
  followedName.value = ''
  try {
    const profile = await feed.followByCode(value)
    followedName.value = profile.display_name
    code.value = ''
  } catch (e) {
    error.value = t(`social.follow.errors.${e instanceof FollowError ? e.code : 'unknown'}`)
  } finally {
    following.value = false
  }
}

onMounted(() => {
  void feed.loadFollowing()
  const fromLink = typeof route.query.follow === 'string' ? normalizeFollowCode(route.query.follow) : ''
  if (isValidFollowCode(fromLink)) {
    code.value = fromLink
    void follow(fromLink)
  }
})

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

        <p v-if="error" class="error">{{ error }}</p>
        <p v-else-if="followedName" class="success">{{ t('social.follow.nowFollowing', { name: followedName }) }}</p>

        <button type="submit" class="primary" :disabled="!canFollow">
          {{ following ? t('social.follow.following') : t('social.follow.follow') }}
        </button>
      </form>

      <section class="list">
        <h2 class="list__title">{{ t('social.follow.followingTitle') }}</h2>
        <p v-if="!feed.followingLoading && feed.following.length === 0" class="list__empty">
          {{ t('social.follow.followingEmpty') }}
        </p>
        <ul v-else class="list__items">
          <li v-for="user in feed.following" :key="user.id" class="list__row">
            <span class="list__name">{{ user.displayName }}</span>
            <button
              type="button"
              class="unfollow"
              :aria-label="t('social.follow.unfollowAria', { name: user.displayName })"
              @click="feed.unfollow(user.id).catch(() => {})"
            >
              <UserMinus :size="16" :stroke-width="2.25" />
            </button>
          </li>
        </ul>
      </section>
    </div>
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

.success {
  font-size: 13px;
  color: #16a34a;
  text-align: center;
  font-weight: 600;
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

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list__title {
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--color-heading);
}

.list__empty {
  font-size: 13px;
  opacity: 0.6;
}

.list__items {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.list__name {
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unfollow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.7;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
