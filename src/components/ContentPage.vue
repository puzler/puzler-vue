<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue'
</script>

<!-- Scrollable page shell with a footer pinned below the content. The editor
     and player manage their own fixed viewports and intentionally opt out. -->
<template>
  <div class="h-full overflow-y-auto">
    <div class="min-h-full flex flex-col">
      <div class="flex-1">
        <slot />
      </div>
      <AppFooter />
    </div>
  </div>
</template>
