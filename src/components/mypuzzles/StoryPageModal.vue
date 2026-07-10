<script setup lang="ts">
import { apolloClient } from '@/utils/apolloClient'
import BaseModal from '@/components/ui/BaseModal.vue'
import PageDescriptionEditor from '@/components/editor/PageDescriptionEditor.vue'
import UpdateStoryPageDocument from '@/graphql/gql/collections/mutations/UpdateStoryPage.graphql'
import UploadStoryPageImageDocument from '@/graphql/gql/collections/mutations/UploadStoryPageImage.graphql'
import type {
  UpdateStoryPageMutation, UpdateStoryPageMutationVariables,
  UploadStoryPageImageMutation, UploadStoryPageImageMutationVariables,
} from '@/graphql/generated/types'

// Edit one story page: the optional heading plus the rich body. Everything
// autosaves (title on change, body via the editor's debounce), so the only
// action is closing. The parent refreshes its entry list on close.
const props = defineProps<{ storyPage: { id: string; title: string | null; bodyHtml: string | null } }>()
const emit = defineEmits<{ close: [] }>()

async function saveTitle(event: Event) {
  const title = (event.target as HTMLInputElement).value
  await apolloClient.mutate<UpdateStoryPageMutation, UpdateStoryPageMutationVariables>({
    mutation: UpdateStoryPageDocument, variables: { id: props.storyPage.id, title },
  })
}

async function saveBody(html: string) {
  const { data } = await apolloClient.mutate<UpdateStoryPageMutation, UpdateStoryPageMutationVariables>({
    mutation: UpdateStoryPageDocument, variables: { id: props.storyPage.id, html },
  })
  const result = data?.updateStoryPage
  if (!result?.storyPage) throw new Error(result?.errors?.[0] ?? 'Could not save story page')
}

async function uploadImage(file: File): Promise<string> {
  const { data } = await apolloClient.mutate<UploadStoryPageImageMutation, UploadStoryPageImageMutationVariables>({
    mutation: UploadStoryPageImageDocument, variables: { storyPageId: props.storyPage.id, file },
  })
  const result = data?.uploadStoryPageImage
  if (!result?.url) throw new Error(result?.errors?.[0] ?? 'Could not upload image')
  return result.url
}
</script>

<template>
  <BaseModal
    variant="sheet"
    size="2xl"
    @close="emit('close')"
  >
    <div class="flex flex-col flex-1 min-h-0 p-4 sm:p-5 gap-3">
      <div class="flex items-center justify-between gap-3 shrink-0">
        <h2 class="font-display text-lg font-bold">
          Story page
        </h2>
        <button
          class="text-sm text-action hover:underline"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
      <input
        :value="storyPage.title ?? ''"
        placeholder="Heading (optional, shows in the table of contents)"
        class="shrink-0 text-base font-display font-semibold bg-transparent focus:outline-none border-b border-line focus:border-action pb-1"
        @change="saveTitle"
      >
      <PageDescriptionEditor
        tall
        :initial-html="storyPage.bodyHtml"
        :save="saveBody"
        :upload-image="uploadImage"
      />
      <p class="shrink-0 text-xs text-faint">
        Saves as you write. Shown between puzzles on the collection page.
      </p>
    </div>
  </BaseModal>
</template>
