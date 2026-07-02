<script setup lang="ts">
import { constraintLayersForSlot } from '@/constraints/layerComponents'

// The 'constraint' slot of the grid stack, derived from the UI constraint registry:
// each entry is a layer component rendering one or more constraint types, in registry
// order (e.g. thermometers before constraint lines so lines overlap bulbs).
const layers = constraintLayersForSlot('constraint')
</script>

<template>
  <g>
    <component
      :is="layer.component"
      v-for="layer in layers"
      :key="layer.id"
    />
  </g>
</template>
