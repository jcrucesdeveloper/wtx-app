<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const accepted = defineModel<boolean>({ required: true })

const { t } = useI18n()
</script>

<template>
  <div class="consent">
    <p class="consent__text">{{ t('consent.text') }}</p>
    <label class="consent__check">
      <input v-model="accepted" type="checkbox" />
      <i18n-t keypath="consent.accept" tag="span">
        <template #terms>
          <RouterLink :to="{ name: 'legal', params: { doc: 'terms' } }">{{
            t('consent.terms')
          }}</RouterLink>
        </template>
        <template #privacy>
          <RouterLink :to="{ name: 'legal', params: { doc: 'privacy' } }">{{
            t('consent.privacy')
          }}</RouterLink>
        </template>
      </i18n-t>
    </label>
  </div>
</template>

<style scoped>
.consent {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  background: var(--color-background-soft);
}

.consent__text {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.8;
}

.consent__check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
  cursor: pointer;
}

.consent__check input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: var(--color-accent);
  flex-shrink: 0;
}

.consent__check a {
  color: var(--color-accent);
}
</style>
