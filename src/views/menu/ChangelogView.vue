<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppPage from '@/components/AppPage.vue'
import HeaderLink from '@/components/ui/HeaderLink.vue'
// A copy of the latest changelog/X.Y.Z.txt: the date, then one "- change" per line.
import changelog from '@/changelog.txt?raw'

const { t } = useI18n()

const [date = '', ...lines] = changelog.trim().split(/\r?\n/)
const version = __APP_VERSION__
const changes = lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2))
</script>

<template>
  <AppPage sub :title="t('changelog.title')">
    <template #leading>
      <HeaderLink kind="back" fallback="/settings" />
    </template>

    <p class="released">{{ t('changelog.released', { version, date }) }}</p>
    <ul class="changes">
      <li v-for="change in changes" :key="change">{{ change }}</li>
    </ul>
  </AppPage>
</template>

<style scoped>
.released {
  font-size: var(--text-small);
  opacity: 0.7;
}

.changes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding-left: 20px;
  line-height: 1.5;
  color: var(--color-heading);
}
</style>
