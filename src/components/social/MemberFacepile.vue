<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from '@lucide/vue'
import { initials } from '@/lib/memberColors'
import { inkOnAccent } from '@/lib/accentInk'

export interface Face {
  userId: string
  name: string
  /** The member's room color (join order, see memberColors). */
  color: string
  /** 0–1: shown as a ring in their color around the avatar (their share of the plan). */
  progress?: number
  /** `false` dims the avatar (not in the room right now); unset means presence isn't shown. */
  online?: boolean
  done?: boolean
}

/**
 * A room's members as one stack of overlapping avatars: who's here, from
 * the lobby through the live strip to the recap. Always in join order.
 * With `selectable` each face is a button. With `land` the faces drop in
 * one by one (the reveal collapses when motion is reduced, via the tokens).
 *
 * The cut-out around each face is `--facepile-edge`. Set it to the surface
 * the stack sits on.
 */
const props = withDefaults(
  defineProps<{
    faces: Face[]
    size?: number
    /** Faces shown before the rest collapse into "+N". */
    max?: number
    selectable?: boolean
    land?: boolean
  }>(),
  { size: 28, max: 5, selectable: false, land: false },
)

const emit = defineEmits<{ select: [userId: string] }>()

const { t } = useI18n()

const shown = computed(() => (props.faces.length > props.max ? props.faces.slice(0, props.max - 1) : props.faces))
const hidden = computed(() => props.faces.length - shown.value.length)

const RING = 2.5

function ringStyle(face: Face) {
  if (face.progress === undefined) return undefined
  const turn = Math.max(0, Math.min(1, face.progress)) * 360
  return {
    padding: `${RING}px`,
    background: `conic-gradient(${face.color} ${turn}deg, var(--color-background-mute) 0deg)`,
  }
}

function faceLabel(face: Face): string {
  return face.done ? t('room.summary.faceDone', { name: face.name }) : face.name
}
</script>

<template>
  <ul class="facepile" :class="{ 'facepile--land': land }" :style="{ '--face': `${size}px` }">
    <li
      v-for="(face, i) in shown"
      :key="face.userId"
      class="facepile__item"
      :class="{ 'facepile__item--away': face.online === false }"
      :style="{ '--i': i }"
    >
      <component
        :is="selectable ? 'button' : 'span'"
        :type="selectable ? 'button' : undefined"
        class="facepile__face"
        :style="ringStyle(face)"
        :aria-label="faceLabel(face)"
        :role="selectable ? undefined : 'img'"
        @click="selectable && emit('select', face.userId)"
      >
        <span class="facepile__avatar" :style="{ background: face.color, color: inkOnAccent(face.color) }">
          {{ initials(face.name) }}
        </span>
        <span v-if="face.done" class="facepile__done" aria-hidden="true">
          <Check :size="Math.max(9, Math.round(size * 0.32))" :stroke-width="3.5" />
        </span>
      </component>
    </li>
    <li v-if="hidden > 0" class="facepile__item" :style="{ '--i': shown.length }">
      <span class="facepile__face facepile__more" role="img" :aria-label="t('room.summary.moreMembers', { count: hidden })">
        +{{ hidden }}
      </span>
    </li>
  </ul>
</template>

<style scoped>
.facepile {
  --facepile-edge-color: var(--facepile-edge, var(--color-background));
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
}

.facepile__item {
  display: flex;
  flex-shrink: 0;
  transition: opacity var(--motion-quick) var(--ease-out);
}

/* Overlap by about a quarter of a face. */
.facepile__item + .facepile__item {
  margin-left: calc(var(--face) * -0.24);
}

.facepile__item--away {
  opacity: 0.45;
}

.facepile__face {
  position: relative;
  display: inline-flex;
  border: none;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  box-shadow: 0 0 0 2px var(--facepile-edge-color);
  font: inherit;
  color: inherit;
}

button.facepile__face {
  cursor: pointer;
}

button.facepile__face:active {
  transform: scale(0.94);
}

.facepile__avatar,
.facepile__more {
  display: grid;
  place-items: center;
  width: var(--face);
  height: var(--face);
  border-radius: 50%;
  font-size: calc(var(--face) * 0.36);
  font-weight: var(--weight-bold);
  line-height: 1;
}

.facepile__more {
  background: var(--color-background-mute);
  color: var(--color-heading);
  font-size: calc(var(--face) * 0.34);
  font-variant-numeric: tabular-nums;
}

.facepile__done {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  width: calc(var(--face) * 0.44);
  height: calc(var(--face) * 0.44);
  min-width: 13px;
  min-height: 13px;
  border-radius: 50%;
  background: var(--color-success);
  color: #fff;
  box-shadow: 0 0 0 2px var(--facepile-edge-color);
}

.facepile--land .facepile__item {
  animation: facepile-land var(--motion-slow) var(--ease-spring) both;
  animation-delay: calc(var(--i, 0) * var(--motion-stagger));
}

@keyframes facepile-land {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.6);
  }
}
</style>
