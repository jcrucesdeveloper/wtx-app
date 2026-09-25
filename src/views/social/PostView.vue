<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BookmarkPlus, Send, Trash2, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import FeedCard from '@/components/social/FeedCard.vue'
import UserAvatar from '@/components/social/UserAvatar.vue'
import LoggedExerciseList from '@/components/session/LoggedExerciseList.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoutinesStore } from '@/stores/routines'
import { useSocialStore, type Comment } from '@/stores/social'
import { routineDraftFromWorkout } from '@/lib/sessionToRoutine'
import { serializeTemplate } from '@/lib/serializeRoutine'
import { formatRelativeTime } from '@/lib/relativeTime'
import { scrollAppToTop } from '@/lib/scrollAppToTop'

const COMMENT_MAX = 500

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const routines = useRoutinesStore()
const social = useSocialStore()

const postId = computed(() => String(route.params.id))
const post = computed(() => social.posts.get(postId.value))
const isMine = computed(() => post.value?.userId === auth.user?.id)

const status = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const comments = ref<Comment[]>([])
const kudosGivers = ref<{ user_id: string; display_name: string }[]>([])

async function load() {
  const id = postId.value
  if (route.hash !== '#comments') scrollAppToTop()
  status.value = post.value ? 'ready' : 'loading'
  try {
    const found = await social.fetchPost(id)
    if (id !== postId.value) return
    if (!found) {
      status.value = 'missing'
      return
    }
    status.value = 'ready'
    const [c, k] = await Promise.all([social.fetchComments(id), social.fetchKudosGivers(id)])
    if (id !== postId.value) return
    comments.value = c
    kudosGivers.value = k
    if (route.hash === '#comments') {
      await nextTick()
      document.getElementById('comments')?.scrollIntoView({ block: 'start' })
    }
  } catch {
    if (id === postId.value && !post.value) status.value = 'error'
  }
}

watch(postId, () => void load(), { immediate: true })

// Keep the "who gave kudos" row in step with the button on the card.
watch(
  () => post.value?.gaveKudos,
  (gave, before) => {
    const uid = auth.user?.id
    if (!uid || before === undefined || gave === undefined) return
    kudosGivers.value = kudosGivers.value.filter((k) => k.user_id !== uid)
    if (gave) kudosGivers.value.unshift({ user_id: uid, display_name: auth.profile?.display_name ?? '' })
  },
)

const draft = ref('')
const sending = ref(false)
const sendError = ref(false)
const canSend = computed(() => draft.value.trim().length > 0 && draft.value.length <= COMMENT_MAX && !sending.value)

async function send() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = false
  try {
    comments.value.push(await social.addComment(postId.value, draft.value))
    draft.value = ''
  } catch {
    sendError.value = true
  } finally {
    sending.value = false
  }
}

function canDelete(comment: Comment): boolean {
  return comment.user_id === auth.user?.id || isMine.value
}

async function remove(comment: Comment) {
  const before = comments.value
  comments.value = comments.value.filter((c) => c.id !== comment.id)
  try {
    await social.deleteComment(postId.value, comment.id)
  } catch {
    comments.value = before
  }
}

const savedRoutineId = ref<string | null>(null)

