<script setup lang="ts">
defineProps<{
  title: string
  solveMessage: string | null
  // Collection context for "next puzzle" / "back to collection" navigation.
  inCollection: boolean
  hasNext: boolean
  collectionTitle: string
}>()

defineEmits<{ close: []; next: []; back: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="$emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl p-8 flex flex-col items-center gap-3 w-80">
        <span class="text-2xl">🎉</span>
        <span class="text-lg font-semibold text-ink-text">Solved!</span>
        <span
          class="text-sm text-center whitespace-pre-line"
          :class="solveMessage ? 'text-ink-text' : 'text-faint'"
        >{{ solveMessage || `Nicely done! You completed “${title}”.` }}</span>
        <button
          v-if="inCollection && hasNext"
          class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
          @click="$emit('next')"
        >
          Next puzzle →
        </button>
        <button
          v-else-if="inCollection"
          class="mt-2 px-4 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep"
          @click="$emit('back')"
        >
          Back to {{ collectionTitle || 'collection' }}
        </button>
        <button
          class="text-sm text-soft hover:text-ink-text"
          @click="$emit('close')"
        >
          Keep looking
        </button>
      </div>
    </div>
  </Teleport>
</template>
