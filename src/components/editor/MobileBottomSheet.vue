<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-end z-50"
      @click.self="emit('close')"
    >
      <div
        class="w-full bg-surface rounded-t-2xl shadow-xl flex flex-col"
        style="max-height: 75dvh"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <span class="text-sm font-semibold text-ink-text">{{ title }}</span>
          <button
            class="p-1 rounded text-faint hover:text-soft transition-colors"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="overflow-y-auto flex-1">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
