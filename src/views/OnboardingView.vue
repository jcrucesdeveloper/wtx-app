<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, Dumbbell, Users } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useRoutinesStore } from '@/stores/routines'
import { markOnboardingSeen } from '@/lib/onboarding'

/**
 * First run, on one screen. It says what the app is, shows that there is
 * already something in it (the starter routines), and gets out of the way:
 * the app itself is where people learn it.
 */
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const routines = useRoutinesStore()

const points = computed(() => [
  { icon: Dumbbell, title: t('onboarding.routines.title'), text: t('onboarding.routines.short') },
  { icon: CalendarDays, title: t('onboarding.sessions.title'), text: t('onboarding.sessions.short') },
  { icon: Users, title: t('onboarding.social.title'), text: t('onboarding.social.short') },
])

function finish() {
  markOnboardingSeen()
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
}
</script>

<template>
  <div class="onboarding">
    <div class="content">
      <h1 class="headline">{{ t('onboarding.headline') }}</h1>
      <p class="lead">
        {{ t('onboarding.lead', { count: routines.list.length }, routines.list.length) }}
      </p>

      <ul class="points">
        <li v-for="(point, i) in points" :key="point.title" class="point" :style="{ '--i': i }">
          <span class="point__icon"><component :is="point.icon" :size="20" :stroke-width="2" /></span>
          <span class="point__body">
            <span class="point__title">{{ point.title }}</span>
            <span class="point__text">{{ point.text }}</span>
          </span>
        </li>
      </ul>
    </div>

    <!-- `next` only so the existing capture scripts still find it. -->
    <AppButton variant="primary" size="lg" block class="next" @click="finish">
      {{ t('onboarding.getStarted') }}
    </AppButton>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: var(--space-6) var(--space-5);
  background: var(--color-background);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
}

.headline {
  font-size: 34px;
  font-weight: var(--weight-heavy);
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-heading);
  animation: onboarding-rise var(--motion-base) var(--ease-out) both;
}

.lead {
  font-size: var(--text-body);
  line-height: 1.45;
  animation: onboarding-rise var(--motion-base) var(--ease-out) var(--motion-stagger) both;
}

.points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-5);
  padding: 0;
}

.point {
  display: flex;
  align-items: center;
  gap: 14px;
  animation: onboarding-rise var(--motion-base) var(--ease-out) both;
  animation-delay: calc(var(--motion-stagger) * (var(--i) + 2));
}

.point__icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: var(--size-touch);
  height: var(--size-touch);
  border-radius: 50%;
  color: var(--color-heading);
  background: var(--color-background-soft);
}

.point__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point__title {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--color-heading);
}

.point__text {
  font-size: var(--text-small);
  line-height: 1.4;
}

@keyframes onboarding-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
</style>
