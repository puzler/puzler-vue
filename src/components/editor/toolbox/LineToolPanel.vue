<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'draw', label: 'Draw' },
  { key: 'branch', label: 'Branch' },
]

// The constraint rule for each line type. Interaction is described by the
// Draw/Branch mode hints below.
const LINE_TOOL_DESCRIPTIONS: Record<string, string> = {
  renban:          'The cells must contain a set of consecutive digits in any order.',
  german_whispers: 'Adjacent digits on the line must differ by at least 5.',
  dutch_whispers:  'Adjacent digits on the line must differ by at least 4.',
  palindrome:      'Digits read the same from both ends of the line.',
  region_sum:      'The line sums to the same total in each box it passes through.',
  between_lines:   'Digits on the line fall strictly between the digits in the two end circles.',
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

    <ModeSwitcher
      :modes="MODES"
      :active="editor.effectiveLineDrawMode"
      @select="editor.setLineDrawMode($event as 'draw' | 'branch')"
    />

    <p class="text-[11px] text-faint leading-snug">
      {{ description }}
    </p>
    <p class="text-[11px] text-faint leading-snug">
      Draw: drag to add a line · tap one to delete it
    </p>
    <p class="text-[11px] text-faint leading-snug">
      Branch: drag from an existing line's cell to branch off it · holding Shift switches to Branch
    </p>
  </div>
</template>
