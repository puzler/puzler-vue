<template>
  <ContentPage>
    <div class="h-full flex items-center justify-center p-8">
      <div class="w-full max-w-sm">
        <h1 class="font-display text-2xl font-bold mb-6 text-center">
          {{ mode === 'login' ? 'Sign in' : 'Create account' }}
        </h1>

        <div
          v-if="oauthError"
          class="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          {{ oauthError }}
        </div>

        <div
          v-else-if="resetSuccess"
          class="mb-4 px-4 py-3 rounded-lg bg-action-tint border border-line text-sm text-ink-text"
        >
          Your password has been reset. Sign in with your new password.
        </div>

        <form
          class="flex flex-col gap-3 mb-6"
          @submit.prevent="submit"
        >
          <input
            v-if="mode === 'register'"
            v-model="username"
            type="text"
            placeholder="Username"
            autocomplete="username"
            required
            class="px-4 py-3 bg-surface border border-line rounded-md text-ink-text placeholder-faint focus:border-action focus:outline-none transition-colors"
          >
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
            required
            class="px-4 py-3 bg-surface border border-line rounded-md text-ink-text placeholder-faint focus:border-action focus:outline-none transition-colors"
          >
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
            minlength="6"
            class="px-4 py-3 bg-surface border border-line rounded-md text-ink-text placeholder-faint focus:border-action focus:outline-none transition-colors"
          >

          <ul
            v-if="errors.length"
            class="text-sm text-red-700"
          >
            <li
              v-for="error in errors"
              :key="error"
            >
              {{ error }}
            </li>
          </ul>

          <button
            type="submit"
            :disabled="pending"
            class="px-4 py-3 rounded-lg bg-action text-white font-medium hover:bg-action-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up' }}
          </button>

          <RouterLink
            v-if="mode === 'login'"
            to="/forgot-password"
            class="text-sm text-action hover:underline text-center"
          >
            Forgot password?
          </RouterLink>
        </form>

        <OauthButtons />

        <div class="text-center text-sm text-soft">
          {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
          <RouterLink
            :to="mode === 'login' ? '/register' : '/login'"
            class="text-action hover:underline ml-1"
          >
            {{ mode === 'login' ? 'Sign up' : 'Sign in' }}
          </RouterLink>
        </div>
      </div>
    </div>
  </ContentPage>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import OauthButtons from '@/components/auth/OauthButtons.vue'
import ContentPage from '@/components/ContentPage.vue'

const props = defineProps<{ mode: 'login' | 'register' }>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const email = ref('')
const password = ref('')
const errors = ref<string[]>([])
const pending = ref(false)

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  email_taken:
    'An account with that email already exists. Sign in below, then connect the provider from Settings.',
  email_required: "We couldn't get an email address from that provider, so we can't create an account.",
}

const oauthError = computed(() => {
  const error = route.query.error as string | undefined
  if (!error) return null
  return OAUTH_ERROR_MESSAGES[error] ?? `Authentication failed: ${error.replaceAll('_', ' ')}`
})

const resetSuccess = computed(() => route.query.reset === 'success')

async function submit() {
  errors.value = []
  pending.value = true
  try {
    if (props.mode === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.signup(username.value, email.value, password.value)
    }
    router.push((route.query.redirect as string) || '/')
  } catch (e) {
    if (e instanceof ApiError && e.errors.length) {
      errors.value = e.errors
    } else if (e instanceof ApiError && e.status === 401) {
      errors.value = ['Invalid email or password']
    } else {
      errors.value = ['Something went wrong. Please try again.']
    }
  } finally {
    pending.value = false
  }
}
</script>
