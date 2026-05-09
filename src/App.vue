<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
</script>

<template>
  <div class="h-screen max-h-screen flex flex-col overflow-hidden">
    <NavBar />
    <RouterView class="flex-1" />
  </div>
</template>
