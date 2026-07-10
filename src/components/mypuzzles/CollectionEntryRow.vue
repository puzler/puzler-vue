<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import {
  mdiArrowUp, mdiArrowDown, mdiClose, mdiBookOpenPageVariantOutline, mdiPencilOutline,
  mdiKeyOutline, mdiEyeOffOutline, mdiTrophyOutline, mdiTuneVariant, mdiClockOutline,
} from '@mdi/js'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// One row in the author's entry list: number/book marker, title, gate badges,
// then the action cluster (edit story, gates, move, remove).
defineProps<{
  entry: Entry
  number: number
  first: boolean
  last: boolean
}>()
const emit = defineEmits<{
  move: [delta: number]
  remove: []
  editStory: []
  editGates: []
}>()

const ICON = 'p-1 text-soft hover:text-action disabled:opacity-30 disabled:hover:text-soft'
const GATE_BADGES = [
  { key: 'gated', icon: mdiKeyOutline, title: 'Codeword gate' },
  { key: 'hidden', icon: mdiEyeOffOutline, title: 'Hidden until codeword' },
  { key: 'finale', icon: mdiTrophyOutline, title: 'Finale' },
] as const

function scheduled(entry: Entry): boolean {
  return !!entry.releasedAt && new Date(entry.releasedAt) > new Date()
}
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
    <MdiIcon
      v-if="scheduled(entry)"
      :path="mdiClockOutline"
      :size="14"
      :title="`Releases ${new Date(entry.releasedAt!).toLocaleString()}`"
      class="text-action"
    />
    <span
      v-for="badge in GATE_BADGES"
      :key="badge.key"
    >
      <MdiIcon
        v-if="entry[badge.key]"
        :path="badge.icon"
        :size="14"
        :title="badge.title"
        class="text-action"
      />
    </span>
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
