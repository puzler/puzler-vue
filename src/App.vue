<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="h-screen max-h-screen flex flex-col overflow-hidden">
    <NavBar />
    <RouterView class="flex-1 min-h-0" />
    <AppFooter />
  </div>
</template>
