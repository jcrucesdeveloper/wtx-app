<script setup lang="ts">
import { ref } from 'vue'
import { Play, Share2 } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import HeaderLink from '@/components/ui/HeaderLink.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import PlateAvatar from '@/components/social/PlateAvatar.vue'
import { PLATE_STEPS } from '@/lib/plateLevel'
import { animateOnce, staggerDelay } from '@/lib/motion'
import { HapticsService } from '@/services/haptics'

/**
 * Development only (see the router): every token and building block on one
 * page, to check a change against the whole system and in both themes.
 * Its labels are for whoever is building the app, so they are not translated.
 */
const COLORS = [
  ['--color-background', 'The page'],
  ['--color-background-soft', 'A surface on the page'],
  ['--color-background-mute', 'Raised or pressed'],
  ['--color-heading', 'Text that leads'],
  ['--color-text', 'Text that supports'],
  ['--color-border-hover', 'An outlined control'],
  ['--color-accent', 'The one action, and progress'],
  ['--color-on-accent', 'Ink on the accent'],
  ['--color-danger', 'Destructive, as text'],
] as const

const TYPE = [
  ['--text-display', 'Display 28', 'The one thing on a screen'],
  ['--text-title', 'Title 22', 'A name, a number that matters'],
  ['--text-body', 'Body 16', 'Row labels and reading text'],
  ['--text-small', 'Small 13', 'Supporting lines and buttons'],
  ['--text-micro', 'Micro 11', 'Dense data labels only'],
] as const

const SPACE = [1, 2, 3, 4, 5, 6, 7, 8]
const RADII = ['xs', 'sm', 'md', 'lg', 'xl', 'pill']
const MOTION = [
  ['instant', 'A press answering a finger'],
  ['quick', 'A state change'],
  ['base', 'An element entering'],
  ['slow', 'A celebration landing'],
] as const

const HAPTICS = ['selection', 'light', 'medium', 'heavy', 'success', 'warning', 'error'] as const

const name = ref('')
const sheetOpen = ref(false)
const switchOn = ref(true)
const revealKey = ref(0)

function play(event: Event, duration: (typeof MOTION)[number][0]) {
  const dot = (event.currentTarget as HTMLElement).querySelector('.motion__dot')
  animateOnce(dot, [{ transform: 'translateX(0)' }, { transform: 'translateX(120px)' }], {
    duration,
  })
}

function spring(event: Event) {
  animateOnce(event.currentTarget as HTMLElement, [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }], {
    duration: 'slow',
    easing: 'spring',
  })
}
</script>

