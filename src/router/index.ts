import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'editor-new' },
    },
    {
      path: '/editor',
      name: 'editor-new',
      component: () => import('@/views/EditorView.vue'),
    },
    {
      path: '/editor/:id',
      name: 'editor-edit',
      component: () => import('@/views/EditorView.vue'),
    },
    {
      path: '/puzzles',
      name: 'archive',
      component: () => import('@/views/ArchiveView.vue'),
    },
    {
      path: '/puzzles/:id',
      name: 'player',
      component: () => import('@/views/PlayerView.vue'),
    },
    {
      path: '/profile/:username',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/AuthView.vue'),
      props: { mode: 'login' },
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/AuthView.vue'),
      props: { mode: 'register' },
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/auth/callback/:provider',
      name: 'oauth-callback',
      component: () => import('@/views/OAuthCallbackView.vue'),
    },
    {
      path: '/legal/tos',
      name: 'terms',
      component: () => import('@/views/legal/TermsView.vue'),
    },
    {
      path: '/legal/privacy',
      name: 'privacy',
      component: () => import('@/views/legal/PrivacyView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // main.ts kicks off fetchCurrentUser without awaiting it, so a deep link to
  // a guarded route can arrive before the user is loaded. Settle the session
  // first whenever a token exists but the user hasn't been fetched yet.
  if (auth.token && !auth.user) {
    await auth.fetchCurrentUser()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'editor-new' }
  }
})

export default router
