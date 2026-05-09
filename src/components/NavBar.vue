<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const menuOpen = ref(false)
</script>

<template>
  <nav class="bg-white border-b border-gray-200 shrink-0">
    <!-- Main bar -->
    <div class="h-14 flex items-center px-4 md:px-6 gap-4 md:gap-6">
      <!-- Brand -->
      <RouterLink
        to="/"
        class="text-lg font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors"
      >
        Puzler
      </RouterLink>

      <!-- Desktop nav links -->
      <div class="hidden md:flex items-center gap-1">
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

      <div class="flex-1" />

      <!-- Desktop auth -->
      <div class="hidden md:flex items-center gap-3">
        <template v-if="auth.isAuthenticated">
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
        </template>
        <template v-else>
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
        </template>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        :aria-expanded="menuOpen"
        aria-label="Toggle menu"
        @click="menuOpen = !menuOpen"
      >
        <svg v-if="!menuOpen" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Mobile dropdown -->
    <div v-if="menuOpen" class="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
      <RouterLink
        to="/puzzles"
        class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="text-blue-600 bg-blue-50"
        @click="menuOpen = false"
      >
        Browse
      </RouterLink>
      <RouterLink
        to="/editor"
        class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        active-class="text-blue-600 bg-blue-50"
        @click="menuOpen = false"
      >
        Set a Puzzle
      </RouterLink>
      <div class="h-px bg-gray-100 my-1" />
      <template v-if="auth.isAuthenticated">
        <RouterLink
          :to="`/profile/${auth.user?.username}`"
          class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          @click="menuOpen = false"
        >
          {{ auth.user?.username }}
        </RouterLink>
        <button
          class="text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          @click="auth.clearAuth(); menuOpen = false"
        >
          Sign out
        </button>
      </template>
      <template v-else>
        <RouterLink
          to="/login"
          class="px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          @click="menuOpen = false"
        >
          Sign in
        </RouterLink>
        <RouterLink
          to="/register"
          class="px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          @click="menuOpen = false"
        >
          Sign up
        </RouterLink>
      </template>
    </div>
  </nav>
</template>
