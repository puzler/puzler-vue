<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'

const route = useRoute()
</script>

<template>
  <div class="h-[100svh] max-h-[100svh] flex flex-col overflow-hidden">
    <NavBar />
    <RouterView class="flex-1 min-h-0" />
    <AppFooter v-if="!route.meta.hideFooter" />
  </div>
</template>
