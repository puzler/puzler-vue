<script setup lang="ts">
// A small, store-DECOUPLED preview of a given theme. Styles sample geometry through the PURE
// resolver functions (enabled=true, so it always shows the theme as if custom styles are on) and
// the theme's grid/chrome tokens. Used both for the theme picker cards (focus='overview') and the
// theme-editor's right-hand preview (focus = 'chrome' | 'grid' | a constraint key).
import { computed } from 'vue'
import { type Theme, type ConstraintStyleKey, constraintFamily } from '@/utils/theme'
import { resolveEffectiveTheme } from '@/utils/themePresets'
import { GRID_DEFAULTS, CHROME_DEFAULTS } from '@/utils/appearanceTokens'
import {
  resolveLineStyle, resolveShapeStyle, resolveTextStyle, resolveCellBgColor,
  resolveCageStyle, resolveBetweenLineStyle, resolveMinMaxStyle,
  resolveThermoStyle, resolveArrowStyle,
  type LineKey, type ShapeKey, type TextKey, type CellBgKey, type MinMaxKey,
} from '@/composables/useConstraintStyles'
import { cellCenter, cellsToPath } from '@/utils/linePath'
import { CELL_SIZE, PADDING, cellRect } from '@/composables/useGrid'
import { borderMidpoint } from '@/components/grid/constraints/connectorLayerShared'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'
import { borderKey } from '@/types/constraints'

const props = defineProps<{ theme: Theme; focus: 'overview' | 'chrome' | 'grid' | ConstraintStyleKey }>()

const COLS = 3
const ROWS = 2
const VB_W = PADDING * 2 + COLS * CELL_SIZE
const VB_H = PADDING * 2 + ROWS * CELL_SIZE

// Preview the EFFECTIVE theme (base preset ⊕ the theme's own deltas) so a custom theme's preview
// matches what the grid renders, and un-overridden constraints show their base preset's value.
const eff = computed(() => resolveEffectiveTheme(props.theme))
const grid = (k: keyof typeof GRID_DEFAULTS) => eff.value.appearance.grid[k] ?? GRID_DEFAULTS[k]
const chrome = (k: keyof typeof CHROME_DEFAULTS) => eff.value.appearance.chrome[k] ?? CHROME_DEFAULTS[k]
const ov = (k: ConstraintStyleKey) => eff.value.constraints[k]

