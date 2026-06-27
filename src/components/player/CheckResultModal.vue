<script setup lang="ts">
import { computed } from 'vue'
import type { CheckResultEnum } from '@/graphql/generated/types'

const props = defineProps<{
  // Only the non-solved results reach this modal (SOLVED routes to the win flow).
  result: CheckResultEnum
  // When off, partial progress is hidden — both states collapse to a neutral
  // "not solved yet" so the solver isn't told whether they're on track.
  revealPartial: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const display = computed(() => {
  if (!props.revealPartial) {
    return { icon: '⏳', title: 'Not solved yet', text: 'Keep going, you’ll get there.' }
  }
  if (props.result === 'CORRECT_SO_FAR') {
    return { icon: '👍', title: 'Looking good', text: 'Everything you’ve filled in so far is correct.' }
  }
  return { icon: '🤔', title: 'That doesn’t look right', text: 'There’s a mistake somewhere in the grid.' }
})
</script>

<template>
  <Teleport to="body">
    <div
      data-modal-open
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 w-80">
        <span class="text-4xl">{{ display.icon }}</span>
        <span class="text-lg font-display font-semibold text-ink-text">{{ display.title }}</span>
        <span class="text-sm text-center text-soft">{{ display.text }}</span>
        <button
          class="mt-2 px-5 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
          @click="emit('close')"
        >
          Keep solving
        </button>
      </div>
    </div>
  </Teleport>
</template>
