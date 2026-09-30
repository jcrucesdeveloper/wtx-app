<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { BIO_MAX, NAME_MAX, isValidBio, isValidDisplayName } from '@/lib/profileFields'
import { containsBlockedTerms } from '@/lib/contentFilter'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t } = useI18n()
const auth = useAuthStore()

const name = ref('')
const bio = ref('')
const saving = ref(false)
const failed = ref(false)

// Start from what's saved each time the sheet opens.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = auth.profile?.display_name ?? ''
    bio.value = auth.profile?.bio ?? ''
    failed.value = false
  },
  { immediate: true },
)

const changed = computed(
  () =>
    name.value.trim() !== (auth.profile?.display_name ?? '') ||
    bio.value.trim() !== (auth.profile?.bio ?? ''),
)
// Others see both, so they go through the same word filter the server enforces.
const nameBlocked = computed(() => containsBlockedTerms(name.value))
const bioBlocked = computed(() => containsBlockedTerms(bio.value))
const valid = computed(
  () =>
    isValidDisplayName(name.value) &&
    isValidBio(bio.value) &&
    !nameBlocked.value &&
    !bioBlocked.value,
)

async function save() {
  if (!valid.value || !changed.value || saving.value) return
  saving.value = true
  failed.value = false
  try {
    await auth.updateProfile({ displayName: name.value, bio: bio.value })
    emit('saved')
    emit('close')
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="t('social.profile.editTitle')" @close="emit('close')">
    <form class="form" @submit.prevent="save">
      <label class="field">
        <span class="field__label">{{ t('account.displayName') }}</span>
        <input v-model="name" :maxlength="NAME_MAX" autocomplete="nickname" />
        <span v-if="nameBlocked" class="error">{{ t('social.moderation.filter.name') }}</span>
      </label>

      <label class="field">
        <span class="field__row">
          <span class="field__label">{{ t('social.profile.bio') }}</span>
          <span class="field__count" :class="{ 'field__count--over': bio.length > BIO_MAX }">
            {{ bio.length }}/{{ BIO_MAX }}
          </span>
        </span>
        <textarea
          v-model="bio"
          rows="3"
          :maxlength="BIO_MAX"
          :placeholder="t('social.profile.bioPlaceholder')"
        />
        <span v-if="bioBlocked" class="error">{{ t('social.moderation.filter.bio') }}</span>
      </label>

      <p v-if="failed" class="error">{{ t('social.profile.saveFailed') }}</p>

      <button type="submit" class="primary" :disabled="!valid || !changed || saving">
        {{ saving ? t('social.profile.saving') : t('account.save') }}
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
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.field__count {
  font-size: 11px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.field__count--over {
  color: #e11d48;
  opacity: 1;
}

.field input,
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

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.error {
  font-size: 13px;
  color: #e11d48;
}

.primary {
  min-height: 48px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
