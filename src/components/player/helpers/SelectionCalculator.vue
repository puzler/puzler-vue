<script setup lang="ts">
// Live sum readout for the current selection. Purely derived; renders a hint
// until two or more cells are selected. "No valid sum" = contradiction (or a
// letter in the selection); "~" marks approximate bounds (search budget hit).
import { computed } from 'vue'
import { useSelectionCalculator } from '@/composables/useMathHelpers'

const calc = useSelectionCalculator()

const label = computed<string | null>(() => {
  const c = calc.value
  if (!c) return null
  if (!c.bounds) return 'No valid sum'
  const { min, max, exact, approx } = c.bounds
  const prefix = approx ? '~' : ''
  return exact ? `${min}` : `${prefix}${min}-${max}`
})
</script>

<template>
  <section class="px-2">
    <h3 class="text-[11px] uppercase tracking-wide text-soft font-semibold mb-1">
      Selection
    </h3>
    <p
      v-if="calc === null"
      class="text-xs text-soft"
    >
      Select two or more cells to see their possible sum.
    </p>
    <div
      v-else
      class="flex items-baseline gap-2"
    >
      <span class="text-sm text-soft">Sum:</span>
      <span class="text-lg font-semibold text-ink-text tabular-nums">{{ label }}</span>
      <span class="ml-auto text-xs text-soft tabular-nums">{{ calc.count }} cells</span>
    </div>
  </section>
</template>
