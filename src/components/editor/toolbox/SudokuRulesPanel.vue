<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

// Panel for the sudoku_rules global. A dedicated panel (not the shared
// GlobalConstraintPanel) because this is the one default-ON global: the shared
// panel's self-toggle checkbox reads activeGlobalVariants, where absence means
// off, while this rule's state lives in editor.sudokuRulesEnabled.
const editor = useEditorStore()
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Sudoku Rules
      </p>

      <p class="text-[11px] text-soft leading-snug text-center">
        Digits cannot repeat in a row, column, or region.
      </p>

      <label class="flex items-center gap-2.5 cursor-pointer justify-center">
        <input
          type="checkbox"
          class="accent-action w-3.5 h-3.5 cursor-pointer"
          :checked="editor.sudokuRulesEnabled"
          @change="editor.setSudokuRulesEnabled(!editor.sudokuRulesEnabled)"
        >
        <span class="text-sm text-ink-text">Enabled</span>
      </label>

      <label class="flex items-center gap-2.5 cursor-pointer justify-center">
        <input
          type="checkbox"
          class="accent-action w-3.5 h-3.5 cursor-pointer"
          :checked="editor.activeGlobalVariants.has('sudoku_custom_houses')"
          :disabled="!editor.sudokuRulesEnabled"
          @change="editor.toggleGlobalVariant('sudoku_custom_houses')"
        >
        <span class="text-sm text-ink-text">Custom houses</span>
      </label>

      <p
        v-if="!editor.sudokuRulesEnabled"
        class="text-[11px] text-soft leading-snug text-center"
      >
        Digits may repeat in rows, columns, and regions. All other constraints still apply.
      </p>
      <p
        v-else-if="editor.customHousesActive"
        class="text-[11px] text-soft leading-snug text-center"
      >
        Skips the automatic row and column houses. Painted regions and House constraints still apply.
      </p>
    </div>
  </div>
</template>
