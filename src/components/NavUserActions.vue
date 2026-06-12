<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="hidden md:flex items-center gap-3">
    <template v-if="auth.isAuthenticated">
      <RouterLink
        :to="`/profile/${auth.user?.username}`"
        class="text-sm text-white font-medium hover:text-spark transition-colors"
      >
        {{ auth.user?.username }}
      </RouterLink>
      <RouterLink
        to="/settings"
        class="px-3 py-1.5 rounded-md text-sm text-[#9AA3B8] hover:text-white hover:bg-ink-2 transition-colors"
      >
        Settings
      </RouterLink>
      <button
        class="px-3 py-1.5 rounded-md text-sm text-[#9AA3B8] hover:text-white hover:bg-ink-2 transition-colors"
        @click="auth.logout()"
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
</template>
