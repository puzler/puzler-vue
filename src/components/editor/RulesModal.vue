<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  close: []
}>()

// Edit a buffer so Cancel discards changes.
const draft = ref(props.modelValue)

function save() {
  emit('update:modelValue', draft.value.trim())
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-xl p-6 flex flex-col gap-4">
        <h2 class="font-display text-base font-semibold text-ink-text">
          Puzzle Rules
        </h2>
        <textarea
          v-model="draft"
          rows="14"
          placeholder="Describe how this puzzle is solved — normal sudoku rules plus any variant constraints…"
          class="w-full text-sm px-3 py-2 rounded-lg border border-line bg-surface text-ink-text leading-relaxed focus:outline-none focus:border-action resize-y"
          autofocus
        />
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-1.5 rounded-lg text-sm bg-action text-white hover:bg-action-deep transition-colors"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
