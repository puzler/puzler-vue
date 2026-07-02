<script setup lang="ts">
import KropkiDotsLayer from './KropkiDotsLayer.vue'
import XvCluesLayer from './XvCluesLayer.vue'
import InequalityCluesLayer from './InequalityCluesLayer.vue'
import QuadruplesLayer from './QuadruplesLayer.vue'
</script>

<template>
  <!-- Cell connectors: difference/ratio dots on borders, XV clues and
       inequality signs on borders, quadruples on corners -->
  <g pointer-events="none">
    <KropkiDotsLayer />
    <XvCluesLayer />
    <InequalityCluesLayer />
    <QuadruplesLayer />
  </g>
</template>
