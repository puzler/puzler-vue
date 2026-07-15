<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import CommentBody from './CommentBody.vue'
import { apolloClient } from '@/utils/apolloClient'
import DeleteCommentDocument from '@/graphql/gql/social/mutations/DeleteComment.graphql'
import SetCommentSpoilerDocument from '@/graphql/gql/social/mutations/SetCommentSpoiler.graphql'
import type {
  CommentFieldsFragment,
  DeleteCommentMutation,
  DeleteCommentMutationVariables,
  SetCommentSpoilerMutation,
  SetCommentSpoilerMutationVariables,
} from '@/graphql/generated/types'

const props = defineProps<{ comment: CommentFieldsFragment }>()
const emit = defineEmits<{ changed: [] }>()

const confirmingDelete = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function deleteComment() {
  confirmingDelete.value = false
  busy.value = true
  error.value = null
  try {
    await apolloClient.mutate<DeleteCommentMutation, DeleteCommentMutationVariables>({
      mutation: DeleteCommentDocument,
      variables: { id: props.comment.id },
    })
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not delete comment'
  } finally {
    busy.value = false
  }
}

async function toggleSpoiler() {
  busy.value = true
  error.value = null
  try {
    const { data } = await apolloClient.mutate<SetCommentSpoilerMutation, SetCommentSpoilerMutationVariables>({
      mutation: SetCommentSpoilerDocument,
      variables: { id: props.comment.id, spoiler: !props.comment.isSpoiler },
    })
    const errors = data?.setCommentSpoiler?.errors
    if (errors?.length) {
      error.value = errors[0]
      return
    }
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not update comment'
  } finally {
    busy.value = false
  }
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

      <span class="ml-auto inline-flex items-center gap-1">
        <button
          v-if="comment.canMarkSpoiler"
          type="button"
          :disabled="busy"
          class="px-1.5 py-0.5 rounded-md text-[11px] text-soft hover:text-action hover:bg-paper transition-colors disabled:opacity-50"
          data-testid="spoiler-toggle"
          @click="toggleSpoiler"
        >
          {{ comment.isSpoiler ? 'Unmark spoiler' : 'Mark spoiler' }}
        </button>
        <button
          v-if="comment.canDelete"
          type="button"
          :disabled="busy"
          class="px-1.5 py-0.5 rounded-md text-[11px] text-soft hover:text-red-600 hover:bg-paper transition-colors disabled:opacity-50"
          data-testid="delete-comment"
          @click="confirmingDelete = true"
        >
          Delete
        </button>
      </span>
    </div>

    <CommentBody :comment="comment" />

    <p
      v-if="error"
      class="mt-1 text-xs text-red-600"
    >
      {{ error }}
    </p>

    <ConfirmModal
      v-if="confirmingDelete"
      message="Delete this comment? Any replies to it will be deleted too."
      confirm-label="Delete"
      @confirm="deleteComment"
      @cancel="confirmingDelete = false"
    />
  </div>
</template>
