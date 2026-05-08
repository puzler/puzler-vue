<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <NavBar />
    <RouterView class="flex-1" />
  </div>
</template>