/** Copies someone's workout into your routine library, so you can train it too. */
function saveAsRoutine() {
  const session = post.value?.session
  if (!session || savedRoutineId.value) return
  const name = isMine.value
    ? session.name
    : t('social.post.routineName', { name: session.name, who: post.value!.displayName })
  const text = serializeTemplate(routineDraftFromWorkout(session, name))
  savedRoutineId.value = routines.add(text, `${name}.wtt`).id
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage :title="t('social.post.title')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('social.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <p v-if="status === 'loading'" class="note">{{ t('social.loading') }}</p>
    <div v-else-if="status === 'missing' || status === 'error'" class="note">
      <p>{{ status === 'missing' ? t('social.post.missing') : t('social.loadError') }}</p>
      <button v-if="status === 'error'" type="button" class="btn btn--ghost" @click="load">{{ t('social.retry') }}</button>
    </div>

    <div v-else-if="post" class="stack">
      <FeedCard :post="post" detailed />

      <div v-if="kudosGivers.length" class="kudos">
        <span class="kudos__faces">
          <UserAvatar
            v-for="k in kudosGivers.slice(0, 5)"
            :id="k.user_id"
            :key="k.user_id"
            :name="k.display_name"
            :size="26"
          />
        </span>
        <span class="kudos__text">
          {{
            kudosGivers.length === 1
              ? t('social.post.kudosOne', { name: kudosGivers[0]!.display_name })
              : t('social.post.kudosMany', { name: kudosGivers[0]!.display_name, count: kudosGivers.length - 1 }, kudosGivers.length - 1)
          }}
        </span>
      </div>

      <div class="tools">
        <RouterLink
          v-if="savedRoutineId"
          :to="{ name: 'routine-detail', params: { id: savedRoutineId } }"
          class="tool tool--done"
        >
          <BookmarkPlus :size="16" :stroke-width="2.5" />
          {{ t('social.post.savedRoutine') }}
        </RouterLink>
        <button v-else-if="post.session" type="button" class="tool" @click="saveAsRoutine">
          <BookmarkPlus :size="16" :stroke-width="2.5" />
          {{ t('social.post.saveRoutine') }}
        </button>
        <RouterLink
          v-if="post.roomId && isMine"
          :to="{ name: 'room-recap', params: { id: post.roomId } }"
          class="tool"
        >
          <Users :size="16" :stroke-width="2.5" />
          {{ t('social.post.groupRecap') }}
        </RouterLink>
      </div>

      <section v-if="post.session?.exercises.length" class="block">
        <h2 class="section-title">{{ t('social.post.exercises') }}</h2>
        <LoggedExerciseList :exercises="post.session.exercises" :unit="post.session.unit || 'kg'" />
      </section>

      <section id="comments" class="block">
        <h2 class="section-title">{{ t('social.post.comments', { count: comments.length }) }}</h2>
        <p v-if="!comments.length" class="note note--left">{{ t('social.post.noComments') }}</p>
        <ul v-else class="comments">
          <li v-for="comment in comments" :key="comment.id" class="comment">
            <RouterLink :to="{ name: 'social-profile', params: { id: comment.user_id } }">
              <UserAvatar :id="comment.user_id" :name="comment.display_name" :size="32" />
            </RouterLink>
            <div class="comment__body">
              <p class="comment__head">
                <RouterLink :to="{ name: 'social-profile', params: { id: comment.user_id } }" class="comment__name">
                  {{ comment.display_name }}
                </RouterLink>
                <span class="comment__time">{{ formatRelativeTime(Date.parse(comment.created_at), locale) }}</span>
              </p>
              <p class="comment__text">{{ comment.body }}</p>
            </div>
            <button
              v-if="canDelete(comment)"
              type="button"
              class="icon-btn icon-btn--small"
              :aria-label="t('social.post.deleteComment')"
              @click="remove(comment)"
            >
              <Trash2 :size="15" :stroke-width="2.25" />
            </button>
          </li>
        </ul>

        <form class="composer" @submit.prevent="send">
          <UserAvatar v-if="auth.user" :id="auth.user.id" :name="auth.profile?.display_name ?? ''" :size="32" />
          <textarea
            v-model="draft"
            class="composer__input"
            rows="1"
            :maxlength="COMMENT_MAX"
            :placeholder="t('social.post.commentPlaceholder')"
            :aria-label="t('social.post.commentPlaceholder')"
            @keydown.enter.exact.prevent="send"
          />
          <button type="submit" class="composer__send" :disabled="!canSend" :aria-label="t('social.post.send')">
            <Send :size="17" :stroke-width="2.25" />
          </button>
        </form>
        <p v-if="sendError" class="error">{{ t('social.post.sendError') }}</p>
      </section>
    </div>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.icon-btn--small {
  width: 30px;
  height: 30px;
  opacity: 0.5;
}

.note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
  font-size: 13px;
  opacity: 0.7;
  text-align: center;
}

.note--left {
  align-items: flex-start;
  padding: 4px 0;
  text-align: left;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.kudos {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: -6px;
}

.kudos__faces {
  display: flex;
}

.kudos__faces > * + * {
  margin-left: -8px;
}

.kudos__faces > * {
  box-shadow: 0 0 0 2px var(--color-background);
}

.kudos__text {
  font-size: 12px;
  opacity: 0.8;
}

.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.tool svg {
  color: var(--color-accent);
}

.tool--done {
  border-color: var(--color-accent);
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.comments {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comment {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.comment a:hover {
  background: transparent;
}

.comment__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comment__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.comment__name {
  font-weight: 700;
  font-size: 13px;
  color: var(--color-heading);
  text-decoration: none;
}

.comment__time {
  font-size: 11px;
  opacity: 0.55;
}

.comment__text {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.composer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}

.composer__input {
  flex: 1;
  min-width: 0;
  max-height: 120px;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--color-heading);
  font: inherit;
  font-size: 16px; /* keeps iOS from zooming in on focus */
  resize: none;
  field-sizing: content;
  outline: none;
}

.composer__send {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
}

.composer__send:disabled {
  opacity: 0.4;
  cursor: default;
}

.error {
  font-size: 12px;
  color: #e11d48;
}

.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
}

.btn--ghost {
  background: transparent;
  color: var(--color-heading);
  border: 1px solid var(--color-border);
}
</style>
