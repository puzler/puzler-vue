<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js'
import RowMeta from './RowMeta.vue'
import FolderSelect from './FolderSelect.vue'
import { VISIBILITY_LABEL } from '@/constants/visibility'
import { PuzzleStatusEnum } from '@/graphql/generated/types'
import type { MyPuzzlesQuery, MyFoldersQuery } from '@/graphql/generated/types'

type MyPuzzle = MyPuzzlesQuery['myPuzzles']['nodes'][number]

const props = defineProps<{
  puzzle: MyPuzzle
  folders: MyFoldersQuery['myFolders']
  visibilityOptions: ReadonlyArray<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'change-visibility': [value: string]
  'move-to-folder': [folderId: string | null]
  delete: []
}>()

const subtext = computed(() => {
  const p = props.puzzle
  if (p.status !== PuzzleStatusEnum.Published) return 'Draft'
  const bits = [ VISIBILITY_LABEL[p.visibility] ]
  if (p.avgRating) bits.push(`★ ${p.avgRating.toFixed(1)}`)
  if (p.solveCount) bits.push(`${p.solveCount} solve${p.solveCount === 1 ? '' : 's'}`)
  return bits.join(' · ')
})
</script>

<template>
  <li class="flex items-center gap-3 p-3 rounded-xl border border-line">
    <div class="flex flex-col min-w-0 flex-1">
      <span class="font-medium text-ink-text truncate">{{ puzzle.title }}</span>
      <span class="text-xs text-faint">{{ subtext }}</span>
    </div>
    <RowMeta
      kind="puzzle"
      :entity-id="puzzle.id"
      :visibility="puzzle.visibility"
      :share-token="puzzle.shareToken"
      :visibility-options="visibilityOptions"
      @update-visibility="emit('change-visibility', $event)"
    />
    <FolderSelect
      :folders="folders"
      :value="puzzle.folder?.id"
      @change="emit('move-to-folder', $event)"
    />
    <RouterLink
      :to="{ name: 'editor-edit', params: { id: puzzle.id } }"
      class="p-1.5 rounded-lg text-soft hover:text-action hover:bg-paper shrink-0"
      title="Edit"
    >
      <MdiIcon
        :path="mdiPencilOutline"
        :size="16"
      />
    </RouterLink>
    <button
      class="p-1.5 rounded-lg text-soft hover:text-red-600 hover:bg-paper shrink-0"
      title="Delete"
      @click="emit('delete')"
    >
      <MdiIcon
        :path="mdiTrashCanOutline"
        :size="16"
      />
    </button>
  </li>
</template>
