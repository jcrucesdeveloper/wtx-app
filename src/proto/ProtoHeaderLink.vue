<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, Settings } from '@lucide/vue'

/**
 * TEMPORARY — redesign Phase 1. With settings out of the bottom bar, the Train
 * screen's header carries a gear to it, and settings carries a way back.
 */
defineProps<{ kind: 'settings' | 'back' }>()

const { t } = useI18n()
const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/')
}
</script>

<template>
  <RouterLink v-if="kind === 'settings'" to="/settings" class="link" :aria-label="t('settings.title')">
    <Settings :size="22" :stroke-width="2" />
  </RouterLink>
  <button v-else type="button" class="link link--back" :aria-label="t('legal.back')" @click="goBack">
    <ArrowLeft :size="22" :stroke-width="2.25" />
  </button>
</template>

<style scoped>
.link {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-right: -10px;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  background: transparent;
  cursor: pointer;
}

.link--back {
  margin: 0 0 0 -10px;
  color: var(--color-heading);
}

.link:active {
  background: var(--color-background-mute);
}
</style>
