<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { GLOBAL_VARIANTS } from '@/types/constraints'
import CustomConstraintList from './CustomConstraintList.vue'

const editor = useEditorStore()

const GLOBAL_CONSTRAINT_DESCRIPTIONS: Record<string, string> = {
  diagonals:     'Select which diagonals must contain each digit exactly once, or which disallow repeats.',
  chess:         'Identical digits may not be placed the selected chess move apart.',
  anti_kropki:   'Restrict digit relationships between orthogonally adjacent cells.',
  anti_xv:       'Restrict sums between orthogonally adjacent cells.',
  disjoint_sets: 'Digits in the same position within different boxes must all be different.',
}

const activeConstraint = computed(() =>
  editor.activeConstraints.find(c => c.type === editor.activeTool) ?? null,
)

const activeVariants = computed(() => GLOBAL_VARIANTS[editor.activeTool] ?? [])

const customDiffInput = ref(2)
const customRatioInput = ref(3)
const customSumInput = ref(7)

const customDiffs = computed(() =>
  editor.customGlobalConstraints.filter(c => c.type === 'anti_diff')
    .sort((a, b) => a.value - b.value)
    .map(c => ({ id: c.id, label: `Difference ≠ ${c.value}` })),
)
const customRatios = computed(() =>
  editor.customGlobalConstraints.filter(c => c.type === 'anti_ratio')
    .sort((a, b) => a.value - b.value)
    .map(c => ({ id: c.id, label: `Ratio ≠ 1:${c.value}` })),
)
const customSums = computed(() =>
  editor.customGlobalConstraints.filter(c => c.type === 'anti_sum')
    .sort((a, b) => a.value - b.value)
    .map(c => ({ id: c.id, label: `Sum ≠ ${c.value}` })),
)

function addCustomDiff() {
  const v = Math.round(customDiffInput.value)
  if (v >= 1) editor.addCustomGlobalConstraint('anti_diff', v)
}
function addCustomRatio() {
  const v = Math.round(customRatioInput.value)
  if (v >= 2) editor.addCustomGlobalConstraint('anti_ratio', v)
}
function addCustomSum() {
  const v = Math.round(customSumInput.value)
  if (v >= 1) editor.addCustomGlobalConstraint('anti_sum', v)
}
</script>

<template>
  <div
    v-if="activeConstraint"
    class="flex flex-col p-3 gap-3"
  >
    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      {{ activeConstraint.label }}
    </p>

    <p class="text-[11px] text-faint leading-snug">
      {{ GLOBAL_CONSTRAINT_DESCRIPTIONS[editor.activeTool] }}
    </p>

    <div
      v-if="activeVariants.length > 0"
      class="flex flex-col gap-2"
    >
      <label
        v-for="v in activeVariants"
        :key="v.type"
        class="flex items-center gap-2.5 cursor-pointer"
      >
        <input
          type="checkbox"
          class="accent-action w-3.5 h-3.5 cursor-pointer"
          :checked="editor.activeGlobalVariants.has(v.type)"
          @change="editor.toggleGlobalVariant(v.type)"
        >
        <span class="text-sm text-ink-text">{{ v.label }}</span>
      </label>
    </div>

    <template v-if="editor.activeTool === 'anti_kropki'">
      <CustomConstraintList
        title="Custom differences"
        :model-value="customDiffInput"
        :min="1"
        :items="customDiffs"
        @update:model-value="customDiffInput = $event"
        @add="addCustomDiff"
        @remove="editor.removeCustomGlobalConstraint($event)"
      />
      <CustomConstraintList
        title="Custom ratios"
        :model-value="customRatioInput"
        :min="2"
        :items="customRatios"
        @update:model-value="customRatioInput = $event"
        @add="addCustomRatio"
        @remove="editor.removeCustomGlobalConstraint($event)"
      />
    </template>

    <template v-if="editor.activeTool === 'anti_xv'">
      <CustomConstraintList
        title="Custom sums"
        :model-value="customSumInput"
        :min="1"
        :items="customSums"
        @update:model-value="customSumInput = $event"
        @add="addCustomSum"
        @remove="editor.removeCustomGlobalConstraint($event)"
      />
    </template>
  </div>
</template>
