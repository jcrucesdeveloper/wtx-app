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
      :room-id="stored.roomId"
      @done="onDone"
      @share="sharePrompt?.open()"
      @recap="router.push({ name: 'room-recap', params: { id: stored.roomId } })"
    >
      <template #share>
        <FinishSharePrompt ref="sharePrompt" :data="cardData" :caption="shareText" />
      </template>
    </FinishSummary>
  </AppPage>
</template>

<style scoped>
.msg {
  font-size: var(--text-body);
}
</style>
