<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

defineProps<{
  // Hide the timer option when the timer isn't shown (hideTimer setting).
  showTimerOption: boolean
}>()

const emit = defineEmits<{
  confirm: [resetTimer: boolean]
  cancel: []
}>()

const resetTimer = ref(false)
</script>

<template>
  <BaseModal
    size="sm"
    card-class="p-6 gap-4"
    @close="emit('cancel')"
  >
    <div class="flex flex-col gap-1.5">
      <h3 class="font-display text-base font-semibold text-ink-text">
        Reset puzzle?
      </h3>
      <p class="text-sm text-soft leading-relaxed">
        This clears every digit, pencil mark and colour you've entered. The
        puzzle's given clues stay. You can undo it afterwards.
      </p>
    </div>

    <label
      v-if="showTimerOption"
      class="flex items-center gap-2.5 text-sm text-ink-text select-none cursor-pointer"
    >
      <input
        v-model="resetTimer"
        type="checkbox"
        class="accent-action"
      >
      Reset the timer as well
    </label>

    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
        @click="emit('confirm', showTimerOption && resetTimer)"
      >
        Reset
      </button>
    </div>
  </BaseModal>
</template>
