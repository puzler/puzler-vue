<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavMobileMenu from './NavMobileMenu.vue'

const auth = useAuthStore()
const menuOpen = ref(false)
</script>

<template>
  <nav class="bg-ink shrink-0">
    <div class="h-14 flex items-center px-4 md:px-6 gap-4 md:gap-6">
      <RouterLink
        to="/"
        class="font-display text-xl font-bold text-white tracking-tight hover:text-spark transition-colors"
      >
        Puzler
      </RouterLink>

      <div class="hidden md:flex items-center gap-1 self-stretch">
        <RouterLink
          to="/puzzles"
          class="flex items-center px-3 text-sm text-[#9AA3B8] border-b-2 border-transparent hover:text-white transition-colors"
          active-class="!text-white !border-spark"
        >
          Browse
        </RouterLink>
        <RouterLink
          to="/editor"
          class="flex items-center px-3 text-sm text-[#9AA3B8] border-b-2 border-transparent hover:text-white transition-colors"
          active-class="!text-white !border-spark"
        >
          Set a Puzzle
        </RouterLink>
      </div>

      <div class="flex-1" />

      <div class="hidden md:flex items-center gap-3">
        <template v-if="auth.isAuthenticated">
          <RouterLink
            :to="`/profile/${auth.user?.username}`"
            class="text-sm text-white font-medium hover:text-spark transition-colors"
          >
            {{ auth.user?.username }}
          </RouterLink>
          <button
            class="px-3 py-1.5 rounded-md text-sm text-[#9AA3B8] hover:text-white hover:bg-ink-2 transition-colors"
            @click="auth.clearAuth()"
          >
            Sign out
          </button>
        </template>
        <template v-else>
          <RouterLink
            to="/login"
            class="px-3 py-1.5 rounded-md text-sm text-[#9AA3B8] hover:text-white hover:bg-ink-2 transition-colors"
          >
            Sign in
          </RouterLink>
          <RouterLink
            to="/register"
            class="px-3 py-1.5 rounded-lg text-sm font-medium bg-action text-white hover:bg-action-deep transition-colors"
          >
            Sign up
          </RouterLink>
        </template>
      </div>

      <button
        class="md:hidden p-2 rounded-md text-[#9AA3B8] hover:text-white hover:bg-ink-2 transition-colors"
        :aria-expanded="menuOpen"
        aria-label="Toggle menu"
        @click="menuOpen = !menuOpen"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            v-if="!menuOpen"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <NavMobileMenu
      :open="menuOpen"
      @close="menuOpen = false"
    />
  </nav>
</template>
