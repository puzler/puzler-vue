<template>
  <section class="bg-paper border border-line rounded-xl p-6 mb-6">
    <h2 class="font-display text-lg font-semibold mb-1">
      {{ auth.user?.passwordSet ? 'Change password' : 'Set a password' }}
    </h2>
    <p
      v-if="!auth.user?.passwordSet"
      class="text-sm text-soft mb-4"
    >
      You signed up with Google or Patreon, so your account doesn't have a
      password yet. Setting one lets you sign in with your email too.
    </p>
    <div
      v-else
      class="mb-4"
    />

    <form
      class="flex flex-col gap-3"
      @submit.prevent="submit"
    >
      <label
        v-if="auth.user?.passwordSet"
        class="text-sm text-soft"
      >
        Current password
        <input
          v-model="form.current"
          type="password"
          autocomplete="current-password"
          required
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        >
      </label>
      <label class="text-sm text-soft">
        New password
        <input
          v-model="form.next"
          type="password"
          autocomplete="new-password"
          required
          minlength="6"
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        >
      </label>

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

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="pending"
          class="self-start px-4 py-2 rounded-lg bg-action text-on-action text-sm font-medium hover:bg-action-deep transition-colors disabled:opacity-50"
        >
          {{ pending ? 'Saving…' : auth.user?.passwordSet ? 'Change password' : 'Set password' }}
        </button>
        <span
          v-if="saved"
          class="text-sm text-soft"
        >Password updated. Other sessions have been signed out.</span>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'

const auth = useAuthStore()

const form = reactive({ current: '', next: '' })
const errors = ref<string[]>([])
const pending = ref(false)
const saved = ref(false)

async function submit() {
  errors.value = []
  saved.value = false
  pending.value = true
  try {
    await auth.changePassword(form.next, auth.user?.passwordSet ? form.current : undefined)
    saved.value = true
    form.current = ''
    form.next = ''
  } catch (e) {
    errors.value =
      e instanceof ApiError && e.errors.length ? e.errors : ['Something went wrong. Please try again.']
  } finally {
    pending.value = false
  }
}
</script>
