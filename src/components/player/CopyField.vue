<script setup lang="ts">
import { ref } from 'vue'

// `hideValue` keeps the value off-screen (for screen-sharing): instead of a
// readable field, it renders a single copy-only button.
const props = defineProps<{ label: string; value: string; mono?: boolean; hideValue?: boolean }>()
const copied = ref(false)

function copy() {
  navigator.clipboard?.writeText(props.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <!-- Hidden mode: copy-only button, nothing revealed on screen. -->
  <button
    v-if="hideValue"
    type="button"
    class="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-line text-ink-text hover:bg-action-tint hover:text-action transition-colors"
    @click="copy"
  >
    {{ copied ? 'Copied' : `Copy ${label.toLowerCase()}` }}
  </button>

  <!-- Default: labelled value + copy button. -->
  <div
    v-else
    class="flex flex-col gap-1"
  >
    <span class="text-xs text-soft">{{ label }}</span>
    <div class="flex items-center gap-2">
      <input
        :value="value"
        readonly
        class="flex-1 min-w-0 text-sm bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-ink-text"
        :class="mono ? 'font-mono' : ''"
      >
      <button
        class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-action text-on-action hover:bg-action-deep transition-colors"
        @click="copy"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
  </div>
</template>
