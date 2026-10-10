<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { ModerationError, useModerationStore } from '@/stores/moderation'

const props = defineProps<{ open: boolean; userId: string; name: string }>()
const emit = defineEmits<{ close: []; blocked: [] }>()

const { t } = useI18n()
const moderation = useModerationStore()

const working = ref(false)
/** The i18n key of the last failure, or '' — throttled blocks get their own message. */
const failed = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) failed.value = ''
  },
)

async function confirm() {
  if (working.value) return
  working.value = true
  failed.value = ''
  try {
    await moderation.block({ id: props.userId, displayName: props.name })
    emit('blocked')
    emit('close')
  } catch (e) {
    failed.value =
      e instanceof ModerationError && e.code === 'rate_limited'
        ? 'social.moderation.rateLimited'
        : 'social.moderation.failed'
  } finally {
    working.value = false
  }
}
</script>

<template>
  <BottomSheet
    :open="open"
    :title="t('social.moderation.blockTitle', { name })"
    @close="emit('close')"
  >
    <div class="sheet">
      <p class="sheet__hint">{{ t('social.moderation.blockHint') }}</p>
      <p v-if="failed" class="sheet__error">{{ t(failed) }}</p>
      <button type="button" class="sheet__danger" :disabled="working" @click="confirm">
        {{ t('social.moderation.block') }}
      </button>
      <button type="button" class="sheet__secondary" @click="emit('close')">
        {{ t('common.cancel') }}
      </button>
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

.sheet__hint {
  font-size: 13px;
  opacity: 0.75;
}

.sheet__error {
  font-size: 13px;
  color: var(--color-danger);
}

.sheet__danger,
.sheet__secondary {
  min-height: 48px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.sheet__danger {
  border: none;
  background: transparent;
  color: var(--color-danger);
}

.sheet__danger:disabled {
  opacity: 0.5;
  cursor: default;
}

.sheet__secondary {
  border: 1px solid var(--color-border-hover);
  background: transparent;
  color: var(--color-heading);
}
</style>
