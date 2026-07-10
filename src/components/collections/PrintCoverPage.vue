<script setup lang="ts">
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import RichProseBody from '@/components/RichProseBody.vue'

// The hand-out's cover page: art, title, author, and the collection's rich
// body (or plain description). `bodyHtml` is already sanitized by the caller.
defineProps<{
  collection: {
    title: string
    coverImageUrl?: string | null
    description?: string | null
    author: { id: string; username: string; displayName: string }
  }
  bodyHtml: string
}>()
</script>

<template>
  <section class="break-after-page">
    <img
      v-if="collection.coverImageUrl"
      :src="collection.coverImageUrl"
      alt=""
      class="w-full aspect-video object-cover rounded-xl border border-line mb-6"
    >
    <h1 class="font-display text-3xl font-bold">
      {{ collection.title }}
    </h1>
    <p class="text-sm text-soft mt-1">
      a puzzle hunt by <AuthorAttribution
        :author="collection.author"
        plain
      />
    </p>
    <RichProseBody
      v-if="bodyHtml"
      :html="bodyHtml"
      class="mt-4"
    />
    <p
      v-else-if="collection.description"
      class="text-sm text-ink-text mt-4 whitespace-pre-line"
    >
      {{ collection.description }}
    </p>
  </section>
</template>
