<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { X } from '@lucide/vue'
import { detectMobileOs, storeUrl } from '@/lib/storeLinks'
import { acquisitionSource } from '@/services/acquisition'
import { track } from '@/services/analytics'

const DISMISSED_KEY = 'wtx:get-app-dismissed'

const { t } = useI18n()

/**
 * Web only, on a phone, and only once that phone's store listing is
 * configured — so it stays hidden before launch. Someone who already has the
 * app never sees it for a shared link: those open the app directly.
 */
function resolveUrl(): string | null {
  if (Capacitor.isNativePlatform()) return null
  const os = detectMobileOs(navigator.userAgent)
  if (!os) return null
  return storeUrl(
    os,
    {
      appStoreId: import.meta.env.VITE_APP_STORE_ID,
      appStoreProviderId: import.meta.env.VITE_APP_STORE_PROVIDER_ID,
      playStoreId: import.meta.env.VITE_PLAY_STORE_ID,
    },
    acquisitionSource(),
  )
}

const url = resolveUrl()
const visible = ref(url !== null && localStorage.getItem(DISMISSED_KEY) === null)

function dismiss() {
  visible.value = false
  localStorage.setItem(DISMISSED_KEY, '1')
}
</script>

<template>
  <div v-if="visible && url" class="get-app">
    <div class="get-app__text">
      <span class="get-app__title">{{ t('getApp.title') }}</span>
      <span class="get-app__body">{{ t('getApp.body') }}</span>
    </div>
    <a
      class="get-app__cta"
      :href="url"
      target="_blank"
      rel="noopener"
      @click="track('install_banner_tapped')"
    >
      {{ t('getApp.cta') }}
    </a>
    <button
      type="button"
      class="get-app__close"
      :aria-label="t('getApp.dismissAria')"
      @click="dismiss"
    >
      <X :size="16" :stroke-width="2.25" />
    </button>
  </div>
</template>

<style scoped>
.get-app {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px 10px 16px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.get-app__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.get-app__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-heading);
}

.get-app__body {
  font-size: 12px;
  opacity: 0.7;
}

.get-app__cta {
  flex-shrink: 0;
  border-radius: var(--radius-md);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
}

.get-app__close {
  display: flex;
  flex-shrink: 0;
  border: none;
  padding: 8px;
  color: var(--color-text);
  background: none;
  opacity: 0.6;
  cursor: pointer;
}
</style>
