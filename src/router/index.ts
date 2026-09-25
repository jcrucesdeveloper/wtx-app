import { createRouter, createWebHistory } from 'vue-router'
import RoutinesView from '../views/routines/RoutinesView.vue'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Sends logged-out visitors to log in on the Social tab first, then back here. */
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: RoutinesView },
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
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  await auth.whenReady()
  if (auth.isLoggedIn) return true
  return { name: 'social', query: { redirect: to.fullPath } }
})

export default router
