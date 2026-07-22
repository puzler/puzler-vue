<script setup lang="ts">
// Standalone sum combination lookup (after theasylm's unique-sum-helpers):
// size/total plus optional windows and digit chips, listing every distinct-
// digit combination. All state is ephemeral scratch; strikes are local.
import { computed, reactive, ref } from 'vue'
import { useGridStore } from '@/stores/grid'
import { enumerateCombos, comboStats, type ComboFilter } from '@/utils/sumCombinations'
import ComboList from './ComboList.vue'
import ComboStats from './ComboStats.vue'
import DigitChipRow from './DigitChipRow.vue'
import HelperNumberField from './HelperNumberField.vue'

const grid = useGridStore()

// Number inputs bind '' when empty; normalize to null for the filter.
type Field = number | '' | null
const fields = reactive<{ size: Field; total: Field; minSize: Field; maxSize: Field; minTotal: Field; maxTotal: Field }>({
  size: null, total: null, minSize: null, maxSize: null, minTotal: null, maxTotal: null,
})
const include = ref<Set<number>>(new Set())
const exclude = ref<Set<number>>(new Set())
const struck = ref<Set<string>>(new Set())

const digits = computed(() => Array.from({ length: grid.effectiveDigitRange }, (_, i) => i + 1))

function num(v: Field): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
}

const sizeFixed = computed(() => num(fields.size) !== null)
const totalFixed = computed(() => num(fields.total) !== null)

const filter = computed<ComboFilter>(() => ({
  size: num(fields.size),
  total: num(fields.total),
  minSize: num(fields.minSize),
  maxSize: num(fields.maxSize),
  minTotal: num(fields.minTotal),
  maxTotal: num(fields.maxTotal),
  include: [...include.value],
  exclude: [...exclude.value],
}))

// An unconstrained lookup would dump every subset of the digit range; wait for
// at least one size/total bound before enumerating.
const constrained = computed(() =>
  [filter.value.size, filter.value.total, filter.value.minSize, filter.value.maxSize, filter.value.minTotal, filter.value.maxTotal]
    .some((v) => v != null),
)

const result = computed(() =>
  constrained.value ? enumerateCombos(grid.effectiveDigitRange, filter.value) : { combos: [], truncated: false },
)
const stats = computed(() => comboStats(result.value.combos, struck.value, grid.effectiveDigitRange))
const contextKey = computed(() => JSON.stringify(filter.value))

function toggleStrike(key: string) {
  const next = new Set(struck.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  struck.value = next
}

// A digit is included, excluded, or neither; never both.
function toggleDigit(set: 'include' | 'exclude', d: number) {
  const target = set === 'include' ? include : exclude
  const other = set === 'include' ? exclude : include
  const nextTarget = new Set(target.value)
  if (nextTarget.has(d)) {
    nextTarget.delete(d)
  } else {
    nextTarget.add(d)
    const nextOther = new Set(other.value)
    nextOther.delete(d)
    other.value = nextOther
  }
  target.value = nextTarget
}

function resetAll() {
  fields.size = null
  fields.total = null
  fields.minSize = null
  fields.maxSize = null
  fields.minTotal = null
  fields.maxTotal = null
  include.value = new Set()
  exclude.value = new Set()
  struck.value = new Set()
}
</script>

<template>
  <section class="px-2">
    <div class="flex items-center mb-1">
      <h3 class="text-[11px] uppercase tracking-wide text-soft font-semibold">
        Sum combinations
      </h3>
      <button
        type="button"
        class="ml-auto text-xs text-action hover:underline"
        @click="resetAll"
      >
        Reset
      </button>
    </div>

    <div class="grid grid-cols-2 gap-1.5 mb-2">
      <HelperNumberField
        v-model="fields.size"
        label="Size"
        input-label="Cage size"
        :max="digits.length"
      />
      <HelperNumberField
        v-model="fields.total"
        label="Total"
        input-label="Cage total"
      />
      <HelperNumberField
        v-model="fields.minSize"
        label="Size ≥"
        input-label="Minimum size"
        :max="digits.length"
        :disabled="sizeFixed"
      />
      <HelperNumberField
        v-model="fields.maxSize"
        label="Size ≤"
        input-label="Maximum size"
        :max="digits.length"
        :disabled="sizeFixed"
      />
      <HelperNumberField
        v-model="fields.minTotal"
        label="Sum ≥"
        input-label="Minimum total"
        :disabled="totalFixed"
      />
      <HelperNumberField
        v-model="fields.maxTotal"
        label="Sum ≤"
        input-label="Maximum total"
        :disabled="totalFixed"
      />
    </div>

    <div class="flex flex-col gap-1 mb-2">
      <DigitChipRow
        label="Include"
        tone="include"
        :digits="digits"
        :selected="include"
        @toggle="(d) => toggleDigit('include', d)"
      />
      <DigitChipRow
        label="Exclude"
        tone="exclude"
        :digits="digits"
        :selected="exclude"
        @toggle="(d) => toggleDigit('exclude', d)"
      />
    </div>

    <p
      v-if="!constrained || result.combos.length === 0"
      class="text-xs text-soft"
    >
      {{ !constrained ? 'Set a size or total to list combinations.' : 'No combination matches.' }}
    </p>
    <template v-else>
      <ComboList
        class="-mx-2 max-h-56 overflow-y-auto"
        :combos="result.combos"
        :struck="struck"
        :show-totals="!totalFixed"
        :truncated="result.truncated"
        @toggle="toggleStrike"
      />
      <ComboStats
        class="-mx-2 mt-1"
        :stats="stats"
        :context-key="contextKey"
      />
    </template>
  </section>
</template>
