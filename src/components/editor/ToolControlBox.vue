<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import DigitPanel from './toolbox/DigitPanel.vue'
import RegionPanel from './toolbox/RegionPanel.vue'
import { panelForTool } from '@/constraints/registry'
import { PANEL_COMPONENTS } from '@/constraints/panelComponents'

// Constraint panels dispatch through the UI constraint registry: the active tool's
// def names its panel (+ per-type props, e.g. the slow thermometer's copy). Only the
// digit and region tools are not constraints, so they stay explicit.

const editor = useEditorStore()

const constraintPanel = computed(() => {
  const panel = panelForTool(editor.activeTool)
  return panel ? { component: PANEL_COMPONENTS[panel.id], props: panel.props } : null
})
</script>

<template>
  <div class="flex flex-col bg-paper overflow-y-auto h-full">
    <DigitPanel v-if="editor.activeTool === 'digit'" />
    <RegionPanel v-else-if="editor.activeTool === 'region'" />
    <component
      :is="constraintPanel.component"
      v-else-if="constraintPanel"
      v-bind="constraintPanel.props"
    />
  </div>
</template>
