<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'

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
  <BaseModal
    size="xs"
    card-class="p-6"
    @close="emit('cancel')"
  >
    <p class="text-ink-text text-sm mb-5">
      {{ message }}
    </p>
    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
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
  </BaseModal>
</template>
