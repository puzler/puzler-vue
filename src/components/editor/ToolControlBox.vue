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
import XvPanel from './toolbox/XvPanel.vue'
import QuadruplesPanel from './toolbox/QuadruplesPanel.vue'
import ArrowPanel from './toolbox/ArrowPanel.vue'
import ThermoPanel from './toolbox/ThermoPanel.vue'
import KropkiDotsPanel from './toolbox/KropkiDotsPanel.vue'
import KillerCagePanel from './toolbox/KillerCagePanel.vue'
import ExtraRegionsPanel from './toolbox/ExtraRegionsPanel.vue'
import ClonePanel from './toolbox/ClonePanel.vue'
import SingleCellPanel from './toolbox/SingleCellPanel.vue'
import OuterCluePanel from './toolbox/OuterCluePanel.vue'
import { GLOBAL_VARIANTS, CONSTRAINT_LINE_TYPES, CONNECTOR_DOT_TYPES, OUTER_CLUE_TYPES } from '@/types/constraints'

const editor = useEditorStore()

const GLOBAL_CONSTRAINT_TYPES = new Set(Object.keys(GLOBAL_VARIANTS))
const SINGLE_CELL_TYPES = new Set(['odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells'])

const isGlobalTool = computed(() => GLOBAL_CONSTRAINT_TYPES.has(editor.activeTool))

const isLineTool = computed(() => CONSTRAINT_LINE_TYPES.has(editor.activeTool))

const isKropkiTool = computed(() => CONNECTOR_DOT_TYPES.has(editor.activeTool))

const isSingleCellTool = computed(() => SINGLE_CELL_TYPES.has(editor.activeTool))

const isOuterClueTool = computed(() => OUTER_CLUE_TYPES.has(editor.activeTool))
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
    <XvPanel v-else-if="editor.activeTool === 'xv'" />
    <QuadruplesPanel v-else-if="editor.activeTool === 'quadruples'" />
    <ArrowPanel v-else-if="editor.activeTool === 'arrow'" />
    <ThermoPanel v-else-if="editor.activeTool === 'thermometer'" />
    <KropkiDotsPanel v-else-if="isKropkiTool" />
    <KillerCagePanel v-else-if="editor.activeTool === 'killer_cage'" />
    <ExtraRegionsPanel v-else-if="editor.activeTool === 'extra_regions'" />
    <ClonePanel v-else-if="editor.activeTool === 'clone'" />
    <SingleCellPanel v-else-if="isSingleCellTool" />
    <OuterCluePanel v-else-if="isOuterClueTool" />
    <LineToolPanel v-else-if="isLineTool" />
  </div>
</template>
