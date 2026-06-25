<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ label: string; value: string; mono?: boolean }>()
const copied = ref(false)

function copy() {
  navigator.clipboard?.writeText(props.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="text-xs text-soft">{{ label }}</span>
    <div class="flex items-center gap-2">
      <input
        :value="value"
        readonly
        class="flex-1 min-w-0 text-sm bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-ink-text"
        :class="mono ? 'font-mono' : ''"
      >
      <button
        class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-action text-white hover:bg-action-deep transition-colors"
        @click="copy"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
  </div>
</template>
