import { createRouter, createWebHistory } from 'vue-router'
import useAuthStore from '@/stores/auth'
import MainLayout from '@/views/layout/MainLayout.vue'
import SolverView from '@/views/SolverView.vue'
import ApiExplorer from '@/views/ApiExplorer.vue'

import CookiePolicy from '@/views/legal/CookiePolicy.vue'
import PrivacyPolicy from '@/views/legal/PrivacyPolicy.vue'
import TermsOfService from '@/views/legal/TermsOfService.vue'

import AuthRoutes from './auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'root',
          component: SolverView,
        },
        {
          path: 'solve',
          name: 'solve',
          component: SolverView,
        },
        AuthRoutes,
        {
          path: 'legal',
          children: [
            {
              path: 'cookies',
              component: CookiePolicy,
              name: 'CookiePolicyPath',
            },
            {
              path: 'privacy',
              component: PrivacyPolicy,
              name: 'PrivacyPolicyPath',
            },
            {
              path: 'tos',
              component: TermsOfService,
              name: 'TermsOfServicePath',
            },
          ],
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

router.beforeEach(async (to, _, next) => {
  const routeAuthRequirement = to.matched.reduce(
    (currentAuth, route) => {
      if (route.meta.authenticated === null || route.meta.authenticated === undefined) return currentAuth
      return route.meta.authenticated as boolean
    },
    null as null|boolean,
  )
  if (routeAuthRequirement === null) return next()
  
  const authenticated = await useAuthStore().authenticated
  if (!routeAuthRequirement && authenticated) return next('/')
  if (routeAuthRequirement && !authenticated) return next('/auth/sign-in')

  next()
})

export default router
