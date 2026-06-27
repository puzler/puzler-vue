<script setup lang="ts">
import AuthorAttribution from '@/components/AuthorAttribution.vue'

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      data-modal-open
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div class="px-6 pt-6 pb-4 border-b border-line">
          <h2 class="font-display text-xl font-semibold text-ink-text leading-tight">
            {{ title || 'Puzzle' }}
          </h2>
          <p
            v-if="author"
            class="mt-1 text-sm text-faint"
          >
            by <AuthorAttribution
              :author="author"
              :author-name="authorName"
            />
          </p>
        </div>

        <div class="px-6 py-5 overflow-y-auto">
          <p
            v-if="rules"
            class="text-sm text-ink-text whitespace-pre-line leading-relaxed"
          >
            {{ rules }}
          </p>
          <p
            v-else
            class="text-sm italic text-faint"
          >
            Normal sudoku rules apply.
          </p>
        </div>

        <div class="px-6 py-4 border-t border-line flex justify-end">
          <button
            class="px-5 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
            @click="emit('close')"
          >
            Start solving
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
