<template>
  <ContentPage>
    <div class="h-full flex items-center justify-center p-4 sm:p-8">
      <div class="w-full max-w-sm">
        <h1 class="font-display text-2xl font-bold mb-6 text-center">
          Choose a new password
        </h1>

        <div
          v-if="!token"
          class="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          This reset link is invalid. Please request a new one from the
          <RouterLink
            to="/forgot-password"
            class="text-action hover:underline"
          >
            forgot password
          </RouterLink>
          page.
        </div>

        <form
          v-else
          class="flex flex-col gap-3"
          @submit.prevent="submit"
        >
          <input
            v-model="password"
            type="password"
            placeholder="New password"
            autocomplete="new-password"
            required
            minlength="6"
            class="px-4 py-3 bg-surface border border-line rounded-md text-ink-text placeholder-faint focus:border-action focus:outline-none transition-colors"
          >
          <input
            v-model="passwordConfirmation"
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
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
            {{ pending ? 'Please wait…' : 'Reset password' }}
          </button>
        </form>
      </div>
    </div>
  </ContentPage>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ContentPage from '@/components/ContentPage.vue'
import { ApiError } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = computed(() => (route.query.token as string) || '')
const password = ref('')
const passwordConfirmation = ref('')
const errors = ref<string[]>([])
const pending = ref(false)

async function submit() {
  errors.value = []
  if (password.value !== passwordConfirmation.value) {
    errors.value = ["Passwords don't match"]
    return
  }
  pending.value = true
  try {
    await auth.resetPassword(token.value, password.value)
    router.push({ name: 'login', query: { reset: 'success' } })
  } catch (e) {
    errors.value =
      e instanceof ApiError && e.errors.length ? e.errors : ['Something went wrong. Please try again.']
  } finally {
    pending.value = false
  }
}
</script>
