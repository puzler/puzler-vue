<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiArrowUp, mdiArrowDown, mdiClose, mdiBookOpenPageVariantOutline, mdiPencilOutline } from '@mdi/js'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// The author's ordered entry list: puzzles and story pages in one sequence.
// Puzzles keep their own running numbers; story rows show a book marker.
const props = defineProps<{ entries: Entry[] }>()
const emit = defineEmits<{
  move: [index: number, delta: number]
  remove: [entry: Entry]
  add: []
  addStory: []
  editStory: [entry: Entry]
}>()

const ICON = 'p-1 text-soft hover:text-action disabled:opacity-30 disabled:hover:text-soft'

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
      <li
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="flex items-center gap-2 p-3 rounded-xl border border-line"
        :class="entry.entryType === 'StoryPage' ? 'bg-action-tint/40 border-dashed' : ''"
      >
        <span
          v-if="entry.entryType === 'Puzzle'"
          class="text-xs text-faint w-5 text-right"
        >{{ puzzleNumber(index) }}</span>
        <MdiIcon
          v-else
          :path="mdiBookOpenPageVariantOutline"
          :size="16"
          class="w-5 text-action shrink-0"
        />
        <span class="flex-1 truncate text-sm text-ink-text">
          {{ entry.entryType === 'Puzzle' ? entry.puzzle?.title : (entry.storyPage?.title || 'Untitled story page') }}
        </span>
        <button
          v-if="entry.entryType === 'StoryPage'"
          :class="ICON"
          title="Edit story page"
          @click="emit('editStory', entry)"
        >
          <MdiIcon
            :path="mdiPencilOutline"
            :size="16"
          />
        </button>
        <button
          :class="ICON"
          :disabled="index === 0"
          title="Move up"
          @click="emit('move', index, -1)"
        >
          <MdiIcon
            :path="mdiArrowUp"
            :size="16"
          />
        </button>
        <button
          :class="ICON"
          :disabled="index === entries.length - 1"
          title="Move down"
          @click="emit('move', index, 1)"
        >
          <MdiIcon
            :path="mdiArrowDown"
            :size="16"
          />
        </button>
        <button
          class="p-1 text-soft hover:text-red-600"
          :title="entry.entryType === 'StoryPage' ? 'Delete story page' : 'Remove from collection'"
          @click="emit('remove', entry)"
        >
          <MdiIcon
            :path="mdiClose"
            :size="16"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
