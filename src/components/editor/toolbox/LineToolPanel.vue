<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const LINE_TOOL_DESCRIPTIONS: Record<string, string> = {
  renban:          'Click and drag to draw. The cells must contain a set of consecutive digits in any order. Click to delete.',
  german_whispers: 'Click and drag to draw. Adjacent digits on the line must differ by at least 5. Click to delete.',
  dutch_whispers:  'Click and drag to draw. Adjacent digits on the line must differ by at least 4. Click to delete.',
  palindrome:      'Click and drag to draw. Digits read the same from both ends of the line. Click to delete.',
  region_sum:      'Click and drag to draw. The line sums to the same total in each box it passes through. Click to delete.',
  between_lines:   'Click and drag to draw. Digits on the line fall strictly between the digits in the two end circles. Click to delete.',
}

const label = computed(() =>
  editor.activeConstraints.find(c => c.type === editor.activeTool)?.label ?? '',
)

const description = computed(() => LINE_TOOL_DESCRIPTIONS[editor.activeTool] ?? '')
</script>

<template>
  <div class="flex flex-col p-3 gap-3">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      {{ label }}
    </p>
    <p class="text-[11px] text-faint leading-snug">
      {{ description }}
    </p>
  </div>
</template>
