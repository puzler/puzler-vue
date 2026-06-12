<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const DESCRIPTIONS: Record<string, { title: string; rule: string }> = {
  odd_cells:       { title: 'Odd Cells',          rule: 'Marked cells must contain an odd digit.' },
  even_cells:      { title: 'Even Cells',         rule: 'Marked cells must contain an even digit.' },
  minimums:        { title: 'Minimums',           rule: 'Marked cells must be smaller than every orthogonal neighbor.' },
  maximums:        { title: 'Maximums',           rule: 'Marked cells must be larger than every orthogonal neighbor.' },
  row_index_cells: { title: 'Row Index Cells',    rule: "A marked cell's digit gives the column where this row's index digit appears." },
  col_index_cells: { title: 'Column Index Cells', rule: "A marked cell's digit gives the row where this column's index digit appears." },
}

const info = computed(() => DESCRIPTIONS[editor.activeTool] ?? null)
</script>

<template>
  <div
    v-if="info"
    class="flex flex-col items-center justify-start flex-1 p-4"
  >
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ info.title }}
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        {{ info.rule }}
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Click a cell to mark it · click again to unmark
      </p>
    </div>
  </div>
</template>
