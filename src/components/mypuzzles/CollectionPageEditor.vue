<script setup lang="ts">
import { ref, computed } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { mdiImagePlusOutline, mdiTrashCanOutline } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import PageDescriptionEditor from '@/components/editor/PageDescriptionEditor.vue'
import UpdateCollectionPageDescriptionDocument from '@/graphql/gql/collections/mutations/UpdateCollectionPageDescription.graphql'
import UploadCollectionDescriptionImageDocument from '@/graphql/gql/collections/mutations/UploadCollectionDescriptionImage.graphql'
import UploadCollectionCoverImageDocument from '@/graphql/gql/collections/mutations/UploadCollectionCoverImage.graphql'
import RemoveCollectionCoverImageDocument from '@/graphql/gql/collections/mutations/RemoveCollectionCoverImage.graphql'
import type {
  UpdateCollectionPageDescriptionMutation, UpdateCollectionPageDescriptionMutationVariables,
  UploadCollectionDescriptionImageMutation, UploadCollectionDescriptionImageMutationVariables,
  UploadCollectionCoverImageMutation, UploadCollectionCoverImageMutationVariables,
  RemoveCollectionCoverImageMutation, RemoveCollectionCoverImageMutationVariables,
  CollectionAccentColorEnum, CollectionBgTreatmentEnum, CollectionTitleFontEnum,
} from '@/graphql/generated/types'
import CollectionAccentPickers from '@/components/mypuzzles/CollectionAccentPickers.vue'
import { collectionThemeClasses } from '@/utils/collectionTheme'

// Author-side editor for a collection's public page: cover art, rich body,
// and the curated accents. Cover + body save themselves here; accent picks go
// through the parent's updateCollection save path like every other setting.
const props = defineProps<{
  collectionId: string
  coverImageUrl: string | null
  pageDescriptionHtml: string | null
  accentColor: CollectionAccentColorEnum
  bgTreatment: CollectionBgTreatmentEnum
  titleFont: CollectionTitleFontEnum
}>()
const emit = defineEmits<{
  save: [attrs: {
    accentColor?: CollectionAccentColorEnum
    bgTreatment?: CollectionBgTreatmentEnum
    titleFont?: CollectionTitleFontEnum
  }]
}>()

const coverInput = ref<HTMLInputElement | null>(null)
const coverUrl = ref(props.coverImageUrl)
const coverBusy = ref(false)
const coverError = ref<string | null>(null)

// Live preview of the picked accents on the editor's own panel.
const themeClasses = computed(() => collectionThemeClasses(props))

async function onPickCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  coverBusy.value = true
  coverError.value = null
  try {
    const { data } = await apolloClient.mutate<UploadCollectionCoverImageMutation, UploadCollectionCoverImageMutationVariables>({
      mutation: UploadCollectionCoverImageDocument,
      variables: { collectionId: props.collectionId, file },
    })
    const result = data?.uploadCollectionCoverImage
    if (!result?.collection) throw new Error(result?.errors?.[0] ?? 'Could not upload cover')
    coverUrl.value = result.collection.coverImageUrl ?? null
  } catch (e) {
    coverError.value = e instanceof Error ? e.message : 'Could not upload cover'
  } finally {
    coverBusy.value = false
  }
}

async function removeCover() {
  coverBusy.value = true
  coverError.value = null
  try {
    await apolloClient.mutate<RemoveCollectionCoverImageMutation, RemoveCollectionCoverImageMutationVariables>({
      mutation: RemoveCollectionCoverImageDocument,
      variables: { collectionId: props.collectionId },
    })
    coverUrl.value = null
  } finally {
    coverBusy.value = false
  }
}

async function saveDescription(html: string) {
  const { data } = await apolloClient.mutate<UpdateCollectionPageDescriptionMutation, UpdateCollectionPageDescriptionMutationVariables>({
    mutation: UpdateCollectionPageDescriptionDocument,
    variables: { collectionId: props.collectionId, html },
  })
  const result = data?.updateCollectionPageDescription
  if (!result?.collection) throw new Error(result?.errors?.[0] ?? 'Could not save description')
}

async function uploadDescriptionImage(file: File): Promise<string> {
  const { data } = await apolloClient.mutate<UploadCollectionDescriptionImageMutation, UploadCollectionDescriptionImageMutationVariables>({
    mutation: UploadCollectionDescriptionImageDocument,
    variables: { collectionId: props.collectionId, file },
  })
  const result = data?.uploadCollectionDescriptionImage
  if (!result?.url) throw new Error(result?.errors?.[0] ?? 'Could not upload image')
  return result.url
}
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-xl p-4 -mx-4 sm:mx-0 bg-paper"
    :class="themeClasses"
  >
    <h2 class="font-display text-lg font-bold">
      Page appearance
    </h2>

    <div class="flex flex-col gap-2">
      <span class="text-sm text-soft">Cover image</span>
      <div
        v-if="coverUrl"
        class="relative rounded-xl overflow-hidden border border-line"
      >
        <img
          :src="coverUrl"
          alt="Collection cover"
          class="w-full aspect-video object-cover"
        >
        <button
          type="button"
          class="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-surface/90 border border-line text-xs text-soft hover:text-red-600 disabled:opacity-50"
          :disabled="coverBusy"
          @click="removeCover"
        >
          <MdiIcon
            :path="mdiTrashCanOutline"
            :size="14"
          />
          Remove
        </button>
      </div>
      <button
        v-else
        type="button"
        class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-6 text-sm text-soft hover:text-action hover:border-action disabled:opacity-50"
        :disabled="coverBusy"
        @click="coverInput?.click()"
      >
        <MdiIcon
          :path="mdiImagePlusOutline"
          :size="18"
        />
        {{ coverBusy ? 'Uploading…' : 'Add a cover image' }}
      </button>
      <p
        v-if="coverError"
        class="text-xs text-red-600"
      >
        {{ coverError }}
      </p>
      <input
        ref="coverInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        @change="onPickCover"
      >
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-sm text-soft">Page body</span>
      <PageDescriptionEditor
        :initial-html="pageDescriptionHtml"
        :save="saveDescription"
        :upload-image="uploadDescriptionImage"
      />
      <p class="text-xs text-faint">
        Shown on the collection's public page, above the puzzle list. Supports headings, styles, links, and images.
      </p>
    </div>

    <CollectionAccentPickers
      :accent-color="accentColor"
      :bg-treatment="bgTreatment"
      :title-font="titleFont"
      @save="emit('save', $event)"
    />
  </section>
</template>
