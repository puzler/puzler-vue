// Editor field specs per constraint family: which fields the per-constraint editor exposes and
// how to render each (color swatch vs numeric slider). Drives ConstraintStyleRow.vue.

import type { ConstraintStyleFamily } from '@/utils/theme'
import type { ConstraintField } from '@/composables/useConstraintStyles'

export interface FieldSpec {
  field: ConstraintField
  label: string
  kind: 'color' | 'number'
  min?: number
  max?: number
  step?: number
}

const WIDTH = { kind: 'number', min: 1, max: 24, step: 1 } as const
const OPACITY = { kind: 'number', min: 0, max: 1, step: 0.05 } as const
const SIZE = { kind: 'number', min: 0.1, max: 0.95, step: 0.05 } as const

export const FAMILY_FIELDS: Record<ConstraintStyleFamily, FieldSpec[]> = {
  line: [
    { field: 'color', label: 'Color', kind: 'color' },
    { field: 'strokeWidth', label: 'Width', ...WIDTH },
    { field: 'opacity', label: 'Opacity', ...OPACITY },
  ],
  diagonal: [
    { field: 'color', label: 'Color', kind: 'color' },
  ],
  shape: [
    { field: 'fillColor', label: 'Fill', kind: 'color' },
    { field: 'outlineColor', label: 'Outline', kind: 'color' },
    { field: 'textColor', label: 'Text', kind: 'color' },
    { field: 'size', label: 'Size', ...SIZE },
  ],
  text: [
    { field: 'fontColor', label: 'Color', kind: 'color' },
    { field: 'fontSize', label: 'Size', ...SIZE },
  ],
  cellBg: [
    { field: 'backgroundColor', label: 'Fill', kind: 'color' },
  ],
  cage: [
    { field: 'color', label: 'Outline', kind: 'color' },
    { field: 'textColor', label: 'Sum', kind: 'color' },
  ],
  minmax: [
    { field: 'backgroundColor', label: 'Fill', kind: 'color' },
    { field: 'outlineColor', label: 'Chevron', kind: 'color' },
  ],
  betweenLine: [
    { field: 'color', label: 'Line', kind: 'color' },
    { field: 'fillColor', label: 'Bulb', kind: 'color' },
    { field: 'outlineColor', label: 'Edge', kind: 'color' },
    { field: 'strokeWidth', label: 'Width', ...WIDTH },
  ],
}
