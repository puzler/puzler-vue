<template>
  <div>
    <div class="flex items-center gap-4 mb-5">
      <img
        v-if="auth.user?.avatarUrl"
        :src="auth.user.avatarUrl"
        alt="Avatar"
        class="w-16 h-16 rounded-full object-cover border border-line bg-surface"
      >
      <div
        v-else
        class="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center text-xl font-display font-semibold text-soft"
      >
        {{ auth.user?.username?.charAt(0).toUpperCase() }}
      </div>
      <div class="flex gap-2">
        <label
          class="px-3 py-1.5 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 cursor-pointer transition-colors"
        >
          {{ pending ? 'Uploading…' : 'Upload photo' }}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            :disabled="pending"
            @change="onSelected"
          >
        </label>
        <button
          v-if="auth.user?.avatarUrl"
          type="button"
          :disabled="pending"
          class="px-3 py-1.5 rounded-lg text-sm text-soft hover:bg-line/60 transition-colors"
          @click="remove"
        >
          Remove
        </button>
      </div>
    </div>
    <p
      v-if="error"
      class="text-sm text-red-700 mb-4"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'

const auth = useAuthStore()

const pending = ref(false)
const error = ref<string | null>(null)

async function onSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error.value = null
  pending.value = true
  try {
    await auth.uploadAvatar(file)
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Upload failed. Please try again.'
  } finally {
    pending.value = false
    input.value = ''
  }
}

async function remove() {
  error.value = null
  pending.value = true
  try {
    await auth.removeAvatar()
  } catch {
    error.value = 'Could not remove the photo. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>
