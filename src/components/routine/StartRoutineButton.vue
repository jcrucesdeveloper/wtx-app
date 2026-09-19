<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'

const props = defineProps<{
  routineId: string
}>()

const router = useRouter()
const routines = useRoutinesStore()
const activeSession = useActiveSessionStore()

function onClick() {
  if (activeSession.isActive) {
    if (activeSession.session?.routineId === props.routineId) {
      router.push({ name: 'active-session' })
      return
    }
    if (!confirm('You have a workout in progress. Discard it and start this one?')) return
    activeSession.discard()
  }

  const result = routines.parsed(props.routineId)
  const routine = routines.getById(props.routineId)
  if (!result?.ok || !routine) return

  activeSession.start(routine, result.template)
  router.push({ name: 'active-session' })
}
</script>

<template>
  <button type="button" class="start-btn" @click.stop.prevent="onClick">Start routine</button>
</template>

<style scoped>
.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 16px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.start-btn:active {
  opacity: 0.85;
}
</style>
