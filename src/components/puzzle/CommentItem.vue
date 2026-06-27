<script setup lang="ts">
import { RouterLink } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import type { CommentFieldsFragment } from '@/graphql/generated/types'

defineProps<{ comment: CommentFieldsFragment }>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 flex-wrap">
      <UserAvatar
        :avatar-url="comment.user.avatarUrl"
        :display-name="comment.user.displayName"
        :size="28"
      />
      <RouterLink
        :to="`/profile/${comment.user.username}`"
        class="text-sm font-medium text-ink-text hover:text-action transition-colors"
      >
        {{ comment.user.displayName }}
      </RouterLink>
      <span
        v-if="comment.isAuthor"
        class="text-[10px] px-1.5 py-0.5 rounded-full bg-action-tint text-action font-medium"
      >Setter</span>
      <span
        v-else-if="comment.commenterSolved"
        class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium"
      >Solved</span>
      <span class="text-xs text-faint">{{ formatDate(comment.createdAt) }}</span>
    </div>
    <p class="mt-1.5 text-sm text-ink-text whitespace-pre-line leading-relaxed">
      {{ comment.body }}
    </p>
  </div>
</template>
