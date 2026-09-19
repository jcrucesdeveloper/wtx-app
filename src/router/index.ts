import { createRouter, createWebHistory } from 'vue-router'
import RoutinesView from '../views/routines/RoutinesView.vue'

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
      path: '/settings',
      name: 'settings',
      component: () => import('../views/menu/ConfigurationView.vue'),
    },
  ],
})

export default router
