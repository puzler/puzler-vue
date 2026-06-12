<script setup lang="ts">
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-paper border-t border-line">
    <div
      class="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center gap-y-2 gap-x-5 text-xs text-soft"
    >
      <span class="flex items-center gap-1">
        <span aria-hidden="true">©</span> {{ year }} Puzler
      </span>

      <nav class="flex items-center gap-x-5 gap-y-2 flex-wrap justify-center sm:ml-auto">
        <RouterLink
          to="/legal/tos"
          class="hover:text-ink-text transition-colors"
        >
          Terms
        </RouterLink>
        <RouterLink
          to="/legal/privacy"
          class="hover:text-ink-text transition-colors"
        >
          Privacy
        </RouterLink>
        <a
          :href="`${apiUrl}/explorer`"
          class="hover:text-ink-text transition-colors"
        >
          API Explorer
        </a>
      </nav>
    </div>
  </footer>
</template>
