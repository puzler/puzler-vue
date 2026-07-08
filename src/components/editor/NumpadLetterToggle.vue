<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

// The Letter tool's numbers/letters toggle, drawn as a percent sign on a
// square: 9 in the top-left corner, A in the bottom-right, the slash running
// corner to corner. The current side reads at full strength, the other
// recedes. Rendered as a grid item of the numpad's bottom row (col 2).

const editor = useEditorStore()
</script>

<template>
  <button
    title="Letters (/)"
    aria-label="Letter mode"
    :aria-pressed="editor.letterMode"
    class="col-start-2 row-start-4 h-full rounded-lg border shadow-sm flex items-center justify-center transition-colors"
    :class="editor.letterMode
      ? 'bg-action border-action text-on-action'
      : 'bg-surface border-line text-soft hover:border-action hover:text-action'"
    @click="editor.setLetterMode(!editor.letterMode)"
  >
    <svg
      viewBox="0 0 24 24"
      class="w-7 h-7"
      aria-hidden="true"
    >
      <line
        x1="4.5"
        y1="19.5"
        x2="19.5"
        y2="4.5"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
      <text
        x="6.5"
        y="6.5"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="12"
        font-weight="600"
        font-family="'Space Grotesk', sans-serif"
        fill="currentColor"
        class="transition-opacity"
        :class="editor.letterMode ? 'opacity-40' : ''"
      >9</text>
      <text
        x="17.5"
        y="17.5"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="12"
        font-weight="600"
        font-family="'Space Grotesk', sans-serif"
        fill="currentColor"
        class="transition-opacity"
        :class="editor.letterMode ? '' : 'opacity-40'"
      >A</text>
    </svg>
  </button>
</template>