interface PathPrim { kind: 'path'; d: string; stroke?: string; strokeWidth?: number; fill?: string; opacity?: number; dash?: string }
interface CirclePrim { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
interface RectPrim { kind: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
interface TextPrim { kind: 'text'; x: number; y: number; text: string; fill: string; size: number; weight?: number; anchor?: string; baseline?: string }
type Prim = PathPrim | CirclePrim | RectPrim | TextPrim

// Chevron path for a min/max mark on one side of a cell (compact port of MinMaxLayer).
function chevron(cx: number, cy: number, side: 'top' | 'bottom' | 'left' | 'right', isMin: boolean): string {
  const reach = CELL_SIZE * 0.44, depth = CELL_SIZE * 0.05, spread = CELL_SIZE * 0.125
  const mid = isMin ? reach - depth : reach
  const tip = isMin ? reach : reach - depth
  if (side === 'top') return `M ${cx - spread} ${cy - tip} L ${cx} ${cy - mid} L ${cx + spread} ${cy - tip}`
  if (side === 'bottom') return `M ${cx - spread} ${cy + tip} L ${cx} ${cy + mid} L ${cx + spread} ${cy + tip}`
  if (side === 'left') return `M ${cx - tip} ${cy - spread} L ${cx - mid} ${cy} L ${cx - tip} ${cy + spread}`
  return `M ${cx + tip} ${cy - spread} L ${cx + mid} ${cy} L ${cx + tip} ${cy + spread}`
}

function gridPrims(): Prim[] {
  const out: Prim[] = [{ kind: 'rect', x: 0, y: 0, w: VB_W, h: VB_H, fill: grid('grid-canvas') }]
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cr = cellRect(r, c)
    out.push({ kind: 'rect', x: cr.x, y: cr.y, w: CELL_SIZE, h: CELL_SIZE, fill: grid('grid-cell') })
  }
  for (let c = 1; c < COLS; c++) out.push({ kind: 'path', d: `M ${PADDING + c * CELL_SIZE} ${PADDING} L ${PADDING + c * CELL_SIZE} ${PADDING + ROWS * CELL_SIZE}`, stroke: grid('grid-line-thin'), strokeWidth: 1 })
  for (let r = 1; r < ROWS; r++) out.push({ kind: 'path', d: `M ${PADDING} ${PADDING + r * CELL_SIZE} L ${PADDING + COLS * CELL_SIZE} ${PADDING + r * CELL_SIZE}`, stroke: grid('grid-line-thin'), strokeWidth: 1 })
  out.push({ kind: 'rect', x: PADDING, y: PADDING, w: COLS * CELL_SIZE, h: ROWS * CELL_SIZE, fill: 'none', stroke: grid('grid-line-box'), strokeWidth: 2.5 })
  return out
}

function digitsAndSelection(): Prim[] {
  const a = cellCenter('r1c0'), b = cellCenter('r1c1'), s = cellRect(1, 2)
  return [
    { kind: 'text', x: a.x, y: a.y, text: '5', fill: grid('grid-digit-given'), size: CELL_SIZE * 0.6, weight: 700 },
    { kind: 'text', x: b.x, y: b.y, text: '3', fill: grid('grid-digit-input'), size: CELL_SIZE * 0.6 },
    { kind: 'rect', x: s.x + 4, y: s.y + 4, w: CELL_SIZE - 8, h: CELL_SIZE - 8, fill: 'none', stroke: grid('grid-selection'), strokeWidth: 4, opacity: 0.85 },
  ]
}

function linePreview(key: LineKey): Prim[] {
  const st = resolveLineStyle(key, ov(key), true)
  if (key.includes('diagonal')) {
    return [{ kind: 'path', d: `M ${PADDING} ${PADDING} L ${PADDING + COLS * CELL_SIZE} ${PADDING + ROWS * CELL_SIZE}`, stroke: st.color, strokeWidth: st.strokeWidth, opacity: st.opacity }]
  }
  return [{ kind: 'path', d: cellsToPath(['r0c0', 'r0c1', 'r0c2']), stroke: st.color, strokeWidth: st.strokeWidth, opacity: st.opacity }]
}

function constraintPrims(key: ConstraintStyleKey): Prim[] {
  const fam = constraintFamily(key)
  if (fam === 'line' || fam === 'diagonal') return linePreview(key as LineKey)
  if (fam === 'betweenLine') {
    const b = resolveBetweenLineStyle(ov(key), true)
    const s = cellCenter('r0c0'), e = cellCenter('r0c2')
    return [
      { kind: 'path', d: cellsToPath(['r0c0', 'r0c1', 'r0c2']), stroke: b.lineColor, strokeWidth: b.lineStrokeWidth },
      { kind: 'circle', cx: s.x, cy: s.y, r: b.circleRadius, fill: b.circleFill, stroke: b.circleStrokeColor, strokeWidth: b.circleStrokeWidth },
      { kind: 'circle', cx: e.x, cy: e.y, r: b.circleRadius, fill: b.circleFill, stroke: b.circleStrokeColor, strokeWidth: b.circleStrokeWidth },
    ]
  }
  if (fam === 'shape') {
    const s = resolveShapeStyle(key as ShapeKey, ov(key), true)
    if (key === 'even_cells') {
      const c = cellCenter('r0c1'), side = s.width * CELL_SIZE
      return [{ kind: 'rect', x: c.x - side / 2, y: c.y - side / 2, w: side, h: side, fill: s.fillColor }]
    }
    if (key === 'difference_dots' || key === 'ratio_dots') {
      const p = borderMidpoint(borderKey('r0c1', 'r0c2'))
      return [{ kind: 'circle', cx: p.x, cy: p.y, r: s.width * CELL_SIZE / 2, fill: s.fillColor, stroke: s.outlineColor, strokeWidth: 1.5 }]
    }
    if (key === 'quadruples') {
      const x = PADDING + 2 * CELL_SIZE, y = PADDING + CELL_SIZE, r = s.width * CELL_SIZE / 2
      return [
        { kind: 'circle', cx: x, cy: y, r, fill: s.fillColor, stroke: s.outlineColor, strokeWidth: 1.5 },
        { kind: 'text', x: x - r * 0.32, y: y - r * 0.34, text: '1', fill: s.textColor, size: r * 0.58, weight: 600 },
        { kind: 'text', x: x + r * 0.32, y: y - r * 0.34, text: '2', fill: s.textColor, size: r * 0.58, weight: 600 },
      ]
    }
    const c = cellCenter('r0c1') // odd_cells (circle)
    return [{ kind: 'circle', cx: c.x, cy: c.y, r: s.width * CELL_SIZE / 2, fill: s.fillColor }]
  }
  if (fam === 'text') {
    const t = resolveTextStyle(key as TextKey, ov(key), true)
    if (key === 'xv') {
      const p = borderMidpoint(borderKey('r0c1', 'r0c2'))
      return [{ kind: 'rect', x: p.x - t.size * CELL_SIZE * 0.4, y: p.y - 2, w: t.size * CELL_SIZE * 0.8, h: 4, fill: grid('grid-cell') }, { kind: 'text', x: p.x, y: p.y, text: 'X', fill: t.fontColor, size: t.size * CELL_SIZE, weight: 600 }]
    }
    const c = cellCenter('r0c0')
    return [{ kind: 'text', x: c.x, y: c.y, text: '5', fill: t.fontColor, size: t.size * CELL_SIZE, weight: 500 }]
  }
  if (fam === 'cellBg') {
    const cr = cellRect(0, 1)
    return [{ kind: 'rect', x: cr.x, y: cr.y, w: CELL_SIZE, h: CELL_SIZE, fill: resolveCellBgColor(key as CellBgKey, ov(key), true) }]
  }
  if (fam === 'cage') {
    const cg = resolveCageStyle(ov(key), true)
    const paths = computeInsetOutlinePaths(new Set(['r0c0', 'r0c1']), { edgeInset: () => 3.5, cornerRadius: 2 })
    const cr = cellRect(0, 0)
    return [
      ...paths.map((d): Prim => ({ kind: 'path', d, stroke: cg.color, strokeWidth: 1.25, fill: 'none', dash: '5 3' })),
      { kind: 'text', x: cr.x + 5, y: cr.y + 5, text: '10', fill: cg.textColor, size: 13, weight: 600, anchor: 'start', baseline: 'hanging' },
    ]
  }
  if (fam === 'thermo') {
    const t = resolveThermoStyle(ov(key), true)
    const bulb = cellCenter('r0c0')
    // Slow thermos render hollow (outline only) on the grid; mirror that here.
    if (key === 'slow_thermometer') {
      return [
        { kind: 'path', d: cellsToPath(['r0c0', 'r0c1', 'r0c2']), stroke: t.color, strokeWidth: 3, fill: 'none' },
        { kind: 'circle', cx: bulb.x, cy: bulb.y, r: t.bulbRadius, fill: 'none', stroke: t.color, strokeWidth: 3 },
      ]
    }
    return [
      { kind: 'path', d: cellsToPath(['r0c0', 'r0c1', 'r0c2']), stroke: t.color, strokeWidth: t.strokeWidth },
      { kind: 'circle', cx: bulb.x, cy: bulb.y, r: t.bulbRadius, fill: t.color },
    ]
  }
  if (fam === 'arrow') {
    const a = resolveArrowStyle(ov(key), true)
    const bulb = cellCenter('r0c0')
    const tip = cellCenter('r0c2')
    const wing = a.headLength * a.headSpread
    const head = `M ${tip.x - a.headLength} ${tip.y - wing} L ${tip.x} ${tip.y} L ${tip.x - a.headLength} ${tip.y + wing}`
    return [
      { kind: 'path', d: cellsToPath(['r0c0', 'r0c1', 'r0c2']), stroke: a.color, strokeWidth: a.lineWidth },
      { kind: 'path', d: head, stroke: a.color, strokeWidth: a.lineWidth },
      { kind: 'circle', cx: bulb.x, cy: bulb.y, r: a.bulbRadius, fill: grid('grid-cell'), stroke: a.color, strokeWidth: a.outlineWidth },
    ]
  }
  // minmax
  const mm = resolveMinMaxStyle(key as MinMaxKey, ov(key), true)
  const cr = cellRect(0, 1), c = cellCenter('r0c1'), isMin = key === 'minimums'
  const out: Prim[] = [{ kind: 'rect', x: cr.x, y: cr.y, w: CELL_SIZE, h: CELL_SIZE, fill: mm.backgroundColor }]
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const d = chevron(c.x, c.y, side, isMin)
    out.push({ kind: 'path', d, stroke: mm.halo, strokeWidth: 6 })
    out.push({ kind: 'path', d, stroke: mm.chevronColor, strokeWidth: 4 })
  }
  return out
}

