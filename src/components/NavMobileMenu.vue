<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
</script>

<template>
  <div
    v-if="open"
    class="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-1"
  >
    <RouterLink
      to="/puzzles"
      class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      active-class="text-blue-600 bg-blue-50"
      @click="emit('close')"
    >
      Browse
    </RouterLink>
    <RouterLink
      to="/editor"
      class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      active-class="text-blue-600 bg-blue-50"
      @click="emit('close')"
    >
      Set a Puzzle
    </RouterLink>
    <div class="h-px bg-gray-100 my-1" />
    <template v-if="auth.isAuthenticated">
      <RouterLink
        :to="`/profile/${auth.user?.username}`"
        class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="emit('close')"
      >
        {{ auth.user?.username }}
      </RouterLink>
      <button
        class="text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 transition-colors"
        @click="auth.clearAuth(); emit('close')"
      >
        Sign out
      </button>
    </template>
    <template v-else>
      <RouterLink
        to="/login"
        class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        @click="emit('close')"
      >
        Sign in
      </RouterLink>
      <RouterLink
        to="/register"
        class="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        @click="emit('close')"
      >
        Sign up
      </RouterLink>
    </template>
  </div>
</template>
