<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'

// Last-chance check before a competition submission when the board still has
// empty cells: pencil-marked cells are easy to mistake for finished ones, and
// a wrong final submission can cost points.
defineProps<{ emptyCellCount: number }>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <BaseModal
    size="sm"
    card-class="p-6 gap-4"
    @close="emit('cancel')"
  >
    <div class="flex flex-col gap-1.5">
      <h3 class="font-display text-base font-semibold text-ink-text">
        Submit with empty cells?
      </h3>
      <p class="text-sm text-soft leading-relaxed">
        This board still has {{ emptyCellCount }} empty {{ emptyCellCount === 1 ? 'cell' : 'cells' }}.
        Pencil marks don't count as answers, so an unfinished board will be graded as is.
      </p>
    </div>

    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
        @click="emit('cancel')"
      >
        Keep solving
      </button>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors"
        @click="emit('confirm')"
      >
        Submit anyway
      </button>
    </div>
  </BaseModal>
</template>
