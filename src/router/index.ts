import { createRouter, createWebHistory } from 'vue-router'
import RoutinesView from '../views/routines/RoutinesView.vue'
import { useAuthStore } from '../stores/auth'
import { hasSeenOnboarding } from '../lib/onboarding'

declare module 'vue-router' {
  interface RouteMeta {
    /** Sends logged-out visitors to log in on the Social tab first, then back here. */
    requiresAuth?: boolean
    /**
     * Reachable before the first-run intro has been seen — auth email links
     * must be handled on arrival (their tokens are one-time), not after a
     * detour through onboarding.
     */
    skipOnboarding?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: RoutinesView },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/OnboardingView.vue'),
    },
    {
      path: '/routines/:id',
      name: 'routine-detail',
      component: () => import('../views/routines/RoutineDetailView.vue'),
    },
    {
      path: '/import',
      name: 'import',
      component: () => import('../views/ImportView.vue'),
    },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('../views/sessions/SessionsView.vue'),
    },
    {
      path: '/sessions/active',
      name: 'active-session',
      component: () => import('../views/sessions/ActiveSessionView.vue'),
    },
    {
      path: '/sessions/:id/complete',
      name: 'session-complete',
      component: () => import('../views/sessions/SessionCompleteView.vue'),
    },
    {
      path: '/sessions/:id',
      name: 'session-detail',
      component: () => import('../views/sessions/SessionDetailView.vue'),
    },
    {
      path: '/social',
      name: 'social',
      component: () => import('../views/social/SocialView.vue'),
    },
    {
      path: '/social/join',
      name: 'room-join',
      component: () => import('../views/social/JoinRoomView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social/follow',
      name: 'follow',
      component: () => import('../views/social/FollowView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social/blocked',
      name: 'blocked',
      component: () => import('../views/social/BlockedView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social/posts/:id',
      name: 'feed-post',
      component: () => import('../views/social/FeedPostView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social/u/:id',
      name: 'profile',
      component: () => import('../views/social/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/social/u/:id/connections',
      name: 'connections',
      component: () => import('../views/social/ConnectionsView.vue'),
      meta: { requiresAuth: true },
      // Follow lists are private: only your own can be opened.
      beforeEnter: (to) => {
        if (to.params.id === useAuthStore().user?.id) return true
        return { name: 'profile', params: { id: to.params.id } }
      },
    },
    {
      path: '/rooms/:id',
      name: 'room-lobby',
      component: () => import('../views/social/RoomLobbyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rooms/:id/recap',
      name: 'room-recap',
      component: () => import('../views/social/RoomRecapView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/auth/AuthCallbackView.vue'),
      meta: { skipOnboarding: true },
    },
    {
      path: '/auth/reset',
      name: 'auth-reset',
      component: () => import('../views/auth/ResetPasswordView.vue'),
      meta: { skipOnboarding: true },
    },
    {
      path: '/legal/:doc(terms|privacy)',
      name: 'legal',
      component: () => import('../views/social/LegalView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/menu/ConfigurationView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.name !== 'onboarding' && !to.meta.skipOnboarding && !hasSeenOnboarding()) {
    return { name: 'onboarding', query: { redirect: to.fullPath } }
  }
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  await auth.whenReady()
  if (auth.isLoggedIn) return true
  return { name: 'social', query: { redirect: to.fullPath } }
})

export default router
