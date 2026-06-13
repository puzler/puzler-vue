<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiArrowUp, mdiArrowDown, mdiClose, mdiPuzzle, mdiFolderMultiple } from '@mdi/js'
import type { SeriesDetailQuery } from '@/graphql/generated/types'

type SeriesEntry = NonNullable<SeriesDetailQuery['series']>['entries'][number]

defineProps<{ entries: SeriesEntry[] }>()
const emit = defineEmits<{ move: [index: number, delta: number]; remove: [id: string]; add: [] }>()

const ICON = 'p-1 text-soft hover:text-action disabled:opacity-30 disabled:hover:text-soft'

function label(entry: SeriesEntry): string {
  return entry.entryType === 'Collection' ? (entry.collection?.title ?? 'Collection') : (entry.puzzle?.title ?? 'Puzzle')
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-sm font-semibold text-ink-text">
        Entries ({{ entries.length }})
      </h2>
      <button
        class="text-sm text-action hover:underline"
        @click="emit('add')"
      >
        Add entry
      </button>
    </div>

    <p
      v-if="!entries.length"
      class="text-sm text-soft"
    >
      No entries yet — add puzzles or collections to build the series.
    </p>
    <ul
      v-else
      class="flex flex-col gap-2"
    >
      <li
        v-for="(entry, index) in entries"
        :key="entry.id"
        class="flex items-center gap-2 p-3 rounded-xl border border-line"
      >
        <span class="text-xs text-faint w-5 text-right">{{ index + 1 }}</span>
        <MdiIcon
          :path="entry.entryType === 'Collection' ? mdiFolderMultiple : mdiPuzzle"
          :size="16"
          class="text-faint shrink-0"
        />
        <span class="flex-1 truncate text-sm text-ink-text">{{ label(entry) }}</span>
        <span class="text-xs text-faint shrink-0">{{ entry.entryType }}</span>
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
          title="Remove from series"
          @click="emit('remove', entry.id)"
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
