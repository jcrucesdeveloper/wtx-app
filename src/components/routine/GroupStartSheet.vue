<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Users } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { RoomError, useRoomStore } from '@/stores/room'
import { isSupabaseConfigured } from '@/services/supabase'

/**
 * Says out loud what the Group button does before it does it: this opens a
 * room friends join with a code — not a solo workout.
 */
const props = defineProps<{ open: boolean; routineId: string; name: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const room = useRoomStore()

/** Group workouts need an account; logged-out users are sent to Social to sign in. */
const needsSignIn = computed(() => !isSupabaseConfigured || !auth.isLoggedIn)

const creating = ref(false)
const failed = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) failed.value = ''
  },
)

function close() {
  if (creating.value) return
  emit('update:open', false)
}

async function confirm() {
  if (creating.value) return
  if (needsSignIn.value) {
    emit('update:open', false)
    router.push({ name: 'social' })
    return
  }
  creating.value = true
  failed.value = ''
  try {
    const created = await room.create(props.routineId)
    emit('update:open', false)
    router.push({ name: 'room-lobby', params: { id: created.id } })
  } catch (e) {
    failed.value = t(`room.errors.${e instanceof RoomError ? e.code : 'unknown'}`)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="t('room.confirm.title')" @close="close">
    <div class="sheet">
      <p class="sheet__body">{{ t('room.confirm.body', { name }) }}</p>
      <p v-if="needsSignIn" class="sheet__hint">{{ t('room.confirm.signInHint') }}</p>
      <p v-if="failed" class="sheet__error" role="alert">{{ failed }}</p>
      <div class="sheet__actions">
        <AppButton size="lg" :disabled="creating" @click="close">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton variant="primary" size="lg" block :disabled="creating" @click="confirm">
          <Users :size="18" :stroke-width="2.25" />
          {{
            creating
              ? t('room.creating')
              : needsSignIn
                ? t('room.confirm.signIn')
                : t('room.confirm.confirm')
          }}
        </AppButton>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 12px;
}

.sheet__body {
  font-size: var(--text-body);
  color: var(--color-text);
}

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__error {
  font-size: 13px;
  color: var(--color-danger);
}

/* Same shape as the dock that opened it: a small way out, a wide way on. */
.sheet__actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 4px;
}
</style>
