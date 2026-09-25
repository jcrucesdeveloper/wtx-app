<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users } from '@lucide/vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'
import { useExerciseName } from '@/composables/useExerciseName'
import { HapticsService } from '@/services/haptics'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { initials, memberColor } from '@/lib/memberColors'
import type { ReactionEmoji, RoomEvent } from '@/lib/roomEvents'

/**
 * Live social layer for the current room, on every screen: toasts when a
 * friend sets a PR / finishes an exercise / finishes / joins, team moments
 * (an exercise cleared by everyone, the whole team finishing), and a burst of
 * floating emojis when someone cheers you on. Muting silences all of it.
 */

const TOAST_MS = 4500
const MAX_TOASTS = 3
const BURST_COUNT = 14
const QUICK_CHEERS: ReactionEmoji[] = ['🔥', '👏']

interface Toast {
  id: string
  icon: string
  text: string
  /** Who a quick cheer-back goes to; unset for toasts you can't reply to. */
  cheerTo?: string
  fromIndex: number
  fromName: string
  /** A team moment: shows the team badge instead of a member's initials. */
  team?: boolean
  sent: boolean
}

interface Particle {
  id: number
  emoji: string
  left: number
  delay: number
  size: number
  drift: number
}

const { t } = useI18n()
const { exerciseName } = useExerciseName()
const room = useRoomStore()
const auth = useAuthStore()

const toasts = ref<Toast[]>([])
const particles = ref<Particle[]>([])
const timers = new Set<ReturnType<typeof setTimeout>>()
const seen = new Set<string>()
const unit = computed(() => room.room?.unit || 'kg')

function later(fn: () => void, ms: number) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    fn()
  }, ms)
  timers.add(timer)
}

function dismiss(id: string) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function showToast(toast: Omit<Toast, 'sent'>) {
  toasts.value = [...toasts.value.slice(-(MAX_TOASTS - 1)), { ...toast, sent: false }]
  later(() => dismiss(toast.id), TOAST_MS)
}

let particleSeq = 0
function burst(emoji: string) {
  if (prefersReducedMotion()) return
  const batch = Array.from({ length: BURST_COUNT }, () => ({
    id: ++particleSeq,
    emoji,
    left: 5 + Math.random() * 90,
    delay: Math.random() * 450,
    size: 26 + Math.random() * 22,
    drift: (Math.random() - 0.5) * 80,
  }))
  particles.value = [...particles.value, ...batch]
  const ids = new Set(batch.map((p) => p.id))
  later(() => (particles.value = particles.value.filter((p) => !ids.has(p.id))), 2600)
}

function handle(event: RoomEvent) {
  if (room.muted) return
  const me = auth.user?.id
  const fromIndex = Math.max(0, room.members.findIndex((m) => m.userId === event.from))
  const fromName = room.members[fromIndex]?.displayName ?? '—'
  const base = { id: event.id, fromIndex, fromName }

  switch (event.kind) {
    case 'reaction':
      if (event.to !== me) return
      burst(event.emoji)
      void HapticsService.light()
      showToast({ ...base, icon: event.emoji, text: t('room.live.reaction', { name: fromName, emoji: event.emoji }), cheerTo: event.from })
      return
    case 'pr': {
      const params = { name: fromName, exercise: exerciseName(event.exercise), weight: event.weight, unit: unit.value, reps: event.reps }
      if (event.from === me) {
        burst('🏆')
        void HapticsService.success()
        showToast({ ...base, icon: '🏆', text: t('room.live.myPr', params) })
      } else {
        showToast({ ...base, icon: '🏆', text: t('room.live.pr', params), cheerTo: event.from })
      }
      return
    }
    case 'exercise-done':
      if (event.from === me) return
      showToast({
        ...base,
        icon: '✅',
        text: t('room.live.exerciseDone', { name: fromName, exercise: exerciseName(event.exercise) }),
        cheerTo: event.from,
      })
      return
    case 'finished':
      if (event.from === me) return
      showToast({ ...base, icon: '🏁', text: t('room.live.finished', { name: fromName }), cheerTo: event.from })
      return
    case 'joined':
      if (event.from === me) return
      showToast({ ...base, icon: '👋', text: t('room.live.joined', { name: fromName }) })
      return
    case 'team-cleared':
      showToast({ ...base, team: true, icon: '✅', text: t('room.live.teamCleared', { exercise: exerciseName(event.exercise) }) })
      return
    case 'team-finished':
      burst('🎉')
      void HapticsService.success()
      showToast({ ...base, team: true, icon: '🎉', text: t('room.live.teamFinished', { routine: room.room?.routine_name ?? '' }) })
  }
}

