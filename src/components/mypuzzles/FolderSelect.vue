<script setup lang="ts">
import { computed } from 'vue'
import ListMenu from './ListMenu.vue'
import { mdiFolderOutline, mdiFolder } from '@mdi/js'

// Inline "move to folder" control shared by the puzzle and collection rows.
// Renders as a folder icon (filled when filed) opening a folder picker.
const props = defineProps<{
  folders: ReadonlyArray<{ id: string; name: string }>
  value: string | null | undefined
}>()
const emit = defineEmits<{ change: [folderId: string | null] }>()

const options = computed(() => [
  { value: '', label: 'Unfiled' },
  ...props.folders.map((f) => ({ value: f.id, label: f.name })),
])
const currentName = computed(() => props.folders.find((f) => f.id === props.value)?.name ?? 'Unfiled')
</script>

<template>
  <ListMenu
    :options="options"
    :selected="props.value ?? ''"
    :trigger-icon="props.value ? mdiFolder : mdiFolderOutline"
    :active="!!props.value"
    :title="`Folder: ${currentName}`"
    @select="emit('change', $event || null)"
  />
</template>
