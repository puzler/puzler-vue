<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import type { PuzzleIssue } from '@/utils/puzzleValidate'

// Warn-and-approve gate for the JSON apply: weird-but-valid setter choices
// (stacked duplicates, exclusion conflicts, keys that will be dropped) halt
// the apply until approved. Hard errors never reach this modal.
defineProps<{
  warnings: Array<PuzzleIssue & { line?: number | null }>
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <BaseModal
    size="sm"
    card-class="p-6"
    @close="emit('cancel')"
  >
    <p class="text-ink-text text-sm font-medium mb-2">
      This document does some unusual things:
    </p>
    <ul class="text-xs text-ink-text space-y-1.5 mb-5 max-h-64 overflow-y-auto">
      <li
        v-for="(warning, i) in warnings"
        :key="i"
        class="flex gap-2"
      >
        <span class="text-spark shrink-0">&#9888;</span>
        <span>
          <span class="font-mono text-soft">{{ warning.line != null ? `L${warning.line} ` : '' }}{{ warning.path }}</span>: {{ warning.message }}
        </span>
      </li>
    </ul>
    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors"
        @click="emit('confirm')"
      >
        Apply anyway
      </button>
    </div>
  </BaseModal>
</template>
