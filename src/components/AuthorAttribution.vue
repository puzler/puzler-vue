<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Public attribution for a puzzle/collection/series. A puzzle may carry a
// free-form `authorName` credit (which can be a pseudonym, so it's shown as
// plain text). When that's absent — or for collections/series, which have no
// free-text author — we attribute to the owning account's display name, linked
// to their profile. Username never appears here; it's only the link target.
// Pass `plain` where this sits inside another anchor (e.g. a card link), to
// render text instead of a nested link. (Boolean props default to false when
// omitted, so the default behaviour is to link.)
defineProps<{
  author: { username: string; displayName: string }
  authorName?: string | null
  plain?: boolean
}>()
</script>

<template>
  <span v-if="authorName">{{ authorName }}</span>
  <RouterLink
    v-else-if="!plain"
    :to="`/profile/${author.username}`"
    class="hover:text-action transition-colors"
  >
    {{ author.displayName }}
  </RouterLink>
  <span v-else>{{ author.displayName }}</span>
</template>
