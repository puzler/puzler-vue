<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import type { FogSolverHelpers } from '@/types/constraints'

// Setter-declared rules-text facts the fog solver may exploit (see
// FogSolverHelpers). Rendered at the bottom of a constraint tool panel, only
// while fog is active. A `warning` shows when the declared fact conflicts with
// the drawn geometry — the declaration is trusted, so a lie can mislead the
// solver.
const props = defineProps<{
  options: Array<{ key: keyof FogSolverHelpers; label: string; warning?: string | null }>
}>()

const editor = useEditorStore()
</script>

<template>
  <div
    v-if="editor.fogEnabled"
    class="flex flex-col gap-2 border-t border-line pt-3"
  >
    <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
      Fog solver helpers
    </p>
    <label
      v-for="opt in props.options"
      :key="opt.key"
      class="flex items-start gap-2.5 cursor-pointer"
    >
      <input
        type="checkbox"
        class="accent-action w-3.5 h-3.5 mt-0.5 cursor-pointer"
        :checked="editor.fogSolverHelpers[opt.key] === true"
        @change="editor.toggleFogSolverHelper(opt.key)"
      >
      <span class="text-[11px] text-ink-text leading-snug">{{ opt.label }}</span>
    </label>
    <template
      v-for="opt in props.options"
      :key="`warn-${opt.key}`"
    >
      <p
        v-if="opt.warning && editor.fogSolverHelpers[opt.key]"
        class="text-[11px] text-amber-700 leading-snug"
      >
        {{ opt.warning }}
      </p>
    </template>
  </div>
</template>
