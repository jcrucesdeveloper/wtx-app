import { createRouter, createWebHistory } from 'vue-router'
import TemplatesView from '../views/templates/TemplatesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/templates' },
    { path: '/templates', name: 'templates', component: TemplatesView },
    {
      path: '/templates/:id',
      name: 'template-detail',
      component: () => import('../views/templates/TemplateDetailView.vue'),
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
      path: '/friends',
      name: 'friends',
      component: () => import('../views/social/FriendsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/menu/ConfigurationView.vue'),
    },
  ],
})

export default router
