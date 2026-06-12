<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="flex items-center gap-3 mb-6">
    <div class="flex-1 h-px bg-line" />
    <span class="text-xs text-faint uppercase tracking-wide">or</span>
    <div class="flex-1 h-px bg-line" />
  </div>

  <div class="flex flex-col gap-3 mb-6">
    <button
      type="button"
      class="flex items-center justify-center gap-2 px-4 py-3 border border-line rounded-lg hover:bg-line/40 transition-colors"
      @click="auth.loginWithProvider('google')"
    >
      Continue with Google
    </button>
    <button
      type="button"
      class="flex items-center justify-center gap-2 px-4 py-3 border border-line rounded-lg hover:bg-line/40 transition-colors"
      @click="auth.loginWithProvider('patreon')"
    >
      Continue with Patreon
    </button>
  </div>
</template>
