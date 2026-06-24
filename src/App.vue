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
  <div class="h-[100svh] max-h-[100svh] flex flex-col overflow-hidden">
    <NavBar />
    <RouterView class="flex-1 min-h-0" />
    <AppFooter v-if="!route.meta.hideFooter" />
  </div>
</template>
