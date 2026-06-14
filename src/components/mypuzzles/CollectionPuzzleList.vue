<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiArrowUp, mdiArrowDown, mdiClose } from '@mdi/js'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type CollectionPuzzle = NonNullable<CollectionDetailQuery['collection']>['puzzles'][number]

defineProps<{ puzzles: CollectionPuzzle[] }>()
const emit = defineEmits<{ move: [index: number, delta: number]; remove: [id: string]; add: [] }>()

const ICON = 'p-1 text-soft hover:text-action disabled:opacity-30 disabled:hover:text-soft'
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-sm font-semibold text-ink-text">
        Puzzles ({{ puzzles.length }})
      </h2>
      <button
        class="text-sm text-action hover:underline"
        @click="emit('add')"
      >
        Add puzzles
      </button>
    </div>

    <p
      v-if="!puzzles.length"
      class="text-sm text-soft"
    >
      No puzzles yet — add some to build the collection.
    </p>
    <ul
      v-else
      class="flex flex-col gap-2"
    >
      <li
        v-for="(puzzle, index) in puzzles"
        :key="puzzle.id"
        class="flex items-center gap-2 p-3 rounded-xl border border-line"
      >
        <span class="text-xs text-faint w-5 text-right">{{ index + 1 }}</span>
        <span class="flex-1 truncate text-sm text-ink-text">{{ puzzle.title }}</span>
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
          :disabled="index === puzzles.length - 1"
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
          title="Remove from collection"
          @click="emit('remove', puzzle.id)"
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
