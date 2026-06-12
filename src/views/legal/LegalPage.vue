<script setup lang="ts">
import ContentPage from '@/components/ContentPage.vue'

defineProps<{ title: string; updated: string }>()
</script>

<template>
  <ContentPage>
    <div class="bg-canvas min-h-full py-12 px-6">
      <article class="max-w-3xl mx-auto">
        <header class="mb-8">
          <h1 class="font-display text-3xl font-bold">
            {{ title }}
          </h1>
          <p class="text-sm text-faint mt-2">
            Last updated {{ updated }}
          </p>
        </header>
        <div class="prose-legal">
          <slot />
        </div>
      </article>
    </div>
  </ContentPage>
</template>
