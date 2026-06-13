<script setup lang="ts">
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const year = new Date().getFullYear()
</script>

<!-- Compact, always-visible footer pinned by the app shell (App.vue). -->
<template>
  <footer class="bg-paper border-t border-line shrink-0">
    <div
      class="max-w-5xl mx-auto px-4 py-1.5 flex items-center justify-center sm:justify-between flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-soft"
    >
      <span>© {{ year }} Puzler</span>

      <nav class="flex items-center gap-x-4">
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
