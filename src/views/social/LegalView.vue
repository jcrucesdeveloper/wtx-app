<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import { LEGAL_NAME, SUPPORT_EMAIL } from '@/config/legal'
import { toLegalBlocks, type LegalVars } from '@/lib/legalDoc'

const { t, tm, rt } = useI18n()
const route = useRoute()
const router = useRouter()

const doc = computed(() => (route.params.doc === 'privacy' ? 'privacy' : 'terms'))
const blocks = computed(() => {
  const vars: LegalVars = {
    controller: LEGAL_NAME || t('legal.fallback.controller'),
    contactEmail: SUPPORT_EMAIL || t('legal.fallback.contactEmail'),
  }
  return toLegalBlocks<Parameters<typeof rt>[0]>(tm(`legal.${doc.value}.body`), (m) => rt(m, vars))
})

function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/social')
}
</script>

<template>
  <AppPage :title="t(`legal.${doc}.title`)">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('legal.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>
    <div class="body">
      <p class="updated">{{ t('legal.updated') }}</p>
      <template v-for="(block, i) in blocks" :key="i">
        <h2 v-if="block.kind === 'heading'" class="heading">{{ block.text }}</h2>
        <p v-else>{{ block.text }}</p>
      </template>
    </div>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  margin-left: -4px;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius-md);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  line-height: 1.6;
}

.updated {
  font-size: 12px;
  opacity: 0.7;
}

.heading {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-heading);
}
</style>
