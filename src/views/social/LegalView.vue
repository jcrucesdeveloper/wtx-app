<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'

const { t, tm, rt } = useI18n()
const route = useRoute()
const router = useRouter()

const doc = computed(() => (route.params.doc === 'privacy' ? 'privacy' : 'terms'))
const paragraphs = computed(() =>
  (tm(`legal.${doc.value}.body`) as unknown as Parameters<typeof rt>[0][]).map((p) => rt(p)),
)

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
      <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
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
</style>
