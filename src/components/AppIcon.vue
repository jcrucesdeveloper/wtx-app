<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  Download,
  FilePlus2,
  LayoutGrid,
  Share2,
  SlidersVertical,
  Users,
} from '@lucide/vue'

export type IconName =
  'templates' | 'sessions' | 'friends' | 'settings' | 'load' | 'create' | 'share'

const ICONS: Record<IconName, Component> = {
  templates: LayoutGrid,
  sessions: Activity,
  friends: Users,
  settings: SlidersVertical,
  load: Download,
  create: FilePlus2,
  share: Share2,
}

const props = defineProps<{
  name: IconName
  size?: number | string
}>()
</script>

<template>
  <component :is="ICONS[props.name]" :size="size ?? 24" :stroke-width="2" aria-hidden="true" />
</template>
