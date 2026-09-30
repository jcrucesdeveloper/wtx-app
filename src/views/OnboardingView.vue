<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'
import { markOnboardingSeen } from '@/lib/onboarding'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const STEPS: { icon: IconName; key: 'routines' | 'sessions' | 'social' }[] = [
  { icon: 'routines', key: 'routines' },
  { icon: 'sessions', key: 'sessions' },
  { icon: 'social', key: 'social' },
]

const step = ref(0)
const isLast = computed(() => step.value === STEPS.length - 1)

function finish() {
  markOnboardingSeen()
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
}

function next() {
  if (isLast.value) finish()
  else step.value++
}
</script>

<template>
  <div class="onboarding">
    <button type="button" class="skip" @click="finish">{{ t('onboarding.skip') }}</button>

    <div class="content">
      <div class="icon">
        <AppIcon :name="STEPS[step]!.icon" :size="40" />
      </div>
      <h1 class="title">{{ t(`onboarding.${STEPS[step]!.key}.title`) }}</h1>
      <p class="body">{{ t(`onboarding.${STEPS[step]!.key}.body`) }}</p>
    </div>

    <div class="footer">
      <div class="dots" role="presentation">
        <span v-for="(_, i) in STEPS" :key="i" class="dot" :class="{ 'dot--active': i === step }" />
      </div>
      <button type="button" class="next" @click="next">
        {{ isLast ? t('onboarding.getStarted') : t('onboarding.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 24px;
  background: var(--color-background);
}

.skip {
  align-self: flex-end;
  border: none;
  background: none;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
  opacity: 0.7;
  cursor: pointer;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 0 8px;
}

.icon {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-background-soft));
}

.title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-heading);
}

.body {
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-heading);
  opacity: 0.75;
  max-width: 320px;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-bottom: 16px;
}

.dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0.25;
}

.dot--active {
  opacity: 1;
}

.next {
  width: 100%;
  border: none;
  border-radius: var(--radius-md);
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
}
</style>
