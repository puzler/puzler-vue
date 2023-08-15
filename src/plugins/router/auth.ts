import type { RouteRecordRaw } from 'vue-router'

import AuthView from '@/views/AuthView.vue'
import SignIn from '@/views/auth/SignIn.vue'
import OmniAuth from '@/views/auth/OmniAuth.vue'
import ForgotPassword from '@/views/auth/ForgotPassword.vue'
import ConfirmEmail from '@/views/auth/ConfirmEmail.vue'
import ConfirmOAuthLink from '@/views/auth/ConfirmOAuthLink.vue'
import ResetPassword from '@/views/auth/ResetPassword.vue'

const AuthRoutes = {
  path: 'auth',
  component: AuthView,
  meta: {
    authenticated: false,
  },
  children: [
    {
      path: 'sign-in',
      component: SignIn,
      name: 'SignInPath',
    },
    {
      path: 'omni/:providerName',
      props: true,
      component: OmniAuth,
      name: 'OmniAuthPath',
    },
    {
      path: 'forgot-password',
      component: ForgotPassword,
      name: 'ForgotPasswordPath',
    },
    {
      path: 'confirm-oauth-link/:token',
      component: ConfirmOAuthLink,
      name: 'ConfirmOAuthLinkPath',
      props: true,
    },
    {
      path: 'confirm-email/:token',
      props: true,
      component: ConfirmEmail,
      name: 'ConfirmEmailPath'
    },
    {
      path: 'password-reset/:token',
      props: true,
      component: ResetPassword,
      name: 'ResetPasswordPath',
    }
  ],
} as RouteRecordRaw

export default AuthRoutes
