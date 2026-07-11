<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import EntryGateBadges from '@/components/mypuzzles/EntryGateBadges.vue'
import {
  mdiArrowUp, mdiArrowDown, mdiClose, mdiBookOpenPageVariantOutline, mdiPencilOutline,
  mdiTuneVariant,
} from '@mdi/js'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// One row in the author's entry list: number/book marker, title, gate badges,
// then the action cluster (edit story, gates, move, remove). Hunt gates only
// exist for hunt collections; the points input only for competitions.
defineProps<{
  entry: Entry
  number: number
  first: boolean
  last: boolean
  showGates: boolean
  showPoints: boolean
}>()
const emit = defineEmits<{
  move: [delta: number]
  remove: []
  editStory: []
  editGates: []
  setPoints: [points: number]
}>()

function onPointsChange(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isInteger(value) && value >= 0) emit('setPoints', value)
}

const ICON = 'p-1 text-soft hover:text-action disabled:opacity-30 disabled:hover:text-soft'
</script>

<template>
  <li
    class="flex items-center gap-2 p-3 rounded-xl border border-line"
    :class="entry.entryType === 'StoryPage' ? 'bg-action-tint/40 border-dashed' : ''"
  >
    <span
      v-if="entry.entryType === 'Puzzle'"
      class="text-xs text-faint w-5 text-right"
    >{{ number }}</span>
    <MdiIcon
      v-else
      :path="mdiBookOpenPageVariantOutline"
      :size="16"
      class="w-5 text-action shrink-0"
    />
    <span class="flex-1 truncate text-sm text-ink-text">
      {{ entry.entryType === 'Puzzle' ? entry.puzzle?.title : (entry.storyPage?.title || 'Untitled story page') }}
    </span>
    <label
      v-if="showPoints && entry.entryType === 'Puzzle'"
      class="flex items-center gap-1 text-xs text-soft shrink-0"
      title="Points for this puzzle"
    >
      <input
        type="number"
        min="0"
        :value="entry.points"
        class="w-14 text-xs px-1.5 py-1 rounded border border-line bg-surface text-ink-text"
        @change="onPointsChange"
      >
      pts
    </label>
    <EntryGateBadges :entry="entry" />
    <button
      v-if="entry.entryType === 'StoryPage'"
      :class="ICON"
      title="Edit story page"
      @click="emit('editStory')"
    >
      <MdiIcon
        :path="mdiPencilOutline"
        :size="16"
      />
    </button>
    <button
      v-if="showGates"
      :class="ICON"
      title="Hunt gates"
      @click="emit('editGates')"
    >
      <MdiIcon
        :path="mdiTuneVariant"
        :size="16"
      />
    </button>
    <button
      :class="ICON"
      :disabled="first"
      title="Move up"
      @click="emit('move', -1)"
    >
      <MdiIcon
        :path="mdiArrowUp"
        :size="16"
      />
    </button>
    <button
      :class="ICON"
      :disabled="last"
      title="Move down"
      @click="emit('move', 1)"
    >
      <MdiIcon
        :path="mdiArrowDown"
        :size="16"
      />
    </button>
    <button
      class="p-1 text-soft hover:text-red-600"
      :title="entry.entryType === 'StoryPage' ? 'Delete story page' : 'Remove from collection'"
      @click="emit('remove')"
    >
      <MdiIcon
        :path="mdiClose"
        :size="16"
      />
    </button>
  </li>
</template>
