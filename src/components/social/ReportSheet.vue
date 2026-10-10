<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  ModerationError,
  useModerationStore,
  type ReportReason,
} from '@/stores/moderation'

const props = defineProps<{
  open: boolean
  /** The account being reported (or whose workout is). */
  userId: string
  name: string
  /** Set when reporting one shared workout rather than the account. */
  sessionId?: string
  /** Offers Block after the report is sent — hidden if they're already blocked. */
  canBlock?: boolean
}>()

const emit = defineEmits<{ close: []; block: [] }>()

const { t } = useI18n()
const moderation = useModerationStore()

const reason = ref<ReportReason | null>(null)
const details = ref('')
const phase = ref<'form' | 'sending' | 'done'>('form')
/** The i18n key of the last failure, or '' — throttled reports get their own message. */
const failed = ref('')

// Every open starts a fresh report.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = null
    details.value = ''
    phase.value = 'form'
    failed.value = ''
  },
)

const title = computed(() =>
  props.sessionId
    ? t('social.moderation.report.postTitle')
    : t('social.moderation.report.accountTitle', { name: props.name }),
)

async function submit() {
  if (!reason.value || phase.value !== 'form') return
  phase.value = 'sending'
  failed.value = ''
  try {
    await moderation.report({
      userId: props.userId,
      sessionId: props.sessionId,
      reason: reason.value,
      details: details.value,
    })
    phase.value = 'done'
  } catch (e) {
    failed.value =
      e instanceof ModerationError && e.code === 'rate_limited'
        ? 'social.moderation.rateLimited'
        : 'social.moderation.failed'
    phase.value = 'form'
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="emit('close')">
    <div v-if="phase === 'done'" class="done" role="status">
      <span class="done__icon"><Check :size="22" :stroke-width="2.5" /></span>
      <p class="done__title">{{ t('social.moderation.report.doneTitle') }}</p>
      <p class="done__hint">{{ t('social.moderation.report.done') }}</p>
      <template v-if="canBlock">
        <p class="done__hint">{{ t('social.moderation.report.blockToo', { name }) }}</p>
        <button type="button" class="danger" @click="emit('block')">
          {{ t('social.moderation.block') }}
        </button>
      </template>
      <button type="button" class="primary" @click="emit('close')">
        {{ t('social.moderation.report.close') }}
      </button>
    </div>

    <form v-else class="form" @submit.prevent="submit">
      <p class="hint">{{ t('social.moderation.report.intro', { name }) }}</p>

      <div
        class="reasons"
        role="radiogroup"
        :aria-label="t('social.moderation.report.reasonsAria')"
      >
        <button
          v-for="value in REPORT_REASONS"
          :key="value"
          type="button"
          role="radio"
          class="reason"
          :class="{ 'reason--on': reason === value }"
          :aria-checked="reason === value"
          @click="reason = value"
        >
          <span class="reason__check" aria-hidden="true">
            <Check v-if="reason === value" :size="12" :stroke-width="3" />
          </span>
          {{ t(`social.moderation.report.reasons.${value}`) }}
        </button>
      </div>

      <label class="field">
        <span class="field__row">
          <span class="field__label">{{ t('social.moderation.report.details') }}</span>
          <span class="field__count">{{ details.length }}/{{ REPORT_DETAILS_MAX }}</span>
        </span>
        <textarea
          v-model="details"
          rows="3"
          :maxlength="REPORT_DETAILS_MAX"
          :placeholder="t('social.moderation.report.detailsPlaceholder')"
        />
      </label>

      <p v-if="failed" class="error">{{ t(failed) }}</p>

      <button type="submit" class="primary" :disabled="!reason || phase === 'sending'">
        {{
          phase === 'sending'
            ? t('social.moderation.report.sending')
            : t('social.moderation.report.submit')
        }}
      </button>
    </form>
  </BottomSheet>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 12px;
}

.hint {
  font-size: 13px;
  opacity: 0.75;
}

.reasons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reason {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.reason--on {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.reason__check {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-hover);
}

.reason--on .reason__check {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.field__label {
  font-size: var(--text-small);
  font-weight: 700;
  opacity: 0.6;
}

.field__count {
  font-size: 11px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.field textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-heading);
  font: inherit;
  font-size: 15px;
  resize: none;
}

.field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.error {
  font-size: 13px;
  color: var(--color-danger);
}

.primary,
.danger {
  min-height: 48px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.primary {
  border: none;
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.danger {
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);
}

.done {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 8px 0 12px;
  text-align: center;
}

.done__icon {
  display: grid;
  place-items: center;
  align-self: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.done__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
}

.done__hint {
  font-size: 13px;
  opacity: 0.75;
}
</style>
