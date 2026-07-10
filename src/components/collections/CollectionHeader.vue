<script setup lang="ts">
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import RichProseBody from '@/components/RichProseBody.vue'

// The top of a public collection page: cover hero, title, author line, the
// rich body (or plain description fallback), and the mode/timing hints.
// `bodyHtml` is already sanitized by the caller.
defineProps<{
  collection: {
    title: string
    coverImageUrl?: string | null
    description?: string | null
    timed: boolean
    author: { id: string; username: string; displayName: string }
    puzzles: { id: string }[]
  }
  bodyHtml: string
  isSequence: boolean
}>()
</script>

<template>
  <div>
    <img
      v-if="collection.coverImageUrl"
      :src="collection.coverImageUrl"
      alt=""
      class="w-full aspect-video object-cover rounded-xl border border-line mb-4"
    >
    <h1
      data-tour="collection-header"
      class="font-display text-2xl font-bold"
    >
      {{ collection.title }}
    </h1>
    <p class="text-sm text-soft mt-1">
      by <AuthorAttribution :author="collection.author" /> · {{ collection.puzzles.length }} puzzle{{ collection.puzzles.length === 1 ? '' : 's' }}
    </p>
    <RichProseBody
      v-if="bodyHtml"
      :html="bodyHtml"
      class="mt-3"
    />
    <p
      v-else-if="collection.description"
      class="text-sm text-ink-text mt-3 whitespace-pre-line"
    >
      {{ collection.description }}
    </p>
    <p
      v-if="isSequence"
      class="text-xs text-action mt-3"
    >
      Solve these in order — each unlocks the next.
    </p>
    <p
      v-if="collection.timed"
      class="text-xs text-action mt-1"
    >
      ⏱ Timed — your solve times are ranked below.
    </p>
  </div>
</template>
