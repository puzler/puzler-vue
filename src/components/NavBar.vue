<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <nav class="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6 shrink-0">
    <!-- Brand -->
    <RouterLink
      to="/"
      class="text-lg font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors"
    >
      Puzler
    </RouterLink>

    <!-- Primary nav -->
    <div class="flex items-center gap-1">
      <RouterLink
        to="/puzzles"
        class="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        active-class="text-blue-600 bg-blue-50 hover:bg-blue-50 hover:text-blue-600"
      >
        Browse
      </RouterLink>
      <RouterLink
        to="/editor"
        class="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        active-class="text-blue-600 bg-blue-50 hover:bg-blue-50 hover:text-blue-600"
      >
        Set a Puzzle
      </RouterLink>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Auth -->
    <div
      v-if="auth.isAuthenticated"
      class="flex items-center gap-3"
    >
      <RouterLink
        :to="`/profile/${auth.user?.username}`"
        class="text-sm text-gray-700 font-medium hover:text-blue-600 transition-colors"
      >
        {{ auth.user?.username }}
      </RouterLink>
      <button
        class="px-3 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        @click="auth.clearAuth()"
      >
        Sign out
      </button>
    </div>
    <div
      v-else
      class="flex items-center gap-2"
    >
      <RouterLink
        to="/login"
        class="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        Sign in
      </RouterLink>
      <RouterLink
        to="/register"
        class="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Sign up
      </RouterLink>
    </div>
  </nav>
</template>
