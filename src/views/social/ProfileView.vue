<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, EllipsisVertical, Flame, Lock, Share2, Users } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TrainingCalendar from '@/components/session/TrainingCalendar.vue'
import FeedPostCard from '@/components/social/FeedPostCard.vue'
import FollowButton from '@/components/social/FollowButton.vue'
import ProfileHeader from '@/components/social/ProfileHeader.vue'
import ProfileSkeleton from '@/components/social/ProfileSkeleton.vue'
import EditProfileSheet from '@/components/social/EditProfileSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { buildFollowUrl } from '@/lib/followCode'
import { computeWeekStreak, toDateStr } from '@/lib/sessionStats'
import { useShareLink } from '@/composables/useShareLink'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const profiles = useProfileStore()

const id = computed(() => String(route.params.id))
const isMe = computed(() => id.value === auth.user?.id)
const entry = computed(() => profiles.get(id.value))
const profile = computed(() => entry.value.profile)
const canSee = computed(() => profiles.canSeeWorkouts(id.value))

watch(id, (value) => void profiles.load(value), { immediate: true })

const streak = computed(() => computeWeekStreak(profile.value?.workoutDates ?? []))

/** A calendar day tapped to filter the loaded workouts, like the Sessions tab. */
const selectedDay = ref<string | null>(null)
watch(id, () => (selectedDay.value = null))
const workouts = computed(() => {
  const all = entry.value.workouts
  if (!selectedDay.value) return all
  return all.filter((post) => toDateStr(new Date(post.createdAt)) === selectedDay.value)
})

// ----- own profile: edit + share -----
const editOpen = ref(false)
const { share, copied } = useShareLink()

function shareProfile() {
  const code = auth.profile?.invite_code
  if (!code) return
  void share({
    url: buildFollowUrl(code, router.resolve({ name: 'follow' }).href),
    text: t('social.follow.shareText'),
  })
}

function onSaved() {
  void profiles.load(id.value, { force: true })
}

function openConnections(tab: 'followers' | 'following') {
  router.push({ name: 'connections', params: { id: id.value }, query: { tab } })
}

// ----- someone else's: ⋯ → remove follower -----
const menuOpen = ref(false)
const removeFailed = ref(false)

