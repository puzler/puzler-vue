<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { ArrowData } from '@/types/constraints'
import ModeSwitcher from './ModeSwitcher.vue'
import FogSolverHelpersSection from './FogSolverHelpersSection.vue'

// Arrows and average arrows share this panel — only the heading and the bulb
// hint differ (average-arrow bulbs are always a single cell), and the fog
// solver helpers apply to plain arrows only.
withDefaults(defineProps<{ title?: string }>(), { title: 'Arrows' })

const editor = useEditorStore()

const isAverage = computed(() => editor.activeTool === 'average_arrow')

const MODES = [
  { key: 'bulb', label: 'Bulb' },
  { key: 'arrow', label: 'Arrow' },
]

// Conflict hints: a declared fact the drawn arrows contradict would let the
// fog solver deduce wrongly.
const arrowInstances = computed(() =>
  editor.cosmeticInstances.filter((i) => i.type === 'arrow').map((i) => i.data as ArrowData),
)
const hasMultiCellBulb = computed(() => arrowInstances.value.some((a) => (a.bulbCells?.length ?? 0) > 1))
const hasMultiArrowBulb = computed(() => arrowInstances.value.some((a) => (a.arrows?.length ?? 0) > 1))

const HELPER_OPTIONS = computed(() => [
  {
    key: 'arrowSingleCellBulbs' as const,
    label: 'Enforce single-cell bulbs',
    warning: hasMultiCellBulb.value ? 'An arrow has a multi-cell bulb, contradicting this declaration.' : null,
  },
  {
    key: 'arrowNoCrossings' as const,
    label: 'Enforce no crossing or overlapping arrows',
    warning: null,
  },
  {
    key: 'arrowOneArrowPerBulb' as const,
    label: 'Enforce one arrow per bulb',
    warning: hasMultiArrowBulb.value ? 'A bulb has multiple arrows, contradicting this declaration.' : null,
  },
])
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ title }}
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveArrowDrawMode"
        @select="editor.setArrowDrawMode($event as 'bulb' | 'arrow')"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        {{ isAverage
          ? 'Bulb: click to place a bulb · tap a bulb or arrow to remove it'
          : 'Bulb: click or drag to place a bulb · tap a bulb or arrow to remove it' }}
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Arrow: drag from a bulb or arrow to draw · drag from an arrow's tip to extend it · holding Shift switches to Arrow
      </p>

      <FogSolverHelpersSection
        v-if="!isAverage"
        :options="HELPER_OPTIONS"
      />
    </div>
  </div>
</template>
