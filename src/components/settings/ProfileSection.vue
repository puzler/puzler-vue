<template>
  <section class="bg-paper border border-line rounded-xl p-6 mb-6">
    <h2 class="font-display text-lg font-semibold mb-4">
      Profile
    </h2>

    <AvatarUploader />

    <form
      class="flex flex-col gap-3"
      @submit.prevent="saveProfile"
    >
      <label class="text-sm text-soft">
        Username
        <input
          v-model="form.username"
          type="text"
          required
          minlength="3"
          maxlength="30"
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        >
        <span class="text-xs text-faint">Your unique handle, used in your profile link.</span>
      </label>
      <label class="text-sm text-soft">
        Display name
        <input
          v-model="form.displayName"
          type="text"
          required
          maxlength="50"
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        >
        <span class="text-xs text-faint">Shown to others; spaces and punctuation are fine.</span>
      </label>
      <label class="text-sm text-soft">
        Bio
        <textarea
          v-model="form.bio"
          rows="3"
          class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
        />
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
          class="self-start px-4 py-2 rounded-lg bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors disabled:opacity-50"
        >
          {{ pending ? 'Saving…' : 'Save profile' }}
        </button>
        <span
          v-if="saved"
          class="text-sm text-soft"
        >Saved.</span>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import AvatarUploader from '@/components/settings/AvatarUploader.vue'

const auth = useAuthStore()

const form = reactive({ username: '', displayName: '', bio: '' })
const errors = ref<string[]>([])
const pending = ref(false)
const saved = ref(false)

watch(
  () => auth.user,
  (user) => {
    if (user) {
      form.username = user.username
      form.displayName = user.displayName
      form.bio = user.bio ?? ''
    }
  },
  { immediate: true },
)

async function saveProfile() {
  errors.value = []
  saved.value = false
  pending.value = true
  try {
    await auth.updateProfile({ username: form.username, displayName: form.displayName, bio: form.bio })
    saved.value = true
  } catch (e) {
    errors.value =
      e instanceof ApiError && e.errors.length ? e.errors : ['Something went wrong. Please try again.']
  } finally {
    pending.value = false
  }
}
</script>