<template>
  <AppPage sub title="UI reference">
    <template #leading>
      <HeaderLink kind="back" />
    </template>

    <div class="ref">
      <section>
        <h2 class="ref__h">Colour roles</h2>
        <ul class="swatches">
          <li v-for="[token, role] in COLORS" :key="token" class="swatch">
            <span class="swatch__chip" :style="{ background: `var(${token})` }" />
            <span class="swatch__text">
              <span class="swatch__role">{{ role }}</span>
              <code>{{ token }}</code>
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="ref__h">Type</h2>
        <div v-for="[token, label, use] in TYPE" :key="token" class="type">
          <span class="type__sample" :style="{ fontSize: `var(${token})` }">{{ label }}</span>
          <span class="type__use">{{ use }} · <code>{{ token }}</code></span>
        </div>
      </section>

      <section>
        <h2 class="ref__h">Space</h2>
        <div v-for="n in SPACE" :key="n" class="space">
          <code>--space-{{ n }}</code>
          <span class="space__bar" :style="{ width: `var(--space-${n})` }" />
        </div>
      </section>

      <section>
        <h2 class="ref__h">Radius</h2>
        <div class="radii">
          <div v-for="r in RADII" :key="r" class="radius">
            <span class="radius__box" :style="{ borderRadius: `var(--radius-${r})` }" />
            <code>{{ r }}</code>
          </div>
        </div>
      </section>

      <section>
        <h2 class="ref__h">Motion</h2>
        <p class="ref__p">Tap a row. With reduced motion on, nothing moves.</p>
        <button
          v-for="[token, use] in MOTION"
          :key="token"
          type="button"
          class="motion"
          @click="play($event, token)"
        >
          <span class="motion__dot" />
          <span class="motion__text">{{ use }} · <code>--motion-{{ token }}</code></span>
        </button>
        <div class="motion-row">
          <button type="button" class="motion-spring" @click="spring">ease-spring</button>
          <AppButton size="sm" variant="quiet" @click="revealKey++">Replay stagger</AppButton>
        </div>
        <ul :key="revealKey" class="stagger">
          <li v-for="i in 4" :key="i" :style="{ animationDelay: staggerDelay(i) }">Item {{ i }}</li>
        </ul>
      </section>

      <section>
        <h2 class="ref__h">Buttons</h2>
        <div class="stack">
          <AppButton variant="primary" size="lg" block>
            <Play :size="16" :stroke-width="2.5" fill="currentColor" /> Primary, large
          </AppButton>
          <AppButton block><Share2 :size="18" :stroke-width="2.25" /> Secondary</AppButton>
          <div class="row">
            <AppButton variant="quiet" size="sm">Quiet, small</AppButton>
            <AppButton variant="danger" size="sm">Danger</AppButton>
            <AppButton size="sm" disabled>Disabled</AppButton>
          </div>
        </div>
      </section>

      <section>
        <h2 class="ref__h">Card</h2>
        <div class="stack">
          <AppCard padding="lg">
            <p class="card-title">A hero card</p>
            <p class="ref__p">The one container on a screen.</p>
          </AppCard>
          <AppCard as="button">A tappable card</AppCard>
        </div>
      </section>

      <section>
        <h2 class="ref__h">Input</h2>
        <div class="stack">
          <AppInput v-model="name" label="Your name" placeholder="What your friends will see" hint="Up to 24 characters." />
          <AppInput label="With an error" error="That code doesn't match anyone." />
        </div>
      </section>

      <section>
        <h2 class="ref__h">Rows and groups</h2>
        <SettingsGroup title="A group">
          <SettingsRow label="A row that goes somewhere" hint="With a supporting line." action />
          <SettingsRow label="A row with a control">
            <button
              type="button"
              class="switch"
              role="switch"
              :aria-checked="switchOn"
              aria-label="Example switch"
              @click="switchOn = !switchOn"
            >
              <i />
            </button>
          </SettingsRow>
          <SettingsRow label="A destructive row" action danger />
        </SettingsGroup>
      </section>

      <section>
        <h2 class="ref__h">Sheet</h2>
        <AppButton block @click="sheetOpen = true">Open a sheet</AppButton>
        <BottomSheet :open="sheetOpen" title="A sheet" @close="sheetOpen = false">
          <p class="ref__p">Content slides up over a scrim. Back or a tap outside closes it.</p>
          <AppButton variant="primary" size="lg" block @click="sheetOpen = false">Done</AppButton>
        </BottomSheet>
      </section>

      <section>
        <h2 class="ref__h">Plates</h2>
        <div class="plates">
          <PlateAvatar id="ref-0" name="No plate" :size="48" :step="null" />
          <PlateAvatar
            v-for="step in PLATE_STEPS"
            :id="`ref-${step.at}`"
            :key="step.at"
            :name="`${step.at}`"
            :size="48"
            :step="step"
          />
        </div>
      </section>

      <section>
        <h2 class="ref__h">Haptics</h2>
        <p class="ref__p">Silent in a browser. Lightest to heaviest, then the two signals.</p>
        <div class="row">
          <AppButton v-for="h in HAPTICS" :key="h" size="sm" variant="quiet" @click="HapticsService[h]()">
            {{ h }}
          </AppButton>
        </div>
      </section>

      <section>
        <h2 class="ref__h">Tab bar</h2>
        <p class="ref__p">
          Below this page. Three places and no actions; the current one is marked by shape and
          weight, not the accent.
        </p>
      </section>
    </div>
  </AppPage>
</template>

<style scoped>
.ref {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.ref__h {
  margin-bottom: var(--space-3);
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  color: var(--color-heading);
}

.ref__p {
  margin-bottom: var(--space-3);
  font-size: var(--text-small);
}

code {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.swatches {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.swatch {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.swatch__chip {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
}

.swatch__text {
  display: flex;
  flex-direction: column;
}

.swatch__role {
  font-size: var(--text-small);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.type {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-3);
}

.type__sample {
  font-weight: var(--weight-heavy);
  line-height: 1.2;
  color: var(--color-heading);
}

.type__use {
  font-size: var(--text-small);
}

.space {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 24px;
}

.space code {
  width: 84px;
}

.space__bar {
  height: 12px;
  border-radius: 2px;
  background: var(--color-heading);
}

.radii {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.radius {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.radius__box {
  width: 48px;
  height: 48px;
  background: var(--color-background-mute);
}

.motion {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--size-touch);
  border: none;
  padding: 0;
  text-align: left;
  font: inherit;
  font-size: var(--text-small);
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.motion__dot {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-accent);
}

.motion__text {
  margin-left: auto;
}

.motion-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-3) 0;
}

.motion-spring {
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  font: inherit;
  font-size: var(--text-small);
  font-weight: var(--weight-bold);
  color: var(--color-on-accent);
  background: var(--color-accent);
  cursor: pointer;
}

.stagger {
  list-style: none;
  display: flex;
  gap: var(--space-2);
  padding: 0;
}

.stagger li {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-small);
  background: var(--color-background-soft);
  animation: ref-rise var(--motion-base) var(--ease-out) both;
}

@keyframes ref-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.card-title {
  font-size: var(--text-display);
  font-weight: var(--weight-heavy);
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 32px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--color-background-mute);
  box-shadow: inset 0 0 0 1px var(--color-border-hover);
  cursor: pointer;
}

.switch i {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-text);
  transition: transform var(--motion-quick) ease-out;
}

.switch[aria-checked='true'] {
  background: var(--color-heading);
  box-shadow: none;
}

.switch[aria-checked='true'] i {
  transform: translateX(20px);
  background: var(--color-background);
}

.plates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
</style>
