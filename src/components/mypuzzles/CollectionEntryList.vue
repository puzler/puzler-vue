<script setup lang="ts">
import CollectionEntryRow from '@/components/mypuzzles/CollectionEntryRow.vue'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// The author's ordered entry list: puzzles and story pages in one sequence.
// Puzzles keep their own running numbers; story rows show a book marker; gate
// badges mark codeworded, hidden, and finale entries.
const props = defineProps<{ entries: Entry[] }>()
const emit = defineEmits<{
  move: [index: number, delta: number]
  remove: [entry: Entry]
  add: []
  addStory: []
  editStory: [entry: Entry]
  editGates: [entry: Entry]
}>()

function puzzleNumber(index: number): number {
  return props.entries.slice(0, index + 1).filter((e) => e.entryType === 'Puzzle').length
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <h2 class="text-sm font-semibold text-ink-text">
        Entries ({{ entries.length }})
      </h2>
      <div class="flex items-center gap-4">
        <button
          class="text-sm text-action hover:underline"
          @click="emit('addStory')"
        >
          Add story page
        </button>
        <button
          class="text-sm text-action hover:underline"
          @click="emit('add')"
        >
          Add puzzles
        </button>
      </div>
    </div>

    <p
      v-if="!entries.length"
      class="text-sm text-soft"
    >
      Nothing here yet. Add puzzles, and story pages to tell a tale between them.
    </p>
    <ul
      v-else
      class="flex flex-col gap-2"
    >
      <CollectionEntryRow
        v-for="(entry, index) in entries"
        :key="entry.id"
        :entry="entry"
        :number="puzzleNumber(index)"
        :first="index === 0"
        :last="index === entries.length - 1"
        @move="emit('move', index, $event)"
        @remove="emit('remove', entry)"
        @edit-story="emit('editStory', entry)"
        @edit-gates="emit('editGates', entry)"
      />
    </ul>
  </div>
</template>
