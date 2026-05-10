<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import CosmeticLineComp from '@/components/cosmetics/CosmeticLine.vue'
import CosmeticShape from '@/components/cosmetics/CosmeticShape.vue'
import CosmeticText from '@/components/cosmetics/CosmeticText.vue'
import { cellsToPath } from '@/utils/linePath'
import { DEFAULT_LINE_STYLE, DEFAULT_SHAPE_STYLE, DEFAULT_TEXT_STYLE } from '@/types/constraints'
import type { CosmeticLineData, LineStyle, ShapeData, TextData } from '@/types/constraints'

const editor = useEditorStore()

// ── Lines ────────────────────────────────────────────────────────────────────

interface ResolvedLine { id: string; cells: string[]; style: LineStyle }

const lineInstances = computed<ResolvedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'cosmetic_line')
    .map(i => {
      const data = i.data as CosmeticLineData
      const style = editor.linePresets.find(p => p.id === data.presetId)?.style ?? DEFAULT_LINE_STYLE
      return { id: i.id, cells: data.cells, style }
    }),
)

const pendingPath = computed(() => cellsToPath(editor.pendingLineCells))
const activeLineStyle = computed(() => editor.activeLinePreset?.style ?? DEFAULT_LINE_STYLE)

// ── Shapes ───────────────────────────────────────────────────────────────────

const shapeInstances = computed(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'shape')
    .map(i => {
      const d = i.data as ShapeData
      const style = editor.shapePresets.find(p => p.id === d.presetId)?.style ?? DEFAULT_SHAPE_STYLE
      return { id: i.id, cell: d.cell, anchor: d.anchor, style }
    }),
)

// ── Text ─────────────────────────────────────────────────────────────────────

const textInstances = computed(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'text')
    .map(i => {
      const d = i.data as TextData
      const preset = editor.textPresets.find(p => p.id === d.presetId)
      return {
        id: i.id,
        cell: d.cell,
        text: preset?.content ?? '?',
        style: preset?.style ?? DEFAULT_TEXT_STYLE,
      }
    }),
)
</script>

<template>
  <g>
    <!-- Lines -->
    <CosmeticLineComp
      v-for="inst in lineInstances"
      :key="inst.id"
      :cells="inst.cells"
      :line-style="inst.style"
    />
    <path
      v-if="pendingPath"
      :d="pendingPath"
      :stroke="activeLineStyle.color"
      :stroke-width="activeLineStyle.strokeWidth"
      :opacity="activeLineStyle.opacity * 0.55"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      pointer-events="none"
    />

    <!-- Shapes -->
    <CosmeticShape
      v-for="inst in shapeInstances"
      :key="inst.id"
      :cell="inst.cell"
      :anchor="inst.anchor"
      :shape-style="inst.style"
    />

    <!-- Text -->
    <CosmeticText
      v-for="inst in textInstances"
      :key="inst.id"
      :cell="inst.cell"
      :text="inst.text"
      :text-style="inst.style"
    />
  </g>
</template>
