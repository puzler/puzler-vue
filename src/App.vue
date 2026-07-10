<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useThemeApplier } from '@/composables/useThemeApplier'

const route = useRoute()

// Apply the active theme's CSS variables to <html> for the whole app, reacting to theme
// switches/edits and the Enable Custom Styles gate.
useThemeApplier()
</script>

<template>
  <!-- Print routes escape the fixed-height shell (window.print only paginates
       naturally-flowing documents) and carry no site chrome. -->
  <div
    v-if="route.meta.print"
    class="bg-paper min-h-screen"
  >
    <RouterView />
  </div>
  <div
    v-else
    class="h-[100svh] max-h-[100svh] flex flex-col overflow-hidden"
  >
    <NavBar />
    <RouterView class="flex-1 min-h-0" />
    <AppFooter v-if="!route.meta.hideFooter" />
  </div>
</template>
