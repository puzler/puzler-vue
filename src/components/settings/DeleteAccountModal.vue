<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      @click.self="emit('cancel')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 class="font-display text-lg font-semibold mb-2">
          Delete your account?
        </h3>
        <p class="text-sm text-soft mb-4">
          This permanently deletes your account, puzzles, comments, ratings, and play history.
          This cannot be undone.
        </p>

        <label
          v-if="passwordSet"
          class="text-sm text-soft block mb-4"
        >
          Enter your password to confirm
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
          >
        </label>
        <label
          v-else
          class="text-sm text-soft block mb-4"
        >
          Type <strong>DELETE</strong> to confirm
          <input
            v-model="confirmation"
            type="text"
            class="mt-1 w-full px-4 py-2.5 bg-surface border border-line rounded-md text-ink-text focus:border-action focus:outline-none transition-colors"
          >
        </label>

        <ul
          v-if="errors.length"
          class="text-sm text-red-700 mb-3"
        >
          <li
            v-for="e in errors"
            :key="e"
          >
            {{ e }}
          </li>
        </ul>

        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="pending"
            class="px-4 py-1.5 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            @click="emit('confirm', passwordSet ? { currentPassword: password } : { confirmation })"
          >
            {{ pending ? 'Deleting…' : 'Delete forever' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ passwordSet: boolean; pending: boolean; errors: string[] }>()
const emit = defineEmits<{
  cancel: []
  confirm: [opts: { currentPassword?: string; confirmation?: string }]
}>()

const password = ref('')
const confirmation = ref('')
</script>
