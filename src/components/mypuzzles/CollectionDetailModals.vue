<script setup lang="ts">
import AddPuzzlesModal from '@/components/mypuzzles/AddPuzzlesModal.vue'
import StoryPageModal from '@/components/mypuzzles/StoryPageModal.vue'
import CollectionEntryGatesModal from '@/components/mypuzzles/CollectionEntryGatesModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// The collection detail page's modal cluster; at most one is open at a time
// (each is driven by its own piece of parent state).
defineProps<{
  collectionId: string
  showAdd: boolean
  excludeIds: string[]
  editingStory: Entry['storyPage'] | null
  editingGates: Entry | null
  gatesLabel: string
  removingEntry: Entry | null
  showDelete: boolean
}>()
const emit = defineEmits<{
  added: []
  closeAdd: []
  closeStory: []
  savedGates: []
  closeGates: []
  confirmRemove: []
  cancelRemove: []
  confirmDelete: []
  cancelDelete: []
}>()
</script>

<template>
  <AddPuzzlesModal
    v-if="showAdd"
    :collection-id="collectionId"
    :exclude-ids="excludeIds"
    @added="emit('added')"
    @close="emit('closeAdd')"
  />
  <StoryPageModal
    v-if="editingStory"
    :story-page="editingStory"
    @close="emit('closeStory')"
  />
  <CollectionEntryGatesModal
    v-if="editingGates"
    :collection-id="collectionId"
    :entry="editingGates"
    :entry-label="gatesLabel"
    @saved="emit('savedGates')"
    @close="emit('closeGates')"
  />
  <ConfirmModal
    v-if="removingEntry"
    message="Delete this story page? Its text and images are removed for good."
    confirm-label="Delete"
    @confirm="emit('confirmRemove')"
    @cancel="emit('cancelRemove')"
  />
  <ConfirmModal
    v-if="showDelete"
    message="Delete this collection? The puzzles themselves are kept."
    confirm-label="Delete"
    @confirm="emit('confirmDelete')"
    @cancel="emit('cancelDelete')"
  />
</template>
