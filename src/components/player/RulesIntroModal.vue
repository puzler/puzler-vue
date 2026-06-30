<script setup lang="ts">
import AuthorAttribution from '@/components/AuthorAttribution.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

defineProps<{
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal
    variant="sheet"
    size="lg"
    @close="emit('close')"
  >
    <div class="px-6 pt-6 pb-4 border-b border-line shrink-0">
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

    <div class="px-6 py-5 overflow-y-auto flex-1 min-h-0">
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

    <div class="px-6 py-4 border-t border-line flex justify-end shrink-0">
      <button
        class="px-5 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep transition-colors"
        @click="emit('close')"
      >
        Start solving
      </button>
    </div>
  </BaseModal>
</template>
