<script setup lang="ts">
import CommentItem from './CommentItem.vue'
import type { PuzzleDescriptionFieldsFragment } from '@/graphql/generated/types'

defineProps<{ comments: PuzzleDescriptionFieldsFragment['comments'] }>()
</script>

<template>
  <p
    v-if="!comments.length"
    class="text-sm text-soft"
  >
    No comments yet.
  </p>
  <ul
    v-else
    class="flex flex-col gap-4"
  >
    <li
      v-for="comment in comments"
      :key="comment.id"
      class="p-4 rounded-xl border border-line"
    >
      <CommentItem :comment="comment" />
      <ul
        v-if="comment.replies.length"
        class="mt-3 ml-6 flex flex-col gap-3 border-l border-line pl-4"
      >
        <li
          v-for="reply in comment.replies"
          :key="reply.id"
        >
          <CommentItem :comment="reply" />
        </li>
      </ul>
    </li>
  </ul>
</template>
