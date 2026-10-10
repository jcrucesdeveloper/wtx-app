<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { nextProtoDirection, protoDirection } from './direction'

const { t } = useI18n()
const theme = useThemeStore()

// Deliberately not translated: a working label for the review, not UI copy.
const label = computed(() => (protoDirection.value === 'current' ? 'OLD' : 'NEW'))

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

// Text on an accent fill: white where it's readable (red, blue, violet…),
// dark ink on the light accents (amber, lime, cyan, emerald).
watch(
  () => theme.accent,
  (accent) => {
    const whiteContrast = 1.05 / (luminance(accent) + 0.05)
    document.documentElement.style.setProperty('--p-on-accent', whiteContrast >= 3 ? '#ffffff' : '#111214')
  },
  { immediate: true },
)
</script>

<template>
  <!-- TEMPORARY (redesign Phase 1): tap to flip between the current and the proposed layout. -->
  <button type="button" class="proto-switch" :aria-label="t('proto.switchAria')" @click="nextProtoDirection">
    {{ label }}
  </button>
</template>

<style scoped>
.proto-switch {
  position: fixed;
  left: 0;
  top: 46%;
  z-index: 300;
  padding: 10px 5px;
  border: 1px solid var(--color-border-hover);
  border-left: none;
  border-radius: 0 8px 8px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  writing-mode: vertical-rl;
  color: var(--color-heading);
  background: var(--color-background-mute);
  opacity: 0.85;
  cursor: pointer;
}
</style>
