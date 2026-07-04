<script setup lang="ts">
import { ref } from 'vue'
import { mdiContentCopy, mdiTrashCanOutline } from '@mdi/js'

// One row in a cosmetic preset list (shapes, lines, text, cages, cell colors).
// The active row expands: its label becomes editable in place and an action
// strip (duplicate / delete) appears underneath, inside the highlight box.
const props = defineProps<{
  label: string
  active: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  select: []
  duplicate: []
  remove: []
  rename: [label: string]
}>()

const labelInput = ref<HTMLInputElement | null>(null)

function commitRename() {
  if (!labelInput.value) return
  const value = labelInput.value.value.trim()
  if (value && value !== props.label) emit('rename', value)
  else labelInput.value.value = props.label
}

function cancelRename() {
  if (!labelInput.value) return
  labelInput.value.value = props.label
  labelInput.value.blur()
}
</script>

<template>
  <div
    class="rounded-md transition-colors"
    :class="active
      ? 'bg-action-tint text-action ring-1 ring-inset ring-action/30'
      : 'text-ink-text hover:bg-line/60'"
  >
    <div
      class="flex items-center gap-2 w-full px-2 py-1.5 cursor-pointer text-left"
      role="button"
      @click="emit('select')"
    >
      <slot />
      <input
        v-if="active"
        ref="labelInput"
        :value="label"
        class="flex-1 min-w-0 text-sm bg-transparent border-b border-transparent focus:outline-none focus:border-action"
        aria-label="Preset name"
        @blur="commitRename"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
        @keydown.escape="cancelRename"
      >
      <span
        v-else
        class="text-sm truncate"
      >{{ label }}</span>
    </div>
    <div
      v-if="active"
      class="flex items-center gap-1 px-2 pb-1.5"
    >
      <button
        class="p-1 rounded text-soft hover:text-action hover:bg-line/40 transition-colors"
        title="Duplicate preset"
        @click="emit('duplicate')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
        >
          <path
            :d="mdiContentCopy"
            fill="currentColor"
          />
        </svg>
      </button>
      <button
        class="p-1 rounded text-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :class="canDelete ? 'hover:text-red-600 hover:bg-line/40' : ''"
        :disabled="!canDelete"
        :title="canDelete ? 'Delete preset' : 'The last preset can\'t be deleted'"
        @click="emit('remove')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
        >
          <path
            :d="mdiTrashCanOutline"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
