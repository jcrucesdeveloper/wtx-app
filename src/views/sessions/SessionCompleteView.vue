<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppPage from '@/components/AppPage.vue'
import FinishSummary from '@/components/session/FinishSummary.vue'
import FinishSharePrompt from '@/components/session/FinishSharePrompt.vue'
import { useSessionsStore } from '@/stores/sessions'
import { useSessionRecapStore } from '@/stores/sessionRecap'
import { HapticsService } from '@/services/haptics'
import { celebrationTier } from '@/lib/celebration'
import { AdService } from '@/services/ads'
import { AppReviewService } from '@/services/appReview'
import { useWorkoutShare } from '@/composables/useWorkoutShare'
import TeamFinishCard from '@/components/social/TeamFinishCard.vue'
import MemberSessionSheet from '@/components/social/MemberSessionSheet.vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useRoomTeam } from '@/composables/useRoomTeam'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const sessions = useSessionsStore()
const sessionRecap = useSessionRecapStore()

const id = computed(() => String(route.params.id))
const stored = computed(() => sessions.getById(id.value))
const result = computed(() => (stored.value ? sessions.parsed(id.value) : undefined))

/** Only trust the recap if it's for this exact session — guards stale/direct navigation. */
const recap = computed(() =>
  sessionRecap.recap?.sessionId === id.value ? sessionRecap.recap : null,
)

// Felt as it lands on screen, and sized like the screen is: nothing extra for
// an ordinary finish (the outro already marked it), a success for something
// earned, and a heavier beat first for the rare one.
onMounted(() => {
  if (!recap.value) return
  const tier = celebrationTier({
    personalRecords: recap.value.personalRecords.length,
    milestone: recap.value.milestone,
    plateUp: !!recap.value.plateUp,
  })
  if (tier === 'routine') return
  if (tier === 'event') {
    void HapticsService.heavy()
    setTimeout(() => void HapticsService.success(), 220)
  } else {
    void HapticsService.success()
  }
})

async function onDone() {
  const hadWin =
    !!recap.value && (recap.value.personalRecords.length > 0 || !!recap.value.milestone)
  const totalSessions = sessions.list.length
  sessionRecap.clear()
  router.replace('/sessions')
  // A win is the moment to ask for a rating. An ad never stacks on that request —
  // it waits for the next finish — and neither blocks leaving the screen.
  if (!(await AppReviewService.maybeAsk({ hadWin, totalSessions }))) AdService.showInterstitial()
}

const { cardData, caption: shareText } = useWorkoutShare(
  () => (result.value?.ok ? result.value.session : null),
  recap,
)

// --- A group workout: the team, live until the last one finishes ----------

const room = useRoomStore()
const auth = useAuthStore()
const roomTeam = useRoomTeam()
const roomId = computed(() => stored.value?.roomId)
/** The room this workout was part of, once it's loaded here (it usually already is). */
const inRoom = computed(() => !!roomId.value && room.room?.id === roomId.value && room.members.length > 0)
/** Whose workout is open in the sheet. */
const watching = ref<string | null>(null)

onMounted(async () => {
  if (!roomId.value) return
  await auth.whenReady()
  if (auth.isLoggedIn) void room.open(roomId.value).catch(() => {})
})

/** From the room's start to the last Finish, once everyone has finished. */
const teamSeconds = computed(() => {
  const startedAt = Date.parse(room.room?.started_at ?? '')
  if (!room.team.allFinished || !Number.isFinite(startedAt)) return null
  const last = Math.max(...room.members.map((m) => Date.parse(m.finishedAt ?? '')))
  return Number.isFinite(last) && last >= startedAt ? Math.round((last - startedAt) / 1000) : null
})

function openRecap() {
  if (roomId.value) router.push({ name: 'room-recap', params: { id: roomId.value } })
}

/** Sharing opens a preview first: nothing leaves the phone that wasn't looked at. */
const sharePrompt = ref<InstanceType<typeof FinishSharePrompt> | null>(null)
</script>

<template>
  <AppPage sub fill :title="result?.ok ? result.session.name : t('sessionComplete.fallbackTitle')">
    <p v-if="!stored || !result?.ok" class="msg">{{ t('sessionDetail.notFound') }}</p>

    <FinishSummary
      v-else
      :session="result.session"
      :recap="recap"
      @done="onDone"
      @share="sharePrompt?.open()"
    >
      <template v-if="inRoom" #team>
        <TeamFinishCard
          :faces="roomTeam.faces.value"
          :segments="roomTeam.segments.value"
          :done="room.team.done"
          :total="room.team.total"
          :finished="room.team.finished"
          :members="room.team.members"
          :all-finished="room.team.allFinished"
          :line="roomTeam.line.value"
          :line-tappable="!!roomTeam.lineMember.value"
          :seconds="teamSeconds"
          @select="watching = $event"
          @line="watching = roomTeam.lineMember.value"
          @recap="openRecap"
        />
      </template>
      <!-- The room hasn't loaded here (offline, signed out): still a way to its recap. -->
      <template v-else-if="roomId" #team>
        <button type="button" class="group-recap" @click="openRecap">{{ t('room.summary.seeRecap') }}</button>
      </template>
      <template #share>
        <FinishSharePrompt ref="sharePrompt" :data="cardData" :caption="shareText" />
      </template>
    </FinishSummary>

    <MemberSessionSheet v-if="inRoom" :user-id="watching" @close="watching = null" />
  </AppPage>
</template>

<style scoped>
.msg {
  font-size: var(--text-body);
}

.group-recap {
  width: 100%;
  min-height: var(--size-control);
  border: 1px solid var(--color-border-hover);
  border-radius: 14px;
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
  background: transparent;
  cursor: pointer;
}
</style>
