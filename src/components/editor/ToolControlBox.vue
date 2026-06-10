<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import DigitPanel from './toolbox/DigitPanel.vue'
import GlobalConstraintPanel from './toolbox/GlobalConstraintPanel.vue'
import CosmeticLinePanel from './toolbox/CosmeticLinePanel.vue'
import CellColorPanel from './toolbox/CellColorPanel.vue'
import ShapePanel from './toolbox/ShapePanel.vue'
import RegionPanel from './toolbox/RegionPanel.vue'
import TextPanel from './toolbox/TextPanel.vue'
import LineToolPanel from './toolbox/LineToolPanel.vue'
import { GLOBAL_VARIANTS, CONSTRAINT_LINE_TYPES } from '@/types/constraints'

const editor = useEditorStore()

const GLOBAL_CONSTRAINT_TYPES = new Set(Object.keys(GLOBAL_VARIANTS))

const isGlobalTool = computed(() => GLOBAL_CONSTRAINT_TYPES.has(editor.activeTool))

const isLineTool = computed(() =>
  CONSTRAINT_LINE_TYPES.has(editor.activeTool) || editor.activeTool === 'thermometer',
)
</script>

<template>
  <div class="flex flex-col bg-paper overflow-y-auto h-full">
    <DigitPanel v-if="editor.activeTool === 'digit'" />
    <GlobalConstraintPanel v-else-if="isGlobalTool" />
    <CosmeticLinePanel v-else-if="editor.activeTool === 'cosmetic_line'" />
    <CellColorPanel v-else-if="editor.activeTool === 'cell_color'" />
    <ShapePanel v-else-if="editor.activeTool === 'shape'" />
    <RegionPanel v-else-if="editor.activeTool === 'region'" />
    <TextPanel v-else-if="editor.activeTool === 'text'" />
    <LineToolPanel v-else-if="isLineTool" />
  </div>
</template>
