<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'

const props = defineProps<{
  row: number
  col: number
  // Legacy single cosmetic color (author-set).
  color?: string | null
  // Resolved player colors (rgba). One = full fill; several = pie-slice wedges.
  fills?: string[]
}>()

const x = computed(() => PADDING + props.col * CELL_SIZE)
const y = computed(() => PADDING + props.row * CELL_SIZE)

// Multi-color cells are drawn as equal pie wedges radiating from the cell
// center to its perimeter — ported 1:1 from the old Puzler's CellBackgroundColor
// (the `0.75 * CELL_SIZE` offset just sets the starting angle). Parameterized on
// CELL_SIZE so it scales to our grid coordinates.
const wedges = computed<string[]>(() => {
  const fills = props.fills ?? []
  if (fills.length < 2) return []
  const x0 = x.value
  const y0 = y.value
  const s = CELL_SIZE
  const cx = x0 + s / 2
  const cy = y0 + s / 2
  const lineTo = (raw: number): string => {
    const val = (raw + 0.75 * s) % (4 * s)
    if (val <= s) return `L${x0 + val} ${y0}`
    if (val <= 2 * s) return `L${x0 + s} ${y0 + (val - s)}`
    if (val <= 3 * s) return `L${x0 + s - (val - 2 * s)} ${y0 + s}`
    return `L${x0} ${y0 + s - (val - 3 * s)}`
  }
  const portion = (4 * s) / fills.length
  return fills.map((_, i) => {
    const start = i * portion
    const end = start + portion
    const data = [`M${cx} ${cy}`]
    let point = start
    while (point < end) {
      data.push(lineTo(point))
      point += s - ((point + 0.75 * s) % s)
    }
    data.push(lineTo(end), 'Z')
    return data.join(' ')
  })
})
</script>

<template>
  <!-- Single player color: simple full-cell fill -->
  <rect
    v-if="fills && fills.length === 1"
    :x="x"
    :y="y"
    :width="CELL_SIZE"
    :height="CELL_SIZE"
    :fill="fills[0]"
  />
  <!-- Multiple player colors: pie-slice wedges -->
  <template v-else-if="wedges.length">
    <path
      v-for="(d, i) in wedges"
      :key="i"
      :d="d"
      :fill="(fills as string[])[i]"
      stroke="none"
    />
  </template>
  <!-- Legacy cosmetic color fallback -->
  <rect
    v-else-if="color"
    :x="x"
    :y="y"
    :width="CELL_SIZE"
    :height="CELL_SIZE"
    :fill="color"
  />
</template>
