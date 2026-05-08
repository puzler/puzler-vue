<script setup lang="ts">
defineProps<{
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('cancel')"
    >
      <div class="bg-white rounded-xl shadow-xl w-72 p-6">
        <p class="text-gray-800 text-sm mb-5">
          {{ message }}
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-1.5 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
            @click="emit('confirm')"
          >
            {{ confirmLabel ?? 'Remove' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
