<script setup lang="ts">
import KropkiDotsLayer from './KropkiDotsLayer.vue'
import XvCluesLayer from './XvCluesLayer.vue'
import QuadruplesLayer from './QuadruplesLayer.vue'
</script>

<template>
  <!-- Cell connectors: difference/ratio dots on borders, XV clues on
       borders, quadruples on corners -->
  <g pointer-events="none">
    <KropkiDotsLayer />
    <XvCluesLayer />
    <QuadruplesLayer />
  </g>
</template>
