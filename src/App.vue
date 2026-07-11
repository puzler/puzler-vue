<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import CompetitionBar from '@/components/competitions/CompetitionBar.vue'
import { useThemeApplier } from '@/composables/useThemeApplier'
import { useAuthStore } from '@/stores/auth'
import { useCompetitionStore } from '@/stores/competition'

const route = useRoute()

// Apply the active theme's CSS variables to <html> for the whole app, reacting to theme
// switches/edits and the Enable Custom Styles gate.
useThemeApplier()

// An active competition run follows the user everywhere (the bar + enforced
// settings), so hydrate it as soon as we know who they are.
const auth = useAuthStore()
const competition = useCompetitionStore()
watch(() => auth.isAuthenticated, (authed) => {
  if (authed) void competition.refreshActiveRun()
}, { immediate: true })
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
    <CompetitionBar />
    <RouterView class="flex-1 min-h-0" />
    <AppFooter v-if="!route.meta.hideFooter" />
  </div>
</template>
