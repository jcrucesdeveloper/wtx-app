<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  Download,
  FilePlus2,
  LayoutGrid,
  Play,
  SlidersVertical,
  Users,
  UsersRound,
} from '@lucide/vue'

export type IconName =
  'routines' | 'sessions' | 'social' | 'settings' | 'start' | 'group' | 'load' | 'create'

const ICONS: Record<IconName, Component> = {
  routines: LayoutGrid,
  sessions: Activity,
  social: Users,
  settings: SlidersVertical,
  start: Play,
  group: UsersRound,
  load: Download,
  create: FilePlus2,
}

const props = defineProps<{
  name: IconName
  size?: number | string
}>()
</script>

<template>
  <component :is="ICONS[props.name]" :size="size ?? 24" :stroke-width="2" aria-hidden="true" />
</template>
