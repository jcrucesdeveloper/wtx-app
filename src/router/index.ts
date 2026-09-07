import { createRouter, createWebHistory } from 'vue-router'
import TemplatesView from '../views/TemplatesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/templates' },
    { path: '/templates', name: 'templates', component: TemplatesView },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('../views/SessionsView.vue'),
    },
    {
      path: '/friends',
      name: 'friends',
      component: () => import('../views/FriendsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/ConfigurationView.vue'),
    },
  ],
})

export default router
