<script setup lang="ts">
// Shared combo list for the killer cage helper and the sum combination
// helper: one row per combo with a strike/restore toggle. Struck rows stay
// visible (dimmed + struck through) so the solver can restore them.
import { mdiMinusCircleOutline, mdiPlusCircleOutline } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import { useGridStore } from '@/stores/grid'
import type { Combo } from '@/utils/sumCombinations'

const props = defineProps<{
  combos: Combo[]
  struck: Set<string>
  showTotals: boolean
  truncated?: boolean
}>()

defineEmits<{ toggle: [key: string] }>()

const grid = useGridStore()

// Single-digit ranges read best packed ("129"); wider ranges need separators.
function comboLabel(combo: Combo): string {
  return grid.effectiveDigitRange > 9 ? combo.digits.join(',') : combo.digits.join('')
}
</script>

<template>
  <div>
    <ul class="flex flex-col">
      <li
        v-for="combo in props.combos"
        :key="combo.key"
      >
        <button
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm text-left hover:bg-line/40 transition-colors"
          :class="props.struck.has(combo.key) ? 'text-soft' : 'text-ink-text'"
          :aria-pressed="props.struck.has(combo.key)"
          :aria-label="`${props.struck.has(combo.key) ? 'Restore' : 'Rule out'} combination ${comboLabel(combo)}`"
          @click="$emit('toggle', combo.key)"
        >
          <span
            v-if="props.showTotals"
            class="w-7 shrink-0 text-xs font-semibold tabular-nums"
            :class="props.struck.has(combo.key) ? 'text-soft/70' : 'text-soft'"
          >{{ combo.total }}</span>
          <span
            class="flex-1 font-mono tracking-wider tabular-nums"
            :class="{ 'line-through opacity-60': props.struck.has(combo.key) }"
          >{{ comboLabel(combo) }}</span>
          <MdiIcon
            :path="props.struck.has(combo.key) ? mdiPlusCircleOutline : mdiMinusCircleOutline"
            :size="16"
            class="shrink-0 text-soft"
          />
        </button>
      </li>
    </ul>
    <p
      v-if="props.truncated"
      class="px-2 py-1 text-xs text-soft"
    >
      List capped, narrow the filters to see the rest.
    </p>
  </div>
</template>