async function removeFollower() {
  menuOpen.value = false
  removeFailed.value = false
  try {
    await profiles.removeFollower(id.value)
  } catch {
    removeFailed.value = true
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage :title="profile?.displayName ?? t('social.profile.title')">
    <template #leading>
      <button
        type="button"
        class="icon-btn icon-btn--lead"
        :aria-label="t('social.feed.backAria')"
        @click="goBack"
      >
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <template v-if="profile" #actions>
      <button
        v-if="isMe"
        type="button"
        class="icon-btn"
        :aria-label="t('social.profile.shareProfile')"
        @click="shareProfile"
      >
        <Share2 :size="18" :stroke-width="2.25" />
      </button>
      <button
        v-else-if="profile.followsMe"
        type="button"
        class="icon-btn"
        :aria-label="t('social.profile.moreAria')"
        @click="menuOpen = true"
      >
        <EllipsisVertical :size="18" :stroke-width="2.25" />
      </button>
    </template>

    <ProfileSkeleton v-if="!profile && (entry.loading || !entry.error)" />

    <div v-else-if="!profile" class="empty">
      <p class="empty__title">{{ t('social.profile.notFoundTitle') }}</p>
      <p class="empty__hint">{{ t('social.profile.notFoundHint') }}</p>
      <button type="button" class="secondary" @click="profiles.load(id, { force: true })">
        {{ t('social.profile.retry') }}
      </button>
    </div>

    <div v-else class="stack">
      <ProfileHeader :profile="profile" :is-me="isMe" @open-connections="openConnections" />

      <!-- Own: Edit | Share. Others: Follow / Follow back / Following ▾ — Instagram's split. -->
      <div class="buttons">
        <template v-if="isMe">
          <button type="button" class="secondary" @click="editOpen = true">
            {{ t('social.profile.edit') }}
          </button>
          <button type="button" class="secondary" @click="shareProfile">
            {{ copied ? t('social.profile.linkCopied') : t('social.profile.shareProfile') }}
          </button>
        </template>
        <FollowButton
          v-else
          :user-id="profile.id"
          :name="profile.displayName"
          :i-follow="profile.iFollow"
          :follows-me="profile.followsMe"
        />
      </div>
      <p v-if="removeFailed" class="error">{{ t('social.profile.actionFailed') }}</p>

      <p v-if="!isMe && profile.trainedTogether > 0" class="note">
        <Users :size="15" :stroke-width="2.25" />
        {{
          t(
            'social.profile.trainedTogether',
            { count: profile.trainedTogether },
            profile.trainedTogether,
          )
        }}
      </p>
      <p v-if="isMe" class="note">
        <Lock :size="14" :stroke-width="2.25" />
        {{ t('social.profile.visibleTo', { count: profile.followerCount }, profile.followerCount) }}
      </p>

      <!-- Locked: workouts are for followers only. -->
      <div v-if="!canSee" class="locked">
        <Lock :size="28" :stroke-width="2" class="locked__icon" />
        <p class="locked__title">
          {{ t('social.profile.lockedTitle', { name: profile.displayName }) }}
        </p>
        <p class="locked__hint">{{ t('social.profile.lockedHint') }}</p>
      </div>

      <template v-else-if="profile.workoutCount > 0">
        <section class="section">
          <div class="section__head">
            <h3 class="section__title">{{ t('social.profile.activity') }}</h3>
            <span v-if="streak > 0" class="streak">
              <Flame :size="14" :stroke-width="2.5" />
              {{ t('social.profile.weekStreak', { count: streak }, streak) }}
            </span>
          </div>
          <TrainingCalendar
            :dates="profile.workoutDates"
            :selected="selectedDay"
            @select="selectedDay = $event"
          />
        </section>

        <section class="section">
          <h3 class="section__title">{{ t('social.profile.workouts') }}</h3>
          <FeedPostCard v-for="post in workouts" :key="post.sessionId" :post="post" />
          <p v-if="selectedDay && workouts.length === 0" class="muted">
            {{ t('social.profile.noneThatDay') }}
          </p>
          <button
            v-if="entry.hasMoreWorkouts && entry.workouts.length > 0"
            type="button"
            class="secondary secondary--center"
            :disabled="entry.workoutsLoading"
            @click="profiles.loadWorkouts(id)"
          >
            {{ entry.workoutsLoading ? t('social.feed.loading') : t('social.feed.loadMore') }}
          </button>
        </section>
      </template>

      <div v-else class="empty empty--inline">
        <p class="empty__title">
          {{ isMe ? t('social.profile.emptyMineTitle') : t('social.profile.emptyTheirsTitle') }}
        </p>
        <p class="empty__hint">
          {{
            isMe
              ? t('social.profile.emptyMineHint')
              : t('social.profile.emptyTheirsHint', { name: profile.displayName })
          }}
        </p>
      </div>
    </div>

    <EditProfileSheet v-if="isMe" :open="editOpen" @close="editOpen = false" @saved="onSaved" />

    <BottomSheet
      v-if="profile && !isMe"
      :open="menuOpen"
      :title="profile.displayName"
      @close="menuOpen = false"
    >
      <div class="sheet">
        <p class="sheet__hint">
          {{ t('social.profile.removeFollowerHint', { name: profile.displayName }) }}
        </p>
        <button type="button" class="sheet__danger" @click="removeFollower">
          {{ t('social.profile.removeFollower') }}
        </button>
      </div>
    </BottomSheet>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.icon-btn--lead {
  margin-left: -4px;
}

.icon-btn:active {
  background: var(--color-background-mute);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.buttons {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 8px;
}

.secondary {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}

.secondary:active {
  background: var(--color-background-mute);
}

.secondary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary--center {
  align-self: center;
}

.note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.75;
}

.error {
  font-size: 13px;
  color: #e11d48;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section__title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
}

.muted {
  font-size: 13px;
  opacity: 0.6;
}

.locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 20px;
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.locked__icon {
  opacity: 0.6;
  margin-bottom: 4px;
}

.locked__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.locked__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 32ch;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;
}

.empty--inline {
  padding: 28px 20px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
}

.empty__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.empty__hint {
  font-size: 13px;
  opacity: 0.7;
  max-width: 34ch;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 12px;
}

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__danger {
  min-height: 48px;
  border: 1px solid #e11d48;
  border-radius: var(--radius-md);
  background: transparent;
  color: #e11d48;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  cursor: pointer;
}
</style>