const prims = computed<Prim[]>(() => {
  if (props.focus === 'chrome') return []
  const out = gridPrims()
  if (props.focus === 'overview') out.push(...linePreview('german_whispers'), ...digitsAndSelection())
  else if (props.focus === 'grid') out.push(...digitsAndSelection())
  else out.push(...constraintPrims(props.focus))
  return out
})
</script>

<template>
  <div
    v-if="focus === 'chrome'"
    class="rounded-lg overflow-hidden border border-line text-[8px] leading-tight"
    :style="{ background: chrome('paper') }"
  >
    <div
      class="px-2 py-1.5 flex items-center justify-between"
      :style="{ background: chrome('ink'), color: chrome('ink-text') }"
    >
      <span :style="{ color: '#fff', opacity: 0.9 }">Puzler</span>
      <span :style="{ color: chrome('spark') }">●</span>
    </div>
    <div class="p-2 flex flex-col gap-1.5">
      <div
        class="rounded p-1.5"
        :style="{ background: chrome('surface'), border: `1px solid ${chrome('line')}`, color: chrome('ink-text') }"
      >
        <span>Sample card</span>
        <div :style="{ color: chrome('soft') }">
          secondary text
        </div>
      </div>
      <span
        class="rounded px-2 py-1 self-start text-white"
        :style="{ background: chrome('action') }"
      >Button</span>
    </div>
  </div>

  <svg
    v-else
    :viewBox="`0 0 ${VB_W} ${VB_H}`"
    class="w-full h-auto rounded-lg border border-line"
    role="img"
    aria-label="Theme preview"
  >
    <template
      v-for="(p, i) in prims"
      :key="i"
    >
      <path
        v-if="p.kind === 'path'"
        :d="p.d"
        :fill="p.fill ?? 'none'"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :stroke-opacity="p.opacity"
        :stroke-dasharray="p.dash"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-else-if="p.kind === 'circle'"
        :cx="p.cx"
        :cy="p.cy"
        :r="p.r"
        :fill="p.fill ?? 'none'"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
      />
      <rect
        v-else-if="p.kind === 'rect'"
        :x="p.x"
        :y="p.y"
        :width="p.w"
        :height="p.h"
        :fill="p.fill"
        :stroke="p.stroke"
        :stroke-width="p.strokeWidth"
        :opacity="p.opacity"
      />
      <text
        v-else
        :x="p.x"
        :y="p.y"
        :fill="p.fill"
        :font-size="p.size"
        :font-weight="p.weight ?? 400"
        :text-anchor="p.anchor ?? 'middle'"
        :dominant-baseline="p.baseline ?? 'central'"
        font-family="'Space Grotesk', sans-serif"
      >{{ p.text }}</text>
    </template>
  </svg>
</template>
