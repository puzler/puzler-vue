<template>
  <ContentPage>
    <div class="h-full flex items-center justify-center p-4 sm:p-8">
      <div class="w-full max-w-sm">
        <h1 class="font-display text-2xl font-bold mb-2 text-center">
          Reset password
        </h1>
        <p class="text-sm text-soft mb-6 text-center">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <div
          v-if="sent"
          class="px-4 py-3 rounded-lg bg-action-tint border border-line text-sm text-ink-text"
        >
          If that email exists, reset instructions have been sent. Check your inbox.
        </div>

        <form
          v-else
          class="flex flex-col gap-3"
          @submit.prevent="submit"
        >
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
            required
            class="px-4 py-3 bg-surface border border-line rounded-md text-ink-text placeholder-faint focus:border-action focus:outline-none transition-colors"
          >

          <p
            v-if="error"
            class="text-sm text-red-700"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="pending"
            class="px-4 py-3 rounded-lg bg-action text-on-action font-medium hover:bg-action-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ pending ? 'Please wait…' : 'Send reset link' }}
          </button>
        </form>

        <div class="text-center text-sm text-soft mt-6">
          <RouterLink
            to="/login"
            class="text-action hover:underline"
          >
            Back to sign in
          </RouterLink>
        </div>
      </div>
    </div>
  </ContentPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ContentPage from '@/components/ContentPage.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const email = ref('')
const sent = ref(false)
const error = ref<string | null>(null)
const pending = ref(false)

async function submit() {
  error.value = null
  pending.value = true
  try {
    await auth.forgotPassword(email.value)
    sent.value = true
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>
