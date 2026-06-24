<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { parseRgb } from '@/utils/colorPalette'
import { constraintFamily, type ConstraintStyleKey, type ConstraintStyleOverride } from '@/utils/theme'
import { defaultConstraintFields, type ConstraintField } from '@/composables/useConstraintStyles'
import { FAMILY_FIELDS } from '@/utils/constraintFields'
import LineWidthControl from './LineWidthControl.vue'

// Vertical, labeled controls for one constraint's theme override (used in the theme-editor modal).
const props = defineProps<{ ckey: ConstraintStyleKey }>()
const theme = useThemeStore()

const fields = computed(() => FAMILY_FIELDS[constraintFamily(props.ckey)])
const defaults = computed(() => defaultConstraintFields(props.ckey))
const override = computed<ConstraintStyleOverride>(() => theme.activeTheme.constraints[props.ckey] ?? {})
const isOverridden = computed(() => Object.keys(override.value).length > 0)

function toHex(value: string): string {
  const c = parseRgb(value)
  if (!c) return '#000000'
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.red)}${h(c.green)}${h(c.blue)}`
}

const fieldVal = (f: ConstraintField) => override.value[f] ?? defaults.value[f]
const colorVal = (f: ConstraintField) => toHex(String(fieldVal(f) ?? '#000000'))
const numVal = (f: ConstraintField) => Number(fieldVal(f) ?? 0)

function set(f: ConstraintField, value: string | number) {
  theme.updateConstraintOverride(theme.activeThemeId, props.ckey, { [f]: value } as ConstraintStyleOverride)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="f in fields"
      :key="f.field"
      class="flex items-center gap-3 min-h-8"
    >
      <span class="text-sm text-soft w-20 shrink-0">{{ f.label }}</span>
      <template v-if="f.kind === 'color'">
        <input
          type="color"
          class="w-8 h-8 rounded border border-line bg-surface cursor-pointer shrink-0"
          :value="colorVal(f.field)"
          :aria-label="f.label"
          @change="set(f.field, ($event.target as HTMLInputElement).value)"
        >
        <span class="font-mono text-xs text-faint uppercase">{{ colorVal(f.field) }}</span>
      </template>
      <LineWidthControl
        v-else-if="f.field === 'strokeWidth'"
        class="flex-1"
        :value="numVal(f.field)"
        @update="set(f.field, $event)"
      />
      <template v-else>
        <input
          type="range"
          :min="f.min"
          :max="f.max"
          :step="f.step"
          class="flex-1 accent-action"
          :value="numVal(f.field)"
          :aria-label="f.label"
          @change="set(f.field, Number(($event.target as HTMLInputElement).value))"
        >
        <span class="font-mono text-xs text-soft w-9 text-right tabular-nums">
          {{ f.field === 'opacity' ? Math.round(numVal(f.field) * 100) + '%' : numVal(f.field).toFixed(2) }}
        </span>
      </template>
    </div>
    <button
      v-if="isOverridden"
      type="button"
      class="self-start text-xs text-faint hover:text-action transition-colors"
      @click="theme.resetConstraintToDefault(theme.activeThemeId, ckey)"
    >
      Reset to default
    </button>
  </div>
</template>
