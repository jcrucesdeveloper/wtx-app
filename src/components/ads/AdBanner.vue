<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { AdService } from '@/services/ads'

/**
 * Drop this into a view to show a bottom banner ad for as long as it's
 * mounted. No-ops on web and once ads are removed — see {@link AdService}.
 * `AppTabBar` reads `--ad-banner-height` (set here) to sit above the banner
 * instead of being covered by it.
 */
onMounted(() => {
  AdService.showBanner()
})

onBeforeUnmount(() => {
  AdService.hideBanner()
})
</script>

<template>
  <span style="display: none" aria-hidden="true" />
</template>
