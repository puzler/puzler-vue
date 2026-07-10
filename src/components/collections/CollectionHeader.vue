<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import RichProseBody from '@/components/RichProseBody.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPrinterOutline, mdiShareVariantOutline } from '@mdi/js'
import { API_URL } from '@/utils/env'

// The top of a public collection page: cover hero, title, author line, the
// rich body (or plain description fallback), mode/timing hints, and the
// print/share actions. `bodyHtml` is already sanitized by the caller.
const props = defineProps<{
  collection: {
    id: string
    title: string
    coverImageUrl?: string | null
    description?: string | null
    timed: boolean
    author: { id: string; username: string; displayName: string }
    puzzles: { id: string }[]
  }
  bodyHtml: string
  isSequence: boolean
  shareToken: string | null
}>()

const copied = ref(false)

// The share endpoint serves crawlers OG tags (title, blurb, cover) and
// bounces humans to this page, so pasted links unfurl properly.
async function copyShareLink() {
  const token = props.shareToken ? `?t=${props.shareToken}` : ''
  await navigator.clipboard.writeText(`${API_URL}/share/collections/${props.collection.id}${token}`)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
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
    <p class="flex items-center gap-4 mt-2 text-xs">
      <RouterLink
        :to="{ name: 'collection-print', params: { id: collection.id }, query: shareToken ? { t: shareToken } : {} }"
        class="inline-flex items-center gap-1 text-soft hover:text-action"
      >
        <MdiIcon
          :path="mdiPrinterOutline"
          :size="14"
        />
        Print hand-out
      </RouterLink>
      <button
        class="inline-flex items-center gap-1 text-soft hover:text-action"
        @click="copyShareLink"
      >
        <MdiIcon
          :path="mdiShareVariantOutline"
          :size="14"
        />
        {{ copied ? 'Link copied!' : 'Copy share link' }}
      </button>
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
