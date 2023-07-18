import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/layout/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import SolverView from '../views/SolverView.vue'
import ApiExplorer from '../views/ApiExplorer.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: 'solve',
          name: 'solve',
          component: SolverView,
        },
      ],
    },
    {
      path: '/api-explorer',
      name: 'apiExplorer',
      component: ApiExplorer,
    },
  ],
})

export default router
