<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="w-full max-w-sm">
      <h1 class="font-display text-2xl font-bold mb-6 text-center">
        {{ mode === 'login' ? 'Sign in' : 'Create account' }}
      </h1>

      <div class="flex flex-col gap-3 mb-6">
        <a
          :href="`${apiUrl}/users/auth/google_oauth2`"
          class="flex items-center justify-center gap-2 px-4 py-3 border border-line rounded-lg hover:bg-line/40 transition-colors"
        >
          Continue with Google
        </a>
        <a
          :href="`${apiUrl}/users/auth/patreon`"
          class="flex items-center justify-center gap-2 px-4 py-3 border border-line rounded-lg hover:bg-line/40 transition-colors"
        >
          Continue with Patreon
        </a>
      </div>

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
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{ mode: 'login' | 'register' }>()

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
</script>