watch(
  () => room.events,
  (events) => {
    if (!events.length) seen.clear()
    for (const event of events) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      handle(event)
    }
  },
)

function cheerBack(toast: Toast, emoji: ReactionEmoji) {
  if (!toast.cheerTo || toast.sent) return
  if (!room.sendReaction(toast.cheerTo, emoji)) return
  void HapticsService.light()
  toast.sent = true
  later(() => dismiss(toast.id), 900)
}

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="live" aria-live="polite">
    <TransitionGroup name="toast" tag="ul" class="toasts">
      <li v-for="toast in toasts" :key="toast.id" class="toast">
        <span
          class="toast__avatar"
          :class="{ 'toast__avatar--team': toast.team }"
          :style="toast.team ? undefined : { background: memberColor(toast.fromIndex) }"
        >
          <Users v-if="toast.team" :size="15" :stroke-width="2.5" />
          <template v-else>{{ initials(toast.fromName) }}</template>
          <span class="toast__icon" aria-hidden="true">{{ toast.icon }}</span>
        </span>
        <span class="toast__text">{{ toast.text }}</span>
        <span v-if="toast.cheerTo" class="toast__actions">
          <span v-if="toast.sent" class="toast__sent">{{ t('room.live.sent') }}</span>
          <template v-else>
            <button
              v-for="emoji in QUICK_CHEERS"
              :key="emoji"
              type="button"
              class="toast__cheer"
              :aria-label="t('room.live.cheerBackAria', { emoji, name: toast.fromName })"
              @click="cheerBack(toast, emoji)"
            >
              {{ emoji }}
            </button>
          </template>
        </span>
        <button type="button" class="toast__close" :aria-label="t('bottomSheet.closeAria')" @click="dismiss(toast.id)">
          ×
        </button>
      </li>
    </TransitionGroup>
  </div>

  <div class="burst" aria-hidden="true">
    <span
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        left: `${p.left}%`,
        fontSize: `${p.size}px`,
        animationDelay: `${p.delay}ms`,
        '--drift': `${p.drift}px`,
      }"
    >
      {{ p.emoji }}
    </span>
  </div>
</template>

<style scoped>
.live {
  position: fixed;
  top: calc(8px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  z-index: 150;
  display: flex;
  justify-content: center;
  padding: 0 12px;
  pointer-events: none;
}

.toasts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 456px;
  padding: 0;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px 9px 10px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-hover);
  border-left: 3px solid var(--color-accent);
  background: var(--color-background);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  pointer-events: auto;
}

.toast__avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.toast__avatar--team {
  background: var(--color-accent);
}

.toast__icon {
  position: absolute;
  right: -6px;
  bottom: -6px;
  font-size: 15px;
  line-height: 1;
}

.toast__text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
}

.toast__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.toast__cheer {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background-soft);
  font-size: 17px;
  cursor: pointer;
}

.toast__cheer:active {
  transform: scale(0.9);
}

.toast__sent {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
}

.toast__close {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 18px;
  line-height: 1;
  padding: 4px 6px;
  opacity: 0.5;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.burst {
  position: fixed;
  inset: 0;
  z-index: 140;
  overflow: hidden;
  pointer-events: none;
}

.particle {
  position: absolute;
  bottom: -60px;
  line-height: 1;
  opacity: 0;
  animation: float-up 2s ease-out forwards;
}

@keyframes float-up {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.6);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(var(--drift), -70vh) scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
